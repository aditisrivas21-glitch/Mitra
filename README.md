# Mitra 🌷: AI Study Companion (React + FastAPI + Gemini)

A full-stack AI study companion with memory, document Q&A, summarization and agent tools.
The interface was redesigned as **Mitra**: an animated landing page, a welcome screen with six starter cards,
and a chat workspace (lavender, blush and cream, Fraunces + DM Sans). The backend and `frontend/src/api.js` are unchanged.

**Frontend components** (`frontend/src/components/`): `Logo` (animated SVG), `Landing`, `Welcome`, `Composer`
(message box + attach button, drag and drop a PDF/TXT anywhere on the chat), `ChatWindow`, `MessageBubble`,
`Sidebar` (history, New chat, delete), `DocumentPanel` (slide-in drawer), `SummarizeModal`, `Icons`.
The welcome cards only pre-fill the message box or open the Summarize / Documents tools, so every answer still comes from Gemini.
The "Web research" tool is the existing Wikipedia lookup. The app opens on the landing page, then the welcome screen;
past chats are in the sidebar.

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Python + FastAPI |
| Database | SQLite (built into Python) |
| AI | Google Gemini API (free tier, Flash-Lite model) |

## Features
- **AI chat** with Markdown replies, typing indicator and error banners
- **Context-aware**: the last 20 messages are sent with every question, so follow-ups work
- **Persistent history**: chats, messages and documents are stored in SQLite and survive restarts
- **Document Q&A** (PDF/TXT): text is extracted, split into chunks, and the most relevant chunks are given to the AI (simple RAG)
- **Summarization**: summarize an uploaded document, or paste any text. Three styles: short, bullets, detailed
- **Agent with 3 real tools**: Calculator (safe, no `eval`), Clock (any timezone), Wikipedia lookup. The AI decides when to use them, and the UI shows which tool was used
- **Security**: API key only on the server, input validation, file type/size checks, CORS allow-list, safe filenames

## Architecture

```
 Browser (React + Vite, port 5173)
   |   fetch('/api/...')   (Vite dev server proxies /api to the backend)
   v
 FastAPI backend (port 8000)
   |-- main.py      routes + validation + error handling
   |-- schemas.py   Pydantic input models
   |-- database.py  SQLite read/write
   |-- rag.py       PDF/TXT extraction, chunking, retrieval
   |-- llm.py       Gemini calls (chat, tools, summaries)
   '-- tools.py     calculator, clock, wikipedia
   |                    |
   v                    v
 SQLite file         Gemini API (HTTPS, key from .env)
 backend/data/app.db
```

**Chat request flow** (`POST /api/conversations/{id}/messages`)
1. Validate the message (1 to 4000 characters, not blank).
2. Load the last 20 messages from SQLite (memory) and append the new one.
3. If the chat has documents, retrieve the best-matching chunks and add them to the system instructions.
4. Call Gemini with the tool functions attached. If the model asks for a tool, the SDK runs it and sends the result back to the model automatically (up to 4 calls).
5. Save the user message and the answer (plus the tools used) to SQLite, return both to React.

**Database tables**: `conversations` (1) to (many) `messages`, `documents` to `chunks`. Deleting a conversation cascades to everything below it.

## Folder structure
```
college-ai-agent/
├── README.md
├── VIVA_AND_PRESENTATION.md
├── .gitignore
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── app/  (__init__.py, main.py, config.py, database.py, schemas.py, llm.py, rag.py, tools.py)
│   └── tests/test_app.py
└── frontend/
    ├── .env.example, package.json, vite.config.js, index.html
    └── src/
        ├── main.jsx, App.jsx, api.js, styles.css
        └── components/ (Sidebar, ChatWindow, MessageBubble, DocumentPanel, SummarizeModal)
```

## Setup (Windows 10/11, PowerShell, VS Code)

