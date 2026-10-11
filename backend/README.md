# Lenny Growth Assistant - Backend API

The backend is an enterprise-grade AI service built with **FastAPI**, **SQLAlchemy**, and the **Pi Coding Agent** framework (`pi-coding-agent`). It powers semantic RAG retrieval over Lenny Rachitsky's podcast and newsletter archive, supports seamless runtime switching between local models (Ollama) and cloud models (OpenRouter), streams conversational answers in real-time via Server-Sent Events (SSE), and features a dedicated writing skill that formats structured deliverables into persistent artifacts.

---

## 🛠️ Architecture & Core Components

- **Agent Orchestrator:** Implemented via `pi_agent.agent.Agent` with `Sandbox` and `ToolRegistry`. Supports ReAct loops and multi-provider abstraction.
- **Dual LLM Providers:**
  - **Local (Ollama):** Defaults to `qwen3:4b` (also verified with `llama3:latest`). Includes capability detection to suppress unsupported tool schemas on base models, preventing HTTP 400 errors.
  - **Cloud (OpenRouter):** Defaults to `openai/gpt-4o-mini` (configurable with `meta-llama/llama-3.3-70b-instruct:free`, `anthropic/claude-3.5-sonnet`, etc.).
- **RAG & Vector Retrieval:**
  - Semantic vector search with cosine similarity and relevance thresholding (`score >= 0.18`).
  - Embeddings generated via `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors) on CPU.
  - Transparent vector caching to `backend/data/vector_store_cache.pkl` with startup auto-ingestion in [`app/services/startup.py`](file:///w:/~Works/Oogway/lenny's%20chatbot/backend/app/services/startup.py).
- **Writing Skill & Artifacts:**
  - Detects requests for essays, teardowns, guides, and briefs.
  - Enforces Ship 30 for 30 formatting targeting approximately **1,250 words**.
  - Extracts structured `<artifact>` XML blocks into database models and side-by-side viewport payloads.
- **Relational Persistence:**
  - PostgreSQL 15 schema managed via Alembic migrations.
  - Automatic development fallback to local SQLite (`lenny_assistant.db`) when PostgreSQL is not running.

---

## 📋 Prerequisites

- **Python 3.11+**
- **Ollama** installed on host machine (for local LLM inference)
- **PostgreSQL / Docker** (optional; SQLite fallback initializes automatically)

---

## 🚀 Setup & Installation (Windows PowerShell)

### 1. Create Virtual Environment
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Key configuration settings in `.env`:
```ini
DEFAULT_LLM_PROVIDER=local
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_NAME=qwen3:4b
OPENROUTER_API_KEY=your_openrouter_api_key_placeholder
OPENROUTER_MODEL=openai/gpt-4o-mini
```

### 4. Pull Local Ollama Model
Ensure Ollama is running, then pull the default local model:
```powershell
ollama pull qwen3:4b
# Or optionally:
ollama pull llama3:latest
```

---

## 🗄️ Database Setup & Migrations

### Option A: Using PostgreSQL via Docker (Recommended)
From the project root:
```powershell
docker-compose up -d db
alembic upgrade head
```

### Option B: Local SQLite Fallback (Zero Setup)
If Docker or PostgreSQL is not available, do nothing! The backend automatically detects the absence of PostgreSQL and initializes a local SQLite database (`lenny_assistant.db`) with all required tables.

---

## 🏃 Running the Backend Server

Start the development server with auto-reload:
```powershell
uvicorn app.main:app --reload --port 8000
```
- **API Base URL:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`

---

## 🧪 Testing & Verification

Run the full automated test suite using pytest:
```powershell
pytest -v
```
**Test Results:**
- **62 tests passed**, 3 skipped (PostgreSQL tests skip cleanly when testing against local SQLite fallback).
- Test modules cover:
  - `test_chat.py`: Local/cloud providers, conversation context, CORS preflights.
  - `test_conversations.py`: Thread CRUD, pagination, cascade deletion.
  - `test_messages.py`: Message validation and history persistence.
  - `test_ollama_compatibility.py`: Ollama tool safety and live chat tests.
  - `test_openrouter.py`: OpenRouter authentication, header forming, error handling.
  - `test_rag.py`: Ingestion deduplication, retrieval accuracy, citation metadata.
  - `test_writing.py`: Artifact extraction, unclosed tag resilience, DB persistence.
  - `test_regression_critical_fixes.py`: Threshold filtering, streaming SSE formatting.

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service liveness probe |
| `GET` | `/api/v1/health/ready` | Readiness check (database & provider connectivity) |
| `GET` | `/api/v1/conversations` | List conversation threads (paginated: `?skip=0&limit=20`) |
| `POST` | `/api/v1/conversations` | Create a new conversation thread |
| `GET` | `/api/v1/conversations/{id}` | Retrieve conversation with full message & artifact history |
| `PATCH` | `/api/v1/conversations/{id}` | Rename conversation title |
| `DELETE` | `/api/v1/conversations/{id}` | Delete conversation and cascade delete messages/artifacts |
| `POST` | `/api/v1/chat` | Send message (JSON request) and receive answer with citations & artifacts |
| `GET` | `/api/v1/chat/stream` | Stream chat response via Server-Sent Events (SSE) |
| `GET` | `/api/v1/conversations/{id}/artifacts` | List all artifacts created within a specific conversation |
| `GET` | `/api/v1/artifacts/{id}` | Retrieve a specific artifact by its UUID |
| `POST` | `/api/v1/knowledge/ingest` | Manually ingest a transcript JSON file into the vector store |
| `POST` | `/api/v1/knowledge/search` | Execute vector similarity search directly |
| `GET` | `/api/v1/knowledge/status` | Return current vector store document and chunk counts |
