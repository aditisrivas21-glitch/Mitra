"""Document handling: text extraction, chunking and keyword retrieval (a simple form of RAG).

RAG = Retrieval-Augmented Generation: instead of sending a whole document to the AI, we find the
few chunks most relevant to the question and send only those. It is cheaper and more accurate.
"""
import io
import math
import re
from collections import Counter

from pypdf import PdfReader

MAX_TEXT_CHARS = 500_000
SMALL_DOC_LIMIT = 8_000  # if all documents together are this small, send everything

STOPWORDS = set(
    "a an and are as at be but by for from has have how i in is it its of on or that the their "
    "this to was were what when where which who why will with you your do does did can could "
    "about into than then there these those they them we our not no yes if so".split()
)


# ---------- extraction ----------
def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_text(filename: str, data: bytes) -> str:
    """Return clean text from a .txt or .pdf file. Raises ValueError with a user-friendly message."""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext == "txt":
        if b"\x00" in data[:2048]:
            raise ValueError("This does not look like a text file.")
        try:
            text = data.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = data.decode("latin-1")
    elif ext == "pdf":
        if not data.startswith(b"%PDF"):
            raise ValueError("This file is not a valid PDF.")
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ValueError("Password-protected PDFs are not supported.")
        text = "\n\n".join((page.extract_text() or "") for page in reader.pages)
    else:
        raise ValueError("Only .pdf and .txt files are supported.")

    text = clean_text(text)
    if len(text) < 20:
        raise ValueError("No readable text found. Scanned/image-only PDFs are not supported.")
    if len(text) > MAX_TEXT_CHARS:
        raise ValueError("Document is too large (limit is about 500,000 characters).")
    return text


# ---------- chunking ----------
def chunk_text(text: str, size: int = 1000, overlap: int = 150) -> list[str]:
    """Split text into overlapping pieces so answers that cross a boundary are not lost."""
    chunks, start, n = [], 0, len(text)
    while start < n:
        end = min(start + size, n)
        if end < n:  # try to end on a space instead of in the middle of a word
            cut = text.rfind(" ", start + size // 2, end)
            if cut != -1:
                end = cut
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= n:
            break
        start = max(end - overlap, start + 1)
    return chunks


# ---------- retrieval ----------
def tokenize(text: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 1 and w not in STOPWORDS]


def retrieve(question: str, chunks: list[dict], top_k: int = 5) -> list[dict]:
    """Rank chunks with a TF-IDF style score and return the best `top_k` in reading order."""
    if not chunks:
        return []
    q_terms = set(tokenize(question))
    counts = [Counter(tokenize(c["content"])) for c in chunks]
    n = len(chunks)
    doc_freq = {t: sum(1 for c in counts if t in c) for t in q_terms}

    scored = []
    for i, tf in enumerate(counts):
        score = 0.0
        for term in q_terms:
            if tf[term]:
                idf = math.log(1 + n / doc_freq[term])   # rare words matter more
                score += (1 + math.log(tf[term])) * idf  # repeated words help, with diminishing returns
        scored.append((score, i))

    scored.sort(reverse=True)
    best = [i for score, i in scored[:top_k] if score > 0]
    if not best:  # generic question such as "what is this about?" -> use the beginning
        best = list(range(min(3, n)))
    return [chunks[i] for i in sorted(best)]


def build_context(question: str, chunks: list[dict]) -> str:
    """Text block that is added to the AI's instructions."""
    total = sum(len(c["content"]) for c in chunks)
    chosen = chunks if total <= SMALL_DOC_LIMIT else retrieve(question, chunks)
    return "\n\n".join(f"[Source: {c['filename']}, part {c['idx'] + 1}]\n{c['content']}" for c in chosen)
