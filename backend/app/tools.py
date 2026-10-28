"""Agent tools. Gemini reads each function's name, type hints and docstring, decides by itself
when to call one, and we run it. The docstring is therefore part of the 'prompt' - keep it clear."""
import ast
import math
import operator
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx

# ---------- Tool 1: safe calculator ----------
_OPS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
    ast.Div: operator.truediv, ast.Pow: operator.pow, ast.Mod: operator.mod,
    ast.FloorDiv: operator.floordiv, ast.USub: operator.neg, ast.UAdd: operator.pos,
}
_FUNCS = {
    "sqrt": math.sqrt, "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "log": math.log, "log10": math.log10, "abs": abs, "round": round,
}
_CONSTS = {"pi": math.pi, "e": math.e}


def _eval(node):
    """Walk the parsed expression and allow ONLY numbers, + - * / ** % //, and a few math functions.
    We never use eval(), so the model (or a user) cannot run arbitrary code."""
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        left, right = _eval(node.left), _eval(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > 100:
            raise ValueError("exponent too large")
        return _OPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval(node.operand))
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in _FUNCS and not node.keywords:
        return _FUNCS[node.func.id](*[_eval(a) for a in node.args])
    if isinstance(node, ast.Name) and node.id in _CONSTS:
        return _CONSTS[node.id]
    raise ValueError("unsupported expression")


def calculator(expression: str) -> str:
    """Evaluate a mathematical expression exactly and return the result.
    Supports + - * / ** % //, parentheses, sqrt, sin, cos, tan, log, log10, abs, round, pi and e.
    Example: '(18/100) * 2450' or 'sqrt(144) + 3**2'. Always use this for arithmetic instead of guessing."""
    if len(expression) > 200:
        return "Error: expression is too long."
    try:
        result = _eval(ast.parse(expression.strip(), mode="eval").body)
        return str(round(result, 10) if isinstance(result, float) else result)
    except ZeroDivisionError:
        return "Error: division by zero."
    except Exception as exc:  # return the error as text so the model can explain it
        return f"Error: could not evaluate ({exc})."


# ---------- Tool 2: current date and time ----------
def get_current_datetime(timezone_name: str = "Asia/Kolkata") -> str:
    """Get the current date and time in a given IANA timezone, e.g. 'Asia/Kolkata', 'America/New_York',
    'Europe/London', 'Asia/Tokyo'. Use this whenever the user asks about today's date or the time."""
    try:
        tz = ZoneInfo(timezone_name)
    except Exception:
        return f"Error: unknown timezone '{timezone_name}'. Use an IANA name such as 'Asia/Kolkata'."
    return datetime.now(tz).strftime("%A, %d %B %Y, %I:%M %p") + f" ({timezone_name})"


# ---------- Tool 3: Wikipedia lookup (free, no API key) ----------
WIKI_API = "https://en.wikipedia.org/w/api.php"


def wikipedia_search(query: str) -> str:
    """Look up factual background information about a person, place, event or concept on Wikipedia.
    Pass a short search phrase such as 'Alan Turing' or 'photosynthesis'. Returns article introductions."""
    query = (query or "").strip()
    if not query:
        return "Error: empty query."
    params = {
        "action": "query", "format": "json", "generator": "search", "gsrsearch": query,
        "gsrlimit": 2, "prop": "extracts", "exintro": 1, "explaintext": 1,
        "exsentences": 6, "redirects": 1,
    }
    try:
        resp = httpx.get(
            WIKI_API, params=params, timeout=10,
            headers={"User-Agent": "CollegeAIAgent/1.0 (student project)"},
        )
        resp.raise_for_status()
        pages = resp.json().get("query", {}).get("pages", {})
    except (httpx.HTTPError, ValueError) as exc:
        return f"Error: Wikipedia lookup failed ({exc.__class__.__name__})."
    if not pages:
        return "No Wikipedia article found for that query."
    parts = []
    for page in sorted(pages.values(), key=lambda p: p.get("index", 99))[:2]:
        extract = (page.get("extract") or "").strip()
        if extract:
            parts.append(f"{page.get('title')}: {extract[:1200]}")
    return "\n\n".join(parts) or "No summary available for that query."


TOOLS = [calculator, get_current_datetime, wikipedia_search]
