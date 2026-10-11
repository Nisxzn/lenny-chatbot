# Frontend Design Specification: The Lenny Growth Assistant

## 1. Design System & Aesthetic Foundation

The frontend is built with **React 19**, **Tailwind CSS v4**, and **Radix UI** primitives, following a focused, content-first dark-mode theme inspired by modern developer-focused AI workspaces (Linear, Claude, Cursor).

### 1.1 Color Tokens & Dark Theme Palette
The design system uses tailored HSL color tokens to ensure low eye strain during long reading sessions:
- **Background:** `hsl(222.2, 84%, 4.9%)` — Deep slate canvas providing high contrast with text.
- **Sidebar & Card Surfaces:** `hsl(217.2, 32.6%, 12%)` / `hsl(222.2, 84%, 6.5%)` — Distinct card elevation.
- **Borders:** `hsl(217.2, 32.6%, 17.5%)` — Subtle borders with translucent dividers.
- **Primary / Brand Accent:** `hsl(210, 40%, 98%)` (Text) with `hsl(217.2, 91.2%, 59.8%)` (Interactive highlights).
- **Muted Text:** `hsl(215, 20.2%, 65.1%)` — High-legibility secondary text.
- **Destructive:** `hsl(0, 62.8%, 30.6%)` — Restrained red for thread deletion warnings.

