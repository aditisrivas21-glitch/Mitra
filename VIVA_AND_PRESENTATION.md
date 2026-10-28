# Presentation Guide and Viva Q&A

## 1. Two-minute pitch
"This is a conversational study assistant. Its frontend is React; its backend is FastAPI; chats and documents are stored in SQLite; and the intelligence comes from Google's Gemini API. It remembers the conversation, answers questions from uploaded PDFs, summarizes text, and works as an *agent*: it can decide to use a calculator, a clock or Wikipedia, and the interface shows which tool it used."

## 2. Live demo order (5 minutes)
1. Say your name, then ask "What's my name?" (memory).
2. Ask a calculation, a time question and a "Who was...?" question (three tools, show the green rows).
3. Refresh the page and reopen the chat (persistence).
4. Upload a PDF, ask a question, click Summarize.
5. Show `http://127.0.0.1:8000/docs` and run `python -m pytest -v` (engineering quality).

## 3. Important code sections explained

**`backend/app/llm.py`: `chat()` and `_generate()`**: The heart of the project. `chat()` converts saved messages into Gemini's format (`user` / `model` roles) and sends them *every time*. The model has no memory of its own; **memory is just us resending history**. `_generate()` attaches the tool functions with `tools=[...]`. Gemini replies either with text or with "call `calculator('2+2')`". The SDK runs the function, returns the result to Gemini, and Gemini writes the final answer. This loop is what makes it an *agent*. Afterwards we read `automatic_function_calling_history` to list the tools used, and the UI displays them.

**`backend/app/tools.py`: `calculator()`**: Uses Python's `ast` module to parse the expression and only allows numbers, arithmetic operators and a few math functions. `eval()` is deliberately avoided because it would let anyone run code like `__import__('os').system(...)`. Test `test_calculator_blocks_code_and_errors` proves it. Each tool's **docstring is read by the AI** to decide when to use it.

**`backend/app/rag.py`: document Q&A (RAG)**: (1) `extract_text` reads the PDF/TXT, (2) `chunk_text` cuts it into ~1000-character pieces with 150 overlap so sentences on a boundary are not lost, (3) `retrieve` scores each chunk with TF-IDF (words that are rare in the document and appear often in a chunk score higher) and returns the top 5, (4) `build_context` puts them in the system prompt with source labels. Small documents (under 8,000 characters) are sent whole.

**`backend/app/llm.py`: `summarize()`**: Short text: one request. Long text: **map-reduce**. Summarize each 12,000-character part, then summarize the summaries. Capped at 6 parts to protect the free quota.

**`backend/app/database.py`**: Plain `sqlite3`. `get_db()` is a context manager: commit on success, rollback on error, always close. `PRAGMA foreign_keys = ON` enables cascade delete. All SQL uses `?` placeholders, which prevents SQL injection.

**`backend/app/main.py`: `send_message()`**: Validate, load history, retrieve document context, call AI, *then* save. Saving only after success means a failed AI call never leaves half-saved conversations. `LLMError` is converted to clean JSON errors by one exception handler.

**`backend/app/schemas.py`**: Pydantic models. `Field(min_length=1, max_length=4000)` rejects bad input automatically with HTTP 422.

**`frontend/src/App.jsx`**: Holds all state with `useState`. `send()` shows the user's message immediately (optimistic UI), calls the API, and on failure removes it, restores the text in the box and shows an error. A chat is only created in the database when the user first sends or uploads something.

**`frontend/src/api.js`**: One `request()` function handles network failures and server error messages for every call.

## 4. Viva questions and answers

**Basics**
1. **What is your project?** A full-stack conversational AI agent: chat with memory, document Q&A, summarization and tool use, built with React, FastAPI, SQLite and Gemini.
2. **Why FastAPI?** It is fast, has automatic validation (Pydantic), and generates interactive API docs at `/docs`. Python also has the best AI libraries.
3. **Why React + Vite?** React gives a component-based UI with state; Vite starts instantly and has simple configuration.
4. **Why SQLite?** Zero setup, a single file, built into Python, and enough for a single-user project. For many users I would move to PostgreSQL.
5. **Why Gemini?** It has a free tier, a good Python SDK and built-in function calling.
6. **What is an LLM?** A large neural network trained on huge amounts of text to predict the next token, which lets it generate answers.

**AI concepts**
7. **How does the chatbot remember context?** The LLM is stateless. We store messages in SQLite and send the last 20 with every request.
8. **Why only the last 20 messages?** Models have a token limit, and more tokens cost more and are slower. 20 is a balance.
9. **What is RAG?** Retrieval-Augmented Generation. Find relevant parts of your own data, put them in the prompt, and let the LLM answer from them. It reduces hallucination and avoids sending the whole document.
10. **How does your retrieval work?** Chunk the text, score chunks by TF-IDF keyword matching, send the top 5.
11. **What are the limits of keyword retrieval?** It misses synonyms ("car" vs "automobile"). Embeddings + a vector database would fix it.
12. **Why chunking with overlap?** Models have limited context and retrieval works better on small pieces. Overlap prevents information being cut at a boundary.
13. **What is an AI agent?** An LLM that can decide to use external tools, observe the results and continue until it can answer. Mine has three tools.
14. **How does function calling work?** We describe functions (name, parameters, docstring). The model returns a structured request to call one; our code runs it and returns the result; the model produces the final answer.
15. **What is a hallucination and how do you reduce it?** Confident but false output. I reduce it with tools (exact calculations, Wikipedia), document grounding, and an instruction to say "I don't know".
16. **What is prompt injection?** Text, e.g. inside an uploaded PDF, that tries to give the model new instructions. I mitigate it by labelling document text as data and telling the model to ignore commands in it. It is reduced, not eliminated.
17. **What is map-reduce summarization?** Summarize each part separately (map), then summarize those summaries (reduce), so text longer than the context window can be handled.

**Backend and security**
18. **How do you keep the API key safe?** It lives in `backend/.env`, loaded server-side, never sent to the browser, and `.env` is in `.gitignore`. Only `.env.example` is committed.
19. **How do you validate input?** Pydantic limits message length and rejects blanks; uploads are checked for extension, size (5 MB), PDF signature, emptiness and readable text; filenames are sanitized with `Path(name).name`.
20. **How do you prevent SQL injection?** Parameterized queries with `?` placeholders.
21. **Why not use `eval()` in the calculator?** It can execute arbitrary code. I parse with `ast` and whitelist operations.
22. **What is CORS?** A browser rule that blocks a page from calling a different origin. The backend allows only the frontend's origin; in development Vite's proxy also avoids it.
23. **Which HTTP status codes do you use?** 200/201 success, 204 delete, 400 bad file, 404 not found, 413 too large, 422 validation, 429 rate limit, 503 missing key or Gemini down.
24. **What happens if Gemini fails?** Errors are translated to friendly messages (rate limit, bad key, unavailable). The user's text is restored in the input and nothing half-saved remains.
25. **What is `ON DELETE CASCADE`?** Deleting a conversation automatically deletes its messages, documents and chunks.

**Frontend**
26. **What is the Vite proxy?** In development, requests to `/api` are forwarded to `127.0.0.1:8000`, so the frontend calls a relative URL.
27. **What is optimistic UI?** Showing the user's message before the server confirms, for responsiveness, and undoing it on error.
28. **How is the UI responsive?** CSS grid with media queries; sidebars become slide-in drawers on small screens.
29. **How do you show loading states?** A typing indicator while waiting, spinners on upload/summarize, and disabled buttons to prevent duplicate requests.

**Improvement and cost**
30. **How would you improve it?** Embeddings and a vector store, login (JWT) so users have private chats, streaming responses, more tools, Docker deployment, tests for the frontend.
31. **How is it affordable?** Gemini free tier, SQLite, Wikipedia API, free libraries; the retrieval sends only relevant chunks to save tokens.
32. **Is the free tier safe for private data?** No. Google may use free-tier content to improve its products, so sensitive documents should not be uploaded. A paid tier or a local model would be needed.
33. **How did you test it?** 12 automated pytest tests with a fake AI (so they are free and deterministic) plus a manual checklist with the real API.