**Prerequisites**: [Python 3.10+](https://www.python.org/downloads/) (tick "Add to PATH"), [Node.js 18+ LTS](https://nodejs.org/), VS Code. Check:
```powershell
python --version
node --version
```

**1. Get a free Gemini key**: open https://aistudio.google.com/apikey, sign in, click *Create API key*.

**2. Open the project**: unzip, then in VS Code use *File > Open Folder*. Open a terminal with `` Ctrl+` `` (PowerShell).

**3. Backend (Terminal 1)**
```powershell
cd backend
py -m venv .venv
# If activation is blocked, run this once, then retry:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env        # paste your key after GEMINI_API_KEY=, save, close
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Check http://127.0.0.1:8000/api/health. It should show `"api_key_configured": true`. API docs: http://127.0.0.1:8000/docs

**4. Frontend (Terminal 2: click the `+` in the terminal panel)**
```powershell
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173**.

**Next time**: just activate the venv and run the two start commands (`uvicorn ...` and `npm run dev`).

## Testing

**Automated (backend, no API key needed, the AI is faked):**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -v
```
12 tests cover the calculator (including code-injection attempts), chunking/retrieval, memory, validation, uploads, cascade delete and the missing-key error.

**Manual checklist (with a real key):**
| # | Action | Expected |
|---|---|---|
| 1 | Send "Hi, my name is Riya" then "What's my name?" | Answers "Riya" (memory) |
| 2 | Refresh the page, open the chat from the sidebar | Messages are still there (persistence) |
| 3 | Ask "What is 18% of 2450 plus sqrt(529)?" | Shows a **Used Calculator** row; answer 464 |
| 4 | Ask "What time is it in Tokyo?" | **Used Clock** row |
| 5 | Ask "Who was Alan Turing?" | **Used Wikipedia** row |
| 6 | Documents > upload a PDF/TXT, ask a question about it | Answer based on the file |
| 7 | Click Summarize on the document | Summary appears in chat, saved in history |
| 8 | Summarize text > paste text > Summarize | Summary shown, Copy works |
| 9 | Upload a .docx or a file over 5 MB | Clear error message |
| 10 | Stop the backend and send a message | "Cannot reach the server" error, text is restored |
| 11 | Put a wrong key in `.env`, restart, send a message | "Gemini rejected the API key" |
| 12 | Shrink the browser to phone width | Drawers and menu button work |

## API summary
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | status, model, key configured? |
| GET/POST | `/api/conversations` | list / create |
| GET/DELETE | `/api/conversations/{id}` | open (with messages and documents) / delete |
| POST | `/api/conversations/{id}/messages` | chat |
| POST | `/api/conversations/{id}/documents` | upload PDF/TXT |
| DELETE | `/api/documents/{id}` | remove document |
| POST | `/api/documents/{id}/summarize` | summarize document |
| POST | `/api/summarize` | summarize pasted text |

## Cost and limits
Everything is free: Gemini free tier (limited requests per minute and per day), SQLite, Wikipedia, open-source libraries. On the free tier, Google may use your prompts to improve its products, so **do not upload private or sensitive documents**. If you see a rate-limit message, wait a minute. Summarizing a long document uses up to 7 requests.

## Troubleshooting
| Problem | Fix |
|---|---|
| `Activate.ps1 cannot be loaded` | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| `uvicorn` not recognized | The venv is not active. Run `.\.venv\Scripts\Activate.ps1` |
| Page shows "backend is not reachable" | Start uvicorn on port 8000; use `127.0.0.1` |
| "No Gemini API key found" | Fill `backend/.env`, then restart uvicorn (Ctrl+C, run again) |
| "Model ... was not found" | Google renames models. In AI Studio check the current free model and set `GEMINI_MODEL` in `.env` (e.g. `gemini-flash-latest`) |
| Rate limit message | Free quota used up. Wait a minute |
| Port 8000 busy | Use `--port 8001` and change the `target` in `frontend/vite.config.js` |
| PDF says "No readable text" | The PDF is scanned images. Use a text-based PDF |

## Limitations and future work
Keyword retrieval (not embeddings) may miss paraphrased questions; no user login; answers arrive all at once (no streaming). Ideas: embeddings + vector search, user accounts (JWT), streaming responses (SSE), more tools (web search, unit converter), Docker deployment.
