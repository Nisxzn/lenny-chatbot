# Project Documentation Hub

Welcome to the **Lenny Growth Assistant** documentation hub. This directory contains complete architectural specifications, product requirements, and audit reports for all implementation phases of the Forward Deployed Engineer Take-Home Assessment.

---

## 📐 Specifications & Architecture (`/docs/specs`)

| Document | Description |
| :--- | :--- |
| **[Product Requirements Document (PRD)](./specs/PRD.md)** | Discovery brief, user personas, jobs-to-be-done, measurable success metrics, trade-offs, and acceptance criteria. |
| **[System Architecture](./specs/architecture.md)** | Complete three-tier system architecture, component diagrams, Pi Agent integration, RAG pipeline, and SSE streaming. |
| **[Frontend Design Specification](./specs/design.md)** | Modern dark theme, 3-pane responsive layout, model selector, interactive citations, and state lifecycle. |
| **[Implementation Roadmap](./specs/IMPLEMENTATION_PLAN.md)** | Phased 9-stage implementation roadmap with verification status for every deliverable. |
| **[RAG Pipeline Architecture](./specs/rag.md)** | Ingestion pipeline, sliding window chunking, SentenceTransformers embeddings, disk vector cache, and relevance thresholding. |
| **[Writing Skill & Essays](./specs/writing-skill.md)** | Ship 30 for 30 essay framework (~1,250 words), ReAct tool binding, XML extraction, and multi-provider compatibility. |
| **[Artifact Viewer UI](./specs/artifact-viewer.md)** | Side-by-side in-app viewport, preview/source tabs, copy/download controls, and strict `iframe sandbox=""` security. |

---

## 📋 Audit Reports & Compliance (`/docs/reports`)

| Report | Description |
| :--- | :--- |
| **[Agent Framework Compliance](./reports/agent-framework-compliance.md)** | Technical evaluation and verification of the Pi Coding Agent (`pi-coding-agent`) harness for multi-provider support. |
| **[OpenRouter Integration Report](./reports/openrouter-integration-report.md)** | Cloud inference integration, fallback policies, free/paid model selection, and zero-regression testing. |
| **[Phase 4 Audit Report](./reports/phase4-audit-report.md)** | PostgreSQL schema, Alembic migrations, session isolation, cascade deletion, and SQLite dev fallback. |
| **[Phase 5 Audit Report](./reports/phase5-audit-report.md)** | Transcript ingestion, vector embeddings, startup auto-ingestion, and retrieval benchmarks. |
| **[Phase 6 Audit Report](./reports/phase6-audit-report.md)** | Dual LLM provider switching (Ollama local vs. OpenRouter cloud) and SSE streaming implementation. |
| **[Phase 7 Audit Report](./reports/phase7-audit-report.md)** | Structured Ship 30 for 30 essay generation, XML extraction resilience, and database persistence. |
| **[Phase 8 API Contract](./reports/phase8-api-contract.md)** | Formal REST and SSE streaming API contract between FastAPI backend and React frontend. |
| **[Phase 8 Audit Report](./reports/phase8-audit-report.md)** | End-to-end integration audit, state machine verification, CORS compliance, and error boundary handling. |
| **[Phase 8 Integration Report](./reports/phase8-integration-report.md)** | Complete user flow sign-off covering message streaming, citation drawers, and artifact viewer rendering. |
