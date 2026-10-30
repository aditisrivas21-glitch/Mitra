"""Central place for all settings. Secrets come from environment variables (.env), never from code."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


# ---------- Gemini Configuration ----------

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.1-flash-lite"
).strip()


# ---------- CORS Configuration ----------

DEFAULT_FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://mitra-ai-study-companion.netlify.app",
]

FRONTEND_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        ",".join(DEFAULT_FRONTEND_ORIGINS)
    ).split(",")
    if origin.strip()
]


# ---------- Database Configuration ----------

DB_PATH = Path(
    os.getenv(
        "DB_PATH",
        str(BASE_DIR / "data" / "app.db")
    )
)


# ---------- Document Configuration ----------

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "5"))

MAX_DOCS_PER_CONVERSATION = 5

MAX_HISTORY_MESSAGES = 20

MAX_MESSAGE_CHARS = 4000