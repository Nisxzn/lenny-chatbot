import re
from typing import List, Dict, Tuple, Optional
from pi_agent.tools.base import Tool

WRITING_SKILL_PROMPT = """
WRITING SKILL INSTRUCTIONS:
When the user explicitly asks you to write an essay, article, long-form post, guide, checklist, or generate an HTML/Markdown document, you MUST invoke your dedicated Writing Skill.
When invoking this skill, you must wrap your final generated document inside an XML artifact block formatted as:

<artifact type="markdown" title="Your Document Title">
... your document content here ...
</artifact>

Or for HTML pages:
<artifact type="html" title="Your Page Title">
... HTML content here ...
</artifact>

ESSAY GUIDELINES (Ship 30 for 30 style):
If asked to write an essay:
- Target length is approximately 1,250 words.
- Use a compelling headline and a strong opening hook that captures immediate interest.
- Focus on one central, high-leverage idea with structured, logical progression.
- Structure for skimmability: use clear section headers (##), bold key concepts, and concise bullet points.
- Provide concrete, grounded examples and actionable takeaways.
- Include a memorable, resonant conclusion.
- Ground your claims in retrieved evidence from Lenny's Podcast transcripts where applicable.
- Clearly distinguish sourced claims from general reasoning.
- Never invent podcast quotations, episode numbers, links, or timestamps.

CONVERSATIONAL COMPANION:
Provide a brief, helpful conversational introduction outside the artifact block explaining what you have created.
Do NOT output the `<artifact>` block for simple questions or conversational chat responses; only use it when the user explicitly asks for a document, essay, guide, page, or artifact, or when the response exceeds 900+ words.
"""

def create_artifact_handler(args: dict, sandbox) -> str:
    """Tool handler for Pi Agent to generate artifacts."""
    title = args.get("title", "Generated Document").strip()
    artifact_type = args.get("artifact_type", "markdown").strip().lower()
    if artifact_type not in ["markdown", "html", "text"]:
        artifact_type = "markdown"
    content = args.get("content", "").strip()
    return f'<artifact type="{artifact_type}" title="{title}">\n{content}\n</artifact>'

writing_tool = Tool(
    name="create_artifact",
    description="Dedicated Writing Skill: Generate and format a structured document, essay, guide, checklist, or HTML page as an artifact.",
    input_schema={
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "The headline or title of the document"},
            "artifact_type": {"type": "string", "enum": ["markdown", "html", "text"], "description": "The artifact type"},
            "content": {"type": "string", "description": "The complete markdown or html content of the document"}
        },
        "required": ["title", "artifact_type", "content"]
    },
    handler=create_artifact_handler,
    mutating=False
)


def _parse_attributes(tag_str: str) -> Dict[str, str]:
    """Robustly extracts key-value attributes from an XML/HTML opening tag."""
    attrs = {}
    attr_pattern = re.compile(r'([a-zA-Z_:][a-zA-Z0-9_\.:-]*)\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))')
    for match in attr_pattern.finditer(tag_str):
        key = match.group(1).lower()
        val = match.group(2) if match.group(2) is not None else (
            match.group(3) if match.group(3) is not None else match.group(4)
        )
        attrs[key] = val.strip() if val else ""
    return attrs


def _clean_thinking(text: str) -> str:
    """Removes internal thinking tokens (<think>...</think> or ...</think>) from text."""
    if not text:
        return ""
    # Strip explicit <think>...</think>
    cleaned = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    # Strip unclosed <think>... at start or within text
    if "<think>" in cleaned and "</think>" not in cleaned:
        cleaned = re.sub(r'<think>.*$', '', cleaned, flags=re.DOTALL)
    # Strip leading ...</think> (e.g. models where opening tag is implicit)
    cleaned = re.sub(r'^.*?</think>', '', cleaned, flags=re.DOTALL)
    return cleaned.strip()


def _infer_artifact_title(response_text: str, user_request: Optional[str] = None) -> str:
    """Infers an informative, presentation-ready title for the generated artifact."""
    clean_text = _clean_thinking(response_text)
    lines = clean_text.strip().splitlines()
    for line in lines[:10]:
        stripped = line.strip()
        if stripped.startswith("#"):
            candidate = stripped.lstrip("#").strip()
            if candidate and len(candidate) <= 80:
                return candidate

    if user_request:
        cleaned_req = user_request.strip().rstrip("?.! ")
        req_lower = cleaned_req.lower()

        prefixes = [
            "can you please summarize", "please summarize", "can you summarize", "summarize",
            "can you please explain", "please explain", "can you explain", "explain",
            "what is", "what are", "tell me about", "give me a summary of", "give a summary of",
            "write an essay on", "write an essay about", "write an article about",
            "draft an essay on", "deep dive into", "break down", "overview of"
        ]
        for prefix in prefixes:
            if req_lower.startswith(prefix):
                subject = cleaned_req[len(prefix):].strip()
                if subject:
                    if "summar" in prefix:
                        return f"Summary: {subject.title()}"
                    elif any(p in prefix for p in ["explain", "deep dive", "break down", "what is", "what are"]):
                        return f"Explanation: {subject.title()}"
                    elif any(p in prefix for p in ["essay", "article", "draft"]):
                        return f"Essay: {subject.title()}"
                    return subject.title()

        if len(cleaned_req) <= 60:
            return cleaned_req.title()

    return "Executive Summary & Insights"


