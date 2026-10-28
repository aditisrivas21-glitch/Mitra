"""Automated tests. The AI is replaced by a fake so tests are free, fast and need no API key."""
import pytest
from fastapi.testclient import TestClient

from app import config, llm, rag, tools
from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "test.db")  # fresh database per test
    with TestClient(app) as c:
        yield c


# ---------- tools ----------
def test_calculator_basic():
    assert tools.calculator("(18/100) * 2450") == "441.0"
    assert tools.calculator("sqrt(144) + 3**2") == "21.0"


def test_calculator_blocks_code_and_errors():
    assert tools.calculator("__import__('os').system('dir')").startswith("Error")
    assert tools.calculator("1/0").startswith("Error")
    assert tools.calculator("9**9**9").startswith("Error")


def test_datetime_tool():
    assert "Asia/Tokyo" in tools.get_current_datetime("Asia/Tokyo")
    assert tools.get_current_datetime("Mars/Base").startswith("Error")


# ---------- rag ----------
def test_chunk_and_retrieve():
    text = ("Photosynthesis converts light into chemical energy. " * 40) + \
           ("The mitochondria is the powerhouse of the cell. " * 40)
    chunks = rag.chunk_text(text, size=500, overlap=50)
    assert len(chunks) > 3
    items = [{"filename": "bio.txt", "idx": i, "content": c} for i, c in enumerate(chunks)]
    top = rag.retrieve("what does the mitochondria do?", items, top_k=2)
    assert any("mitochondria" in c["content"] for c in top)


def test_extract_rejects_bad_files():
    with pytest.raises(ValueError):
        rag.extract_text("evil.exe", b"abc")
    with pytest.raises(ValueError):
        rag.extract_text("fake.pdf", b"not really a pdf")


# ---------- API ----------
def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_chat_flow_is_persistent_and_uses_history(client, monkeypatch):
    seen = {}

    def fake_chat(history, doc_context=None):
        seen["history"] = history
        return "Hello from fake AI", [{"name": "calculator", "args": {"expression": "1+1"}}]

    monkeypatch.setattr(llm, "chat", fake_chat)
    cid = client.post("/api/conversations").json()["id"]
    client.post(f"/api/conversations/{cid}/messages", json={"content": "Hi there"})
    r = client.post(f"/api/conversations/{cid}/messages", json={"content": "And again"})
    assert r.status_code == 200
    assert len(seen["history"]) == 3  # user, assistant, new user -> context is kept

    conv = client.get(f"/api/conversations/{cid}").json()
    assert [m["role"] for m in conv["messages"]] == ["user", "assistant", "user", "assistant"]
    assert conv["messages"][1]["tools"][0]["name"] == "calculator"
    assert conv["title"] == "Hi there"


def test_validation_errors(client):
    cid = client.post("/api/conversations").json()["id"]
    assert client.post(f"/api/conversations/{cid}/messages", json={"content": "   "}).status_code == 422
    assert client.post(f"/api/conversations/{cid}/messages", json={"content": "x" * 5000}).status_code == 422
    assert client.get("/api/conversations/9999").status_code == 404


def test_upload_and_document_question(client, monkeypatch):
    seen = {}
    monkeypatch.setattr(llm, "chat", lambda h, ctx=None: (seen.update(ctx=ctx) or "ok", []))
    cid = client.post("/api/conversations").json()["id"]

    files = {"file": ("notes.txt", b"Photosynthesis happens in chloroplasts of plant cells.", "text/plain")}
    assert client.post(f"/api/conversations/{cid}/documents", files=files).status_code == 201

    client.post(f"/api/conversations/{cid}/messages", json={"content": "Where does photosynthesis happen?"})
    assert "chloroplasts" in seen["ctx"]


def test_upload_rejects_wrong_type_and_empty(client):
    cid = client.post("/api/conversations").json()["id"]
    bad = {"file": ("virus.exe", b"MZ....", "application/octet-stream")}
    assert client.post(f"/api/conversations/{cid}/documents", files=bad).status_code == 400
    empty = {"file": ("empty.txt", b"", "text/plain")}
    assert client.post(f"/api/conversations/{cid}/documents", files=empty).status_code == 400


def test_delete_conversation_cascades(client):
    cid = client.post("/api/conversations").json()["id"]
    files = {"file": ("a.txt", b"some readable document text here", "text/plain")}
    client.post(f"/api/conversations/{cid}/documents", files=files)
    assert client.delete(f"/api/conversations/{cid}").status_code == 204
    assert client.get(f"/api/conversations/{cid}").status_code == 404


def test_missing_api_key_gives_clear_error(client, monkeypatch):
    monkeypatch.setattr(config, "GEMINI_API_KEY", "")
    monkeypatch.setattr(llm, "_client", None)
    cid = client.post("/api/conversations").json()["id"]
    r = client.post(f"/api/conversations/{cid}/messages", json={"content": "hello"})
    assert r.status_code == 503 and "GEMINI_API_KEY" in r.json()["detail"]
