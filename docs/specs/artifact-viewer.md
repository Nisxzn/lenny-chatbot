# Artifact Viewer: Architecture & Security Specification

## 1. Overview

The **Artifact Viewer** is an in-app, side-by-side viewport within the React 19 frontend designed to render long-form documents (essays, guides, checklists) and HTML layouts independently from the main chat stream. This design prevents wall-of-text fatigue in conversational bubbles and provides dedicated tools for reading, copying, and exporting deliverables.

---

## 2. In-App Layout & User Interactions

The viewer is implemented in [`frontend/src/components/assistant/ArtifactViewer.tsx`](file:///w:/~Works/Oogway/lenny's%20chatbot/frontend/src/components/assistant/ArtifactViewer.tsx):
- **Automatic Slide-Open:** When the assistant finishes generating an artifact, the viewer slides open on the right (or stacks on mobile).
- **Tabbed View:**
  - **`Preview` Tab:** Renders formatted Markdown via `.prose-lenny` or sandboxed HTML preview.
  - **`Source` Tab:** Displays the raw, syntax-highlighted markdown or HTML code with a monospace font.
- **Action Toolbar:**
  - **Copy Button:** Copies content to the system clipboard via `navigator.clipboard.writeText()` with 1.5-second visual check confirmation.
  - **Download Button:** Creates a temporary `Blob` and initiates a browser download formatted as `<slugified-title>.md` or `<slugified-title>.html`.
  - **Close Button:** Collapses the pane to restore full width to the chat view.
- **Empty State:** Shows a clean placeholder icon when no artifact is selected.

---

## 3. Strict Security & HTML Isolation

Model-generated HTML is inherently untrusted. The Lenny Growth Assistant enforces the highest security posture:

### 3.1 Sandboxed IFrame Isolation (`HtmlPreview.tsx`)
Rendered exclusively via:
```tsx
<iframe
  title={`Preview: ${title}`}
  sandbox=""
  referrerPolicy="no-referrer"
  srcDoc={html}
  onLoad={() => setLoaded(true)}
  className="h-full w-full"
/>
```

**Security Guarantees of `sandbox=""`:**
- **Zero Script Execution:** Scripts cannot run (no `<script>`, no inline `onclick`, no `javascript:` URIs).
- **No Form Submission:** Forms cannot POST data to external phishing endpoints.
- **No Same-Origin Access:** The iframe is treated as a unique, opaque origin. It cannot read cookies, session storage, or localStorage from the parent application.
- **No Popups or Modals:** `window.open()`, `alert()`, and popups are blocked.
- **Referrer Privacy:** `referrerPolicy="no-referrer"` prevents leaking the application URL in any outbound asset requests.

### 3.2 Markdown XSS Prevention (`MarkdownPreview.tsx`)
- Uses `react-markdown` with `remark-gfm`.
- `rehype-raw` is intentionally **omitted**, ensuring any embedded HTML tags inside markdown are escaped as raw text rather than rendered into the DOM.

---

## 4. Data Model & REST Endpoints

### 4.1 Artifact Schema
```typescript
interface Artifact {
  id: string;               // UUID
  conversation_id: string;  // UUID of parent chat thread
  message_id: string;       // UUID of generating message
  title: string;            // Headline or document title
  artifact_type: "markdown" | "html" | "text";
  content: string;          // Full document body
  version: number;          // Revision counter (default: 1)
  created_at: string;       // ISO 8601 timestamp
  updated_at: string;       // ISO 8601 timestamp
}
```

### 4.2 REST Endpoints
- **List Conversation Artifacts:**
  ```http
  GET /api/v1/conversations/{conversation_id}/artifacts
  ```
- **Get Specific Artifact:**
  ```http
  GET /api/v1/artifacts/{artifact_id}
  ```
- **Realtime Delivery:** Artifacts are also included in the SSE `done` event payload from `/api/v1/chat?stream=true`.
