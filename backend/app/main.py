"""FastAPI application: defines the REST API the React frontend talks to."""
import logging
import re
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config, database as db, llm, rag, schemas

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent.api")

STYLE_LABELS = {"short": "short summary", "bullets": "bullet points", "detailed": "detailed summary"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()  # create tables on startup
    yield


app = FastAPI(title="Conversational AI Agent API", version="1.0.0", lifespan=lifespan)

# ---------- CORS Configuration ----------

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS,
    allow_origin_regex=r"https://[a-zA-Z0-9-]+--mitra-ai-study-companion\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(llm.LLMError)
async def llm_error_handler(_request, exc: llm.LLMError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


def _require_conversation(conversation_id: int) -> dict:
    conv = db.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(404, "Conversation not found.")
    return conv


def _safe_filename(name: str | None) -> str:
    base = Path(name or "upload").name  # drops any folder parts such as ../../
    base = re.sub(r"[^\w.\- ]", "_", base).strip()[:120]
    return base or "upload"


# ---------- health ----------
@app.get("/api/health")
def health():
    return {"status": "ok", "model": config.GEMINI_MODEL, "api_key_configured": bool(config.GEMINI_API_KEY)}


# ---------- conversations ----------
@app.get("/api/conversations")
def list_conversations():
    return db.list_conversations()


@app.post("/api/conversations", status_code=201)
def create_conversation(body: schemas.ConversationCreate | None = None):
    return db.create_conversation(body.title if body else "New chat")


@app.get("/api/conversations/{conversation_id}")
def get_conversation(conversation_id: int):
    conv = _require_conversation(conversation_id)
    return {
        **conv,
        "messages": db.get_messages(conversation_id),
        "documents": db.list_documents(conversation_id),
    }


@app.delete("/api/conversations/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: int):
    _require_conversation(conversation_id)
    db.delete_conversation(conversation_id)


# ---------- chat ----------
@app.post("/api/conversations/{conversation_id}/messages")
def send_message(conversation_id: int, body: schemas.MessageIn):
    conv = _require_conversation(conversation_id)

    # 1. Memory: last N saved messages + the new one (not saved yet, in case the AI call fails).
    history = db.get_messages(conversation_id, config.MAX_HISTORY_MESSAGES)
    history.append({"role": "user", "content": body.content})

    # 2. Document Q&A: fetch the most relevant excerpts of uploaded documents.
    chunks = db.get_chunks(conversation_id)
    context = rag.build_context(body.content, chunks) if chunks else None

    # 3. Ask the AI (it may call tools). LLMError is turned into a JSON error by the handler above.
    answer, tools_used = llm.chat(history, context)

    # 4. Persist both messages only after success.
    user_msg = db.add_message(conversation_id, "user", body.content)
    assistant_msg = db.add_message(conversation_id, "assistant", answer, tools_used)
    if conv["title"] == "New chat":
        db.rename_conversation(conversation_id, body.content[:40])
    return {"user_message": user_msg, "assistant_message": assistant_msg}


# ---------- documents ----------
@app.post("/api/conversations/{conversation_id}/documents", status_code=201)
def upload_document(conversation_id: int, file: UploadFile = File(...)):
    _require_conversation(conversation_id)
    if db.count_documents(conversation_id) >= config.MAX_DOCS_PER_CONVERSATION:
        raise HTTPException(400, f"Maximum {config.MAX_DOCS_PER_CONVERSATION} documents per chat.")

    filename = _safe_filename(file.filename)
    if not filename.lower().endswith((".pdf", ".txt")):
        raise HTTPException(400, "Only .pdf and .txt files are supported.")

    limit = config.MAX_UPLOAD_MB * 1024 * 1024
    data = file.file.read(limit + 1)  # read one extra byte to detect oversize files
    if len(data) > limit:
        raise HTTPException(413, f"File is larger than {config.MAX_UPLOAD_MB} MB.")
    if not data:
        raise HTTPException(400, "The file is empty.")

    try:
        text = rag.extract_text(filename, data)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception:
        logger.exception("Failed to parse upload")
        raise HTTPException(400, "Could not read this file. It may be corrupted.")

    return db.add_document(conversation_id, filename, text, rag.chunk_text(text))


@app.delete("/api/documents/{document_id}", status_code=204)
def delete_document(document_id: int):
    if not db.get_document(document_id):
        raise HTTPException(404, "Document not found.")
    db.delete_document(document_id)


@app.post("/api/documents/{document_id}/summarize")
def summarize_document(document_id: int, body: schemas.SummarizeDocIn):
    doc = db.get_document(document_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    summary = llm.summarize(doc["text"], body.style)
    cid = doc["conversation_id"]
    user_msg = db.add_message(cid, "user", f'Summarize "{doc["filename"]}" ({STYLE_LABELS[body.style]})')
    assistant_msg = db.add_message(cid, "assistant", summary)
    return {"user_message": user_msg, "assistant_message": assistant_msg}


# ---------- stand-alone text summarizer ----------
@app.post("/api/summarize")
def summarize_text(body: schemas.SummarizeTextIn):
    return {"summary": llm.summarize(body.text, body.style)}