### 1.2 Typography & Hierarchy
- **UI & System Typography:** Clean system sans-serif stack (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`).
- **Headings:** Bold typography (`font-semibold`, tracking-tight) with clear visual hierarchy (`h1`, `h2`, `h3`).
- **Markdown & Essays:** Styled using `.prose-lenny` typography rules with optimized line-height (`leading-relaxed`), clear paragraph spacing, distinct code blocks, and blockquotes for podcast excerpts.

---

## 2. Information Architecture & Layout (3-Pane Workspace)

The interface organizes the user's workflow into three distinct, responsive viewports:

```
+------------------------------------------------------------------------------------+
|                                    APP HEADER                                      |
| [Sidebar Toggle]  The Lenny Growth Assistant    [Model Selector: Qwen3 / OpenRouter]|
+-------------------+-----------------------------------+----------------------------+
|                   |                                   |                            |
|  LEFT SIDEBAR     |         CENTRAL CHAT PANE         |   ARTIFACT VIEWER (PANE)   |
|                   |                                   |                            |
|  [+ New Chat]     |  - Scrollable message stream      |  - Title & Type Badge      |
|                   |  - Assistant Markdown bubble      |  - [Preview] [Source] Tabs |
|  Conversation     |  - Clickable Source Pills         |  - [Copy] [Download]       |
|  Thread List:     |    [Ep 142: Brian Chesky]         |                            |
|  - Growth Loops   |                                   |  Rendered Markdown Essay   |
|  - PMF Tactics    |  - Message Composer with          |  or Sandboxed HTML Preview |
|  - Hiring PMs     |    dynamic expanding textarea     |                            |
|                   |    and Send / Stop buttons        |                            |
|                   |                                   |  [Close Button]            |
+-------------------+-----------------------------------+----------------------------+
```

### 2.1 Collapsible Sidebar (`ConversationSidebar.tsx`)
- Displays conversation threads sorted chronologically by update timestamp.
- **Actions:** Create new conversation (`+ New Chat`), inline rename thread title, and delete thread with confirmation toast.
- **Responsive Collapse:** Automatically collapses on mobile screens (`useMobile` hook), accessible via mobile menu drawer.

### 2.2 Central Chat Viewport (`ChatMessage.tsx`, `MessageComposer.tsx`)
- **Chat Header:** Contains thread title and the visible `ModelSelector` popover.
- **Message Stream:** Auto-scrolling list of user and assistant messages with markdown rendering, syntax highlighting, and inline citation pills.
- **Message Composer:** Auto-expanding textarea that submits on `Enter` (and allows multi-line input via `Shift + Enter`). During active generation, the send button switches to a red **Stop Generation** button triggering `AbortController.abort()`.

### 2.3 Side-by-Side Artifact Viewer (`ArtifactViewer.tsx`)
- Opens automatically when the assistant generates an essay, teardown, guide, or HTML layout.
- Can be manually opened/closed or toggled from the chat header.
- **Header Actions:**
  - Type indicator (`Markdown` or `HTML`).
  - **Preview Tab:** Renders formatted Markdown or sandboxed HTML.
  - **Source Tab:** Displays syntax-highlighted raw markdown/HTML code.
  - **Copy Button:** Copies content to clipboard with 1.5s visual check confirmation.
  - **Download Button:** Downloads `.md` or `.html` file titled with a slugified artifact name.
  - **Close Button:** Collapses the pane to maximize chat width.

---

## 3. Interactive Citations & Grounding Experience (`SourceCitation.tsx`)

Every grounded assistant response features interactive source cards:
1. **Source Pills:** Badges rendered directly beneath assistant messages displaying `Guest Name` and `Episode Title`.
2. **Citation Detail Drawer / Popover:** Clicking a citation badge opens an overlay revealing:
   - Episode Title and Guest Name.
   - Exact Timestamp (e.g., `00:14:22`) where the topic was discussed.
   - Direct Episode Link (`url`) to the official podcast recording.
   - Complete unedited transcript excerpt retrieved by the vector engine.

---

## 4. UI States & Feedback Lifecycle (`States.tsx`, `store.tsx`)

The UI strictly communicates runtime state transitions to avoid user uncertainty:

| State | Visual Representation | User Interactions |
| :--- | :--- | :--- |
| **Empty Chat** | Welcome header with Lenny Growth icon and 3 quick-start prompt suggestions. | Clicking any suggestion automatically sends the prompt. |
| **Thinking / Loading** | Subtle pulsing badge: *"Thinking..."* | Can click **Stop** to cancel generation. |
| **Generating** | Real-time token streaming with live cursor. Progress message updates (*"Generating your answer..."*, *"Drafting your artifact..."*). | Text auto-scrolls down; user can pause scroll by wheeling up. |
| **Error** | Red-accented alert box with descriptive error text (e.g., *"Model unavailable in Ollama"* or *"OPENROUTER_API_KEY is not set"*). | Includes dedicated **Retry** button that re-submits the last prompt. |
| **Cancellation** | Stream aborts immediately when user clicks Stop; partial text is preserved in history. | User can enter next prompt or click Retry. |

---

## 5. Model Selection Controls (`ModelSelector.tsx`)

A prominent popover button in the chat header displays current provider status:
- **`Local (Qwen3)`** (`qwen3:4b` via Ollama) — Default lightweight local model.
- **`Local (Llama 3)`** (`llama3:latest` via Ollama) — Standard local model.
- **`Cloud (OpenRouter)`** (`openai/gpt-4o-mini` via OpenRouter) — High-speed cloud reasoning model.

If a cloud model is selected while `OPENROUTER_API_KEY` is missing, the backend returns an actionable 401/500 error that the frontend surfaces directly with instructions to add the key to `.env`.

---

## 6. Accessibility & Security

### 6.1 Accessibility (a11y)
- **Keyboard Navigation:** All interactive elements (buttons, popovers, tabs, input fields) are navigable via `Tab`, with high-visibility `focus-visible:ring-2` focus rings.
- **ARIA Annotations:** Dynamic regions use proper labels (`aria-label="Artifact viewer"`, `aria-label="Selected provider: ..."`).
- **Contrasts:** Contrast ratios exceed WCAG AA standards across all text and background pairings.

### 6.2 Safe Artifact Isolation (`HtmlPreview.tsx`)
- Untrusted HTML generated by the LLM is rendered inside an iframe configured with:
  ```html
  <iframe sandbox="" referrerPolicy="no-referrer" srcDoc={html} />
  ```
- An empty `sandbox=""` is the browser's strictest security profile: scripts cannot execute, forms cannot submit, and parent cookies/localStorage are completely inaccessible.
