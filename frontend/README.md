# Lenny Growth Assistant - Frontend

The frontend is a modern, responsive single-page application built with **React 19**, **TypeScript**, **Tailwind CSS v4**, and **TanStack Router / Start**. It delivers an interactive conversational workspace with side-by-side artifact rendering and real-time streaming grounded in Lenny Rachitsky's podcast knowledge base.

---

## ✨ Features & Architecture

- **3-Pane Collapsible Workspace:**
  - **Left Sidebar:** Conversation thread management (create, rename, delete, switch).
  - **Center Chat:** Full markdown chat stream with live SSE token deltas and auto-scroll.
  - **Right Artifact Viewer:** Dedicated side pane rendering generated essays, briefs, and HTML mockups.
- **Server-Sent Events (SSE) Streaming:** Real-time token streaming with live status updates (*"Thinking..."*, *"Generating your answer..."*, *"Drafting your artifact..."*).
- **Interactive Source Citations:** Clickable source badges displaying episode name and speaker, opening an overlay drawer with timestamps, official links, and retrieved excerpts.
- **Dynamic Model Selector:** Fast switching between **Local (Qwen3)** (`qwen3:4b`), **Local (Llama 3)** (`llama3:latest`), and **Cloud (OpenRouter)** (`openai/gpt-4o-mini`).
- **Safe HTML & Markdown Isolation:** Untrusted HTML artifacts render strictly inside an iframe with `sandbox=""` and `referrerPolicy="no-referrer"`. Markdown is parsed without raw HTML injection.
- **Export Capabilities:** One-click Copy to clipboard and file Download (`.md` or `.html`).

---

## 🛠️ Technology Stack

- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing & State:** [TanStack Router](https://tanstack.com/router) & custom state engine ([`store.tsx`](file:///w:/~Works/Oogway/lenny's%20chatbot/frontend/src/components/assistant/store.tsx))
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with custom dark HSL tokens
- **Components:** [Radix UI](https://www.radix-ui.com/) accessible primitives + Lucide icons
- **Markdown:** `react-markdown` with `remark-gfm`
- **Testing & Quality:** [Vitest](https://vitest.dev/), [ESLint](https://eslint.org/), and [Prettier](https://prettier.io/)

---

## 🚀 Setup & Installation (Windows PowerShell / Bash)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Ensure `VITE_API_BASE_URL` points to your backend instance:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 3. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173` (or port configured by Vite).

---

## 🧪 Testing & Code Quality

### Run Unit & Integration Tests (Vitest)
```bash
npm test
```
**Test Results:**
- **3 test suites passed (13 tests total)**:
  - `src/test/chat-flow.test.ts`: Chat sending, streaming chunks, and message state.
  - `src/test/conversations.test.ts`: Thread creation, selection, and deletion.
  - `src/test/app-routing.test.tsx`: Route mounting and initial state hydration.

### Check Linting & Formatting
```bash
npm run lint
```

### Auto-Format Codebase
```bash
npm run format
```

### Build Production Bundle
```bash
npm run build
```

---

## 📁 Directory Structure

```
frontend/src/
├── components/
│   ├── assistant/              # Assistant domain components
│   │   ├── AppLayout.tsx           # 3-pane responsive layout container
│   │   ├── ArtifactViewer.tsx      # Side drawer for reading essays & HTML
│   │   ├── ChatHeader.tsx          # Model toggle and thread title
│   │   ├── ChatMessage.tsx         # Message bubble with markdown & citations
│   │   ├── ConversationItem.tsx    # Thread row with inline rename & delete
│   │   ├── ConversationSidebar.tsx # Thread list & + New Chat button
│   │   ├── HtmlPreview.tsx         # Strict sandboxed iframe preview (sandbox="")
│   │   ├── Logo.tsx                # Lenny assistant brand icon
│   │   ├── MarkdownPreview.tsx     # Safe react-markdown renderer
│   │   ├── MessageComposer.tsx     # Auto-expanding textarea with Send & Stop
│   │   ├── ModelSelector.tsx       # Qwen3 / Llama 3 / OpenRouter switcher
│   │   ├── SourceCitation.tsx      # Grounding badge & excerpt drawer
│   │   ├── States.tsx              # Loading, Empty, and Error state components
│   │   └── store.tsx               # State machine & SSE streaming engine
│   └── ui/                     # Radix-based reusable primitives (button, popover, etc.)
├── hooks/                      # Custom hooks (useMobile, etc.)
├── lib/                        # Utility functions (cn, date formatting)
├── routes/                     # TanStack Start file-based routing
├── services/                   # API client with REST & SSE streaming
├── styles.css                  # Theme tokens, typography (.prose-lenny), and animations
└── test/                       # Vitest integration & component test specs
```