def generate_conversation_title(prompt: str) -> str:
    """
    Generates a concise, meaningful title (3-6 words, <= 50 chars) from a user query,
    similar to how ChatGPT and Claude format conversation titles, rather than using raw prompts.
    """
    if not prompt or not prompt.strip():
        return "New Chat"

    cleaned = prompt.strip().rstrip("?.! ")
    # Remove leading quotes or markdown symbols
    cleaned = re.sub(r'^["\'`*#]+|["\'`*#]+$', '', cleaned).strip()

    # Common conversational / filler prefixes
    lead_patterns = [
        r"^(?:hey|hi|hello|please|can\s+you\s+(?:please\s+)?(?:tell\s+me|explain|summarize|write|give\s+me|help\s+me\s+with)?)\s+",
        r"^(?:could\s+you\s+(?:please\s+)?(?:tell\s+me|explain|summarize|write|give\s+me|help\s+me\s+with)?)\s+",
        r"^(?:what\s+(?:is|are|do\s+you\s+think\s+about|does\s+it\s+mean\s+by|would\s+be))\s+",
        r"^(?:how\s+(?:do|to|can|should|would)\s+(?:i|we|you)?)\s+",
        r"^(?:tell\s+me\s+(?:about|more\s+about))\s+",
        r"^(?:explain\s+(?:to\s+me\s+)?(?:about)?)\s+",
        r"^(?:summarize\s+(?:about)?)\s+",
        r"^(?:give\s+me\s+(?:a|an)?\s*(?:overview\s+of|breakdown\s+of|summary\s+of)?)\s+",
        r"^(?:write\s+(?:a|an)?\s*(?:essay|article|post|guide|checklist)?\s*(?:on|about)?)\s+",
        r"^(?:i\s+want\s+to\s+know\s+about)\s+",
        r"^(?:i\'m\s+looking\s+for)\s+",
    ]
    sub = cleaned
    for pattern in lead_patterns:
        sub = re.sub(pattern, "", sub, flags=re.IGNORECASE).strip()

    # If stripped empty, fallback to cleaned
    candidate = sub if len(sub) >= 3 else cleaned

    # Take first 4 to 6 words
    words = candidate.split()
    if len(words) > 6:
        candidate = " ".join(words[:6])

    # Capitalize appropriately (Title Case)
    title = candidate.title()

    # Truncate to 48 chars gracefully if still long
    if len(title) > 48:
        title = title[:45].rsplit(" ", 1)[0] + "…"

    return title or "Growth Strategy"


def is_artifact_requested(user_request: Optional[str]) -> bool:
    """
    Checks if the user explicitly asked for an artifact, essay, article,
    document, guide, checklist, playbook, framework, or HTML document.
    """
    if not user_request:
        return False
    req_lower = user_request.strip().lower()

    artifact_keywords = [
        "artifact",
        "essay",
        "article",
        "create a document",
        "generate a document",
        "write a document",
        "draft a document",
        "make a document",
        "create document",
        "generate document",
        "write document",
        "draft document",
        "make document",
        "guide",
        "checklist",
        "playbook",
        "framework",
        "1,250",
        "1250",
        "write up",
        "write-up",
        "create an html",
        "generate an html",
        "write html",
        "html page",
        "html document",
        "ship 30",
        "writing skill"
    ]
    return any(kw in req_lower for kw in artifact_keywords)


