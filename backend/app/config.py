"""Central place for all settings. Secrets come from environment variables (.env), never from code."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
# Model names change over time. If you get a "model not found" error, update this in .env.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite").strip()

# Origins allowed to call the API from a browser (CORS).
FRONTEND_ORIGINS = [
    o.strip()
    for o in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

DB_PATH = Path(os.getenv("DB_PATH", str(BASE_DIR / "data" / "app.db")))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "5"))
MAX_DOCS_PER_CONVERSATION = 5
MAX_HISTORY_MESSAGES = 20   # how many past messages are sent to the AI (context window)
MAX_MESSAGE_CHARS = 4000
