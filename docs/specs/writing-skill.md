# Writing Skill: The Lenny Growth Assistant

## 1. Overview & Objective

The Lenny Growth Assistant includes a dedicated **Writing Skill** specifically designed to generate structured, long-form content modeled on the **Ship 30 for 30** atomic essay methodology. It empowers product leaders, founders, and growth professionals to transform raw conversational transcripts into publication-ready essays, strategic briefs, and guides.

---

## 2. Invocation Criteria & Trigger Detection

The Writing Skill is selectively activated to prevent cluttering short conversational answers:
1. **Keyword Detection:** [`is_writing_request()`](file:///w:/~Works/Oogway/lenny's%20chatbot/backend/app/services/llm.py) scans user prompts for trigger phrases:
   - `essay`, `write an essay`, `article`, `write an article`
   - `draft a`, `create a document`, `write a guide`, `checklist`
   - `ship 30`, `1,250`, `1250`, `create an html`, `generate artifact`, `writing skill`
2. **ReAct Tool Binding:** When a writing request is detected and the target model supports tool calling, the Pi Agent framework binds [`writing_tool`](file:///w:/~Works/Oogway/lenny's%20chatbot/backend/app/services/writing.py) (`create_artifact`).
3. **Prompt-Guided XML Output:** For models where tool calling is disabled (e.g. `llama3:latest` via Ollama), the system prompt guides the LLM to wrap the generated content inside an `<artifact>` block.

---

## 3. Ship 30 for 30 Essay Guidelines (~1,250 Words)

When invoked, the assistant enforces the following editorial constraints defined in `WRITING_SKILL_PROMPT`:
- **Target Length:** Approximately **1,250 words** (structured across 4–6 high-impact sections).
- **Compelling Headline & Hook:** A bold, engaging opening hook that captures immediate interest and states the core thesis.
- **One Central Thesis:** Focuses on a single, high-leverage product growth insight with logical progression.
- **Visual Skimmability:** Uses clear H2 section headers (`##`), bold key takeaways, bullet points, and high whitespace.
- **Grounded Evidence:** Directly incorporates retrieved insights from Lenny's podcast guests (e.g., Brian Chesky on founder-led sales, Elena Verna on B2B product-led growth).
- **Concrete Actionables:** Specific, tactical steps that readers can execute immediately.
- **Resonant Conclusion:** A memorable, summarizing conclusion that ties the thesis together.
- **No Hallucinated Citations:** Strictly distinguishes sourced claims from general reasoning; never invents quotes or timestamps.

---

## 4. Multi-Provider Compatibility

The Writing Skill operates uniformly across all supported inference backends:
- **Local Inference (Ollama):** Tested with `qwen3:4b` and `llama3:latest`. Safely generates XML artifact markup without requiring specialized OpenAI-format function-calling templates.
- **Cloud Inference (OpenRouter):** Tested with `openai/gpt-4o-mini` and `meta-llama/llama-3.3-70b-instruct:free`. Uses Pi Agent's native tool calling or prompt-guided output.

---

## 5. Artifact Extraction & Persistence Pipeline

The output extraction engine is implemented in [`extract_artifacts()`](file:///w:/~Works/Oogway/lenny's%20chatbot/backend/app/services/writing.py):
1. **Regex Tag Matching:** Matches `<artifact type="markdown|html" title="...">` blocks with robust attribute handling (unquoted, single-quoted, double-quoted, reversed order).
2. **Unclosed Tag Resilience:** If the model omits the closing `</artifact>` tag due to token limits, the extractor captures all content up to the end of the text.
3. **Fallback Extraction:** If a user asked for an essay and the model returned rich markdown without `<artifact>` tags, `extract_artifacts()` detects the headings and automatically wraps it as an artifact so the user still gets the side-by-side viewer.
4. **Chat Text Cleansing:** The artifact block is removed from the chat stream and replaced with a clean badge: `*[Generated Artifact: Title]*`.
5. **Database Storage:** The artifact is saved to the `artifacts` table via SQLAlchemy, linking both `conversation_id` and `message_id`.
6. **Viewer Notification:** The SSE `done` event delivers the saved artifact payload to the frontend, which automatically opens the side-by-side Artifact Viewer.
