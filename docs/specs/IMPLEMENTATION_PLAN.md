# Implementation Roadmap: The Lenny Growth Assistant

Status: **All 9 Implementation Phases Completed & Verified**

---

## Phase 1: Project Foundation & Requirements
- [x] Inspect existing workspace and requirements brief.
- [x] Create comprehensive PRD (`PRD.md`).
- [x] Create system architecture specification (`architecture.md`).
- [x] Create frontend design handoff (`design.md`).
- [x] Create safe environment variable templates (`.env.example`).
- [x] Create main repository README (`README.md`).
- [x] Create comprehensive `.gitignore` for Python, Node, databases, and logs.
- [x] Create implementation plan (`IMPLEMENTATION_PLAN.md`).
- **Verification Status:** Complete. All foundational documents exist and adhere to constraints.

---

## Phase 2: Frontend Design in Lovable & Component Library
- [x] Scaffold modern React 19 + TypeScript application using TanStack Router/Start.
- [x] Implement responsive 3-pane layout: Sidebar, Center Chat, and Artifact Viewer.
- [x] Implement Model Selection dropdown with Local and Cloud modes.
- [x] Implement design tokens, typography (`.prose-lenny`), and dark-mode color palette.
- [x] Verify layout responsiveness across desktop, tablet, and mobile views.
- **Verification Status:** Complete. Static and dynamic UI rendered cleanly with accessible Radix primitives.

---

## Phase 3: FastAPI Backend Foundation
- [x] Setup Python virtual environment and dependencies (`FastAPI`, `Uvicorn`, `SQLAlchemy`, `pydantic-settings`).
- [x] Create structured backend layout (`app/api`, `app/core`, `app/db`, `app/models`, `app/schemas`, `app/services`).
- [x] Implement health check endpoints (`/api/v1/health` and `/api/v1/health/ready`).
- [x] Configure CORS middleware for local frontend ports (`3000`, `5173`, `8080`, `8081`).
- [x] Implement environment variable management via Pydantic `BaseSettings`.
- **Verification Status:** Complete. Backend launches with `/health` returning 200 OK.

---

## Phase 4: PostgreSQL and Conversation Management
- [x] Define relational SQLAlchemy ORM models (`Conversation`, `Message`, `Artifact`).
- [x] Configure Alembic migrations for database schema evolution.
- [x] Implement REST CRUD endpoints for conversations and message history.
- [x] Implement cascading foreign-key deletion for conversations and messages.
- [x] Implement transparent SQLite fallback for development and test execution without Docker.
- **Verification Status:** Complete. Verified via `test_conversations.py` and `test_messages.py`.

---

## Phase 5: Transcript Ingestion and RAG Pipeline
- [x] Define `DocumentChunk` and `SearchResult` schemas.
- [x] Implement `IngestionService` with 1,000-word sliding window chunking and 200-word overlap.
- [x] Integrate SentenceTransformers (`all-MiniLM-L6-v2`) for local 384-dimensional dense embeddings.
- [x] Implement `VectorStore` abstraction with `InMemoryVectorStore` and disk cache persistence (`vector_store_cache.pkl`).
- [x] Implement startup auto-ingestion in `app/services/startup.py`.
- [x] Implement cosine similarity search and relevance threshold filtering (`>= 0.18`).
- **Verification Status:** Complete. Verified via `test_rag.py` (8 passing tests).

---

## Phase 6: Agent Layer and Local/Cloud Model Switching
- [x] Integrate Pi Coding Agent (`pi-coding-agent`) framework with `Agent`, `Sandbox`, and `ToolRegistry`.
- [x] Implement `OllamaCompatibleProvider` with capability detection to safely support `qwen3:4b` and `llama3:latest` without HTTP 400 errors.
- [x] Implement `OpenRouterProvider` for cloud inference with full error handling and secret sanitization.
- [x] Implement unified system prompt enforcing grounding, citation attribution, and insufficient evidence handling.
- [x] Implement Server-Sent Events (SSE) streaming endpoint (`/api/v1/chat?stream=true`).
- **Verification Status:** Complete. Verified via `test_ollama_compatibility.py` and `test_openrouter.py`.

---

## Phase 7: Writing Skill and Artifact Viewer
- [x] Implement Ship 30 for 30 essay writing prompt rules targeting ~1,250 words.
- [x] Register ReAct `writing_tool` (`create_artifact`) in Pi Coding Agent.
- [x] Implement resilient XML artifact extractor (`extract_artifacts`) handling multiline markdown and unclosed tags.
- [x] Implement artifact persistence in the database with conversation and message associations.
- [x] Wire up side-by-side in-app Artifact Viewer with Markdown and sandboxed HTML preview (`sandbox=""`).
- **Verification Status:** Complete. Verified via `test_writing.py` (10 passing tests).

---

## Phase 8: Frontend/Backend Integration
- [x] Centralize frontend API client in `src/services/api.ts`.
- [x] Wire up SSE streaming consumption with incremental token rendering and status updates.
- [x] Implement interactive source citation cards with timestamp excerpts and episode links.
- [x] Implement dynamic model switching between Local (`qwen3:4b`, `llama3:latest`) and Cloud (`openai/gpt-4o-mini`).
- [x] Connect Artifact Viewer to live chat events and support Copy/Download actions.
- **Verification Status:** Complete. Verified via Vitest test suites (`chat-flow.test.ts`, `conversations.test.ts`, `app-routing.test.tsx`).

---

## Phase 9: Testing, Documentation, and Submission Readiness
- [x] Maintain automated backend test suite (65 tests in pytest, 62 passed, 3 skipped for optional PG).
- [x] Maintain frontend test suite (13 tests in vitest, 100% pass).
- [x] Verify ESLint and Prettier code quality across all frontend files.
- [x] Provide reproducible setup commands for Windows and Linux/macOS.
- [x] Deep audit of all README and documentation files against take-home assessment guidelines.
- **Verification Status:** Complete. Repository is evaluator-ready.