def extract_artifacts(response_text: str, user_request: Optional[str] = None) -> Tuple[str, List[Dict[str, str]]]:
    """
    Parses the response text to find <artifact> blocks.
    Artifacts are generated ONLY when explicitly requested by the user
    or when the response exceeds 900+ words.
    Simple responses and conversational queries remain normal chat messages without artifacts.
    """
    if not response_text:
        return "", []

    is_asked = is_artifact_requested(user_request)
    clean_resp_text = _clean_thinking(response_text)
    total_words = len(clean_resp_text.split())
    is_over_900 = total_words >= 900

    artifacts: List[Dict[str, str]] = []
    
    # 1. Look for standard or variant <artifact ...> tags
    open_tag_pattern = re.compile(r'<artifact\b([^>]*)>', re.IGNORECASE)
    close_tag_pattern = re.compile(r'</\s*artifact\s*>', re.IGNORECASE)

    segments = []
    last_idx = 0

    open_matches = list(open_tag_pattern.finditer(response_text))
    
    if open_matches:
        # If user provided a query, but did NOT ask for an artifact and response is under 900 words,
        # unwrap the tags so the content displays cleanly in chat as a simple response.
        if user_request is not None and not is_asked and not is_over_900:
            unwrapped = re.sub(r'</?\s*artifact\b[^>]*>', '', response_text, flags=re.IGNORECASE).strip()
            return _clean_thinking(unwrapped), []

        for i, open_match in enumerate(open_matches):
            start_open = open_match.start()
            end_open = open_match.end()
            
            if start_open > last_idx:
                segments.append(response_text[last_idx:start_open])
            
            attr_str = open_match.group(1)
            attrs = _parse_attributes(attr_str)
            
            artifact_type = attrs.get("type", "").lower() or "markdown"
            if artifact_type not in ["markdown", "html", "text"]:
                artifact_type = "markdown"
                
            title = attrs.get("title", "").strip()

            close_match = close_tag_pattern.search(response_text, end_open)
            next_open = open_matches[i + 1].start() if i + 1 < len(open_matches) else len(response_text)
            
            if close_match and close_match.start() < next_open:
                content = response_text[end_open:close_match.start()].strip()
                last_idx = close_match.end()
            else:
                content = response_text[end_open:next_open].strip()
                last_idx = next_open

            # Clean any internal thinking tokens from artifact content
            content = _clean_thinking(content)

            if not title:
                heading_match = re.search(r'^#+\s*(.+)$', content, re.MULTILINE)
                if heading_match:
                    title = heading_match.group(1).strip()
                else:
                    title = _infer_artifact_title(content, user_request)

            artifacts.append({
                "type": artifact_type,
                "title": title,
                "content": content
            })
            
            segments.append(f"\n*[Generated Artifact: {title}]*\n")

        if last_idx < len(response_text):
            segments.append(response_text[last_idx:])
            
        cleaned_text = "".join(segments).strip()
        if not cleaned_text and artifacts:
            cleaned_text = f"I've created the **{artifacts[0]['title']}** document for you. You can review the complete document in the artifact panel.\n\n*[Generated Artifact: {artifacts[0]['title']}]*"

        return cleaned_text, artifacts

    # 2. Check for malformed opening tag e.g. `<artifact ...` without `>`
    malformed_open = re.search(r'<artifact\b([^>\n]*)', response_text, re.IGNORECASE)
    if malformed_open:
        if user_request is not None and not is_asked and not is_over_900:
            unwrapped = re.sub(r'<artifact\b[^>\n]*>?|</\s*artifact\s*>', '', response_text, flags=re.IGNORECASE).strip()
            return _clean_thinking(unwrapped), []

        start_idx = malformed_open.start()
        before_text = response_text[:start_idx].strip()
        attr_part = malformed_open.group(1)
        attrs = _parse_attributes(attr_part)
        
        artifact_type = attrs.get("type", "").lower() or "markdown"
        title = attrs.get("title", "").strip() or _infer_artifact_title(response_text, user_request)
        
        after_open = response_text[malformed_open.end():].lstrip(">").strip()
        content = re.sub(r'</\s*artifact\s*>', '', after_open, flags=re.IGNORECASE).strip()
        content = _clean_thinking(content)
        
        if content:
            artifacts.append({
                "type": artifact_type if artifact_type in ["markdown", "html", "text"] else "markdown",
                "title": title,
                "content": content
            })
            cleaned_text = f"{before_text}\n\n*[Generated Artifact: {title}]*".strip() if before_text else f"*[Generated Artifact: {title}]*"
            return cleaned_text, artifacts

    # 3. Fallback: Only create an artifact if explicitly asked by the user,
    # or if the response exceeds 900+ words.
    # Simple responses and conversational questions NEVER generate artifacts.
    should_create_artifact = (is_asked and total_words >= 30) or is_over_900

    if should_create_artifact:
        clean_resp = _clean_thinking(response_text)
        lines = clean_resp.strip().splitlines()
        title = _infer_artifact_title(clean_resp, user_request)

        artifact_type = "markdown"
        if "<html" in clean_resp.lower() or "<!doctype html" in clean_resp.lower():
            artifact_type = "html"

        artifacts.append({
            "type": artifact_type,
            "title": title,
            "content": clean_resp.strip()
        })

        intro_lines = []
        for line in lines:
            if line.strip().startswith("#"):
                break
            intro_lines.append(line)
        intro_text = "\n".join(intro_lines).strip()

        common_notice = f"I've created the **{title}** document for you. You can review the complete document in the artifact panel."
        if intro_text and 3 <= len(intro_text.split()) < 60:
            cleaned_text = f"{intro_text}\n\n{common_notice}\n\n*[Generated Artifact: {title}]*"
        else:
            cleaned_text = f"{common_notice}\n\n*[Generated Artifact: {title}]*"
        return cleaned_text, artifacts

    return response_text.strip(), []
