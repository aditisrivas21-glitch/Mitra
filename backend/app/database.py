"""SQLite storage using Python's built-in sqlite3 module (no ORM, easy to read)."""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tools TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, id);
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    text TEXT NOT NULL,
    char_count INTEGER NOT NULL,
    chunk_count INTEGER NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    content TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def get_db():
    """Open a connection, commit on success, roll back on error, always close."""
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")  # needed for ON DELETE CASCADE
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        conn.executescript(SCHEMA)


# ---------- conversations ----------
def create_conversation(title: str = "New chat") -> dict:
    now = _now()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO conversations (title, created_at, updated_at) VALUES (?, ?, ?)",
            (title, now, now),
        )
        return {"id": cur.lastrowid, "title": title, "created_at": now, "updated_at": now}


def list_conversations() -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, title, created_at, updated_at FROM conversations "
            "ORDER BY updated_at DESC, id DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def get_conversation(conversation_id: int) -> dict | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?",
            (conversation_id,),
        ).fetchone()
        return dict(row) if row else None


def rename_conversation(conversation_id: int, title: str) -> None:
    with get_db() as conn:
        conn.execute("UPDATE conversations SET title = ? WHERE id = ?", (title, conversation_id))


def delete_conversation(conversation_id: int) -> None:
    with get_db() as conn:
        conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))


# ---------- messages ----------
def _message(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "role": row["role"],
        "content": row["content"],
        "tools": json.loads(row["tools"]) if row["tools"] else [],
        "created_at": row["created_at"],
    }


def add_message(conversation_id: int, role: str, content: str, tools: list | None = None) -> dict:
    now = _now()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO messages (conversation_id, role, content, tools, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (conversation_id, role, content, json.dumps(tools, default=str) if tools else None, now),
        )
        conn.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
        row = conn.execute("SELECT * FROM messages WHERE id = ?", (cur.lastrowid,)).fetchone()
        return _message(row)


def get_messages(conversation_id: int, limit: int | None = None) -> list[dict]:
    """Return messages oldest-first. With `limit`, return only the most recent `limit` messages."""
    with get_db() as conn:
        if limit:
            rows = conn.execute(
                "SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? "
                "ORDER BY id DESC LIMIT ?) ORDER BY id",
                (conversation_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id", (conversation_id,)
            ).fetchall()
        return [_message(r) for r in rows]


# ---------- documents ----------
def add_document(conversation_id: int, filename: str, text: str, chunks: list[str]) -> dict:
    now = _now()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO documents (conversation_id, filename, text, char_count, chunk_count, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (conversation_id, filename, text, len(text), len(chunks), now),
        )
        doc_id = cur.lastrowid
        conn.executemany(
            "INSERT INTO chunks (document_id, idx, content) VALUES (?, ?, ?)",
            [(doc_id, i, c) for i, c in enumerate(chunks)],
        )
        return {
            "id": doc_id, "filename": filename, "char_count": len(text),
            "chunk_count": len(chunks), "created_at": now,
        }


def list_documents(conversation_id: int) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, filename, char_count, chunk_count, created_at FROM documents "
            "WHERE conversation_id = ? ORDER BY id",
            (conversation_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def count_documents(conversation_id: int) -> int:
    with get_db() as conn:
        return conn.execute(
            "SELECT COUNT(*) FROM documents WHERE conversation_id = ?", (conversation_id,)
        ).fetchone()[0]


def get_document(document_id: int) -> dict | None:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        return dict(row) if row else None


def delete_document(document_id: int) -> None:
    with get_db() as conn:
        conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))


def get_chunks(conversation_id: int) -> list[dict]:
    """All chunks of all documents in a conversation, in reading order."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT d.filename AS filename, c.idx AS idx, c.content AS content "
            "FROM chunks c JOIN documents d ON d.id = c.document_id "
            "WHERE d.conversation_id = ? ORDER BY d.id, c.idx",
            (conversation_id,),
        ).fetchall()
        return [dict(r) for r in rows]
