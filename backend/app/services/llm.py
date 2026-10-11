import os
import logging
import time
from abc import ABC, abstractmethod
from typing import List, Dict, Tuple, Optional, Any

# Import pi-coding-agent modules
from pi_agent.agent import Agent, AgentConfig
from pi_agent.sandbox import Sandbox
from pi_agent.tools.registry import ToolRegistry
from pi_agent.llm import build_provider, OpenAIProvider, NeutralMessage
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMProvider(ABC):
    @abstractmethod
    def generate_response(self, system_prompt: str, messages: List[Dict[str, str]]) -> Tuple[str, str, str]:
        """
        Generates an LLM response.
        Returns: (response_text, provider_name, model_name)
        """
        pass

    @abstractmethod
    def generate_streamed_response(self, system_prompt: str, messages: List[Dict[str, str]], on_event: callable) -> Tuple[str, str, str]:
        """
        Generates an LLM response with streaming events.
        """
        pass

_TOOL_SUPPORT_CACHE: Dict[str, bool] = {}
_INSTALLED_MODELS_CACHE: Optional[set] = None

def check_native_tool_support(provider_type: str, model: str, base_url: str = "") -> bool:
    """
    Checks whether the target provider and model natively support function/tool calling.
    llama3 (base) does not have tool calling templates and returns HTTP 400 if tools are sent.
    """
    if provider_type in ["cloud", "anthropic", "openrouter"]:
        return True
        
    model_lower = (model or "").lower()
    cache_key = f"{provider_type}:{model_lower}"
    if cache_key in _TOOL_SUPPORT_CACHE:
        return _TOOL_SUPPORT_CACHE[cache_key]

    # Base Llama 3 models in Ollama do not have tool calling templates in their Modelfile
    if model_lower == "llama3" or model_lower.startswith("llama3:") or "llama3:latest" in model_lower:
        _TOOL_SUPPORT_CACHE[cache_key] = False
        return False
    if any(m in model_lower for m in ["llama3.1", "llama3.2", "llama3.3", "qwen2.5", "qwen3", "mistral"]):
        _TOOL_SUPPORT_CACHE[cache_key] = True
        return True

    # Probe Ollama capabilities via /api/show if reachable
    try:
        import httpx
        show_url = base_url.replace("/v1/", "").replace("/v1", "").rstrip("/") + "/api/show"
        with httpx.Client(timeout=1.5) as client:
            resp = client.post(show_url, json={"model": model})
            if resp.status_code == 200:
                data = resp.json()
                caps = data.get("capabilities", [])
                template = data.get("template", "")
                result = "tools" in caps or "{{ .Tools }}" in template or "{{.Tools}}" in template
                _TOOL_SUPPORT_CACHE[cache_key] = result
                return result
    except Exception:
        pass

    _TOOL_SUPPORT_CACHE[cache_key] = False
    return False

def is_writing_request(text: str) -> bool:
    """Detects whether a user prompt requests creating a formal essay, document, or artifact."""
    from app.services.writing import is_artifact_requested
    return is_artifact_requested(text)

class OllamaCompatibleProvider(OpenAIProvider):
    """
    OpenAI-compatible provider for Ollama that guarantees safety when interacting with
    models (such as llama3:latest) that do not support native OpenAI-format tool calling.
    
    When supports_tools is False, tool declarations are omitted from the payload so
    Ollama executes the standard conversational loop without returning HTTP 400.
    """
    def __init__(self, model: str, base_url: str, supports_tools: bool = False, max_tokens: Optional[int] = None):
        tokens = max_tokens or settings.CHAT_MAX_TOKENS
        super().__init__(model=model, api_key="ollama", base_url=base_url, max_tokens=tokens)
        self.supports_tools = supports_tools

    def _payload(
        self, system: str, messages: List[NeutralMessage], tools: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        payload = super()._payload(system, messages, tools)
        if not self.supports_tools or not tools:
            payload.pop("tools", None)
            
        # Performance optimizations for Ollama:
        # 1. keep_alive="1h" prevents frequent model unloads
        # 2. num_predict limits generation length for fast response times
        # 3. num_ctx=2048 halves KV cache footprint for 2x faster prompt evaluation
        # 4. temperature=0.6 reduces sampling latency
        extra_body = payload.setdefault("extra_body", {})
        extra_body["keep_alive"] = "1h"
        extra_body["options"] = {
            "num_predict": self.max_tokens or 768,
            "num_ctx": 1800,
            "temperature": 0.6,
            "top_p": 0.9,
        }
        return payload

    @staticmethod
    def _consume_stream(chunks: Any, on_delta: Any) -> Any:
        from pi_agent.agent import AssistantResponse, Usage, ToolCall
        from pi_agent.llm import _coerce_args
        text_parts: List[str] = []
        frags: Dict[int, Dict[str, str]] = {}
        usage = Usage(0, 0)
        stop_reason = ""
        in_reasoning = False

        for chunk in chunks:
            cu = getattr(chunk, "usage", None)
            if cu is not None:
                usage = Usage(cu.prompt_tokens, cu.completion_tokens)
            choices = getattr(chunk, "choices", None) or []
            if not choices:
                continue
            choice = choices[0]
            if getattr(choice, "finish_reason", None):
                stop_reason = choice.finish_reason
            delta = getattr(choice, "delta", None)
            if delta is None:
                continue

            # Forward Ollama reasoning tokens if present
            reasoning = getattr(delta, "reasoning", None) or getattr(delta, "reasoning_content", None)
            if not reasoning and hasattr(delta, "model_extra") and delta.model_extra:
                reasoning = delta.model_extra.get("reasoning") or delta.model_extra.get("reasoning_content")

            if reasoning:
                if not in_reasoning:
                    in_reasoning = True
                    on_delta("<think>")
                on_delta(reasoning)
            elif in_reasoning:
                in_reasoning = False
                on_delta("</think>")

            content = getattr(delta, "content", None)
            if content:
                text_parts.append(content)
                on_delta(content)

            for tc in getattr(delta, "tool_calls", None) or []:
                frag = frags.setdefault(getattr(tc, "index", 0), {"id": "", "name": "", "args": ""})
                if getattr(tc, "id", None):
                    frag["id"] = tc.id
                fn = getattr(tc, "function", None)
                if fn is not None:
                    if getattr(fn, "name", None):
                        frag["name"] = fn.name
                    if getattr(fn, "arguments", None):
                        frag["args"] += fn.arguments

        if in_reasoning:
            on_delta("</think>")

        tool_calls = [
            ToolCall(id=frags[i]["id"], name=frags[i]["name"], args=_coerce_args(frags[i]["args"]))
            for i in sorted(frags)
        ]
        return AssistantResponse(
            text="".join(text_parts),
            tool_calls=tool_calls,
            usage=usage,
            stop_reason=stop_reason,
        )

class PiFrameworkProvider(LLMProvider):
    def __init__(self, provider_type: str, model: Optional[str] = None):
        self.provider_type = provider_type.lower()
        if self.provider_type == "cloud":
            # Guard against passing the provider name 'openrouter' as a model ID
            if not model or model.strip().lower() == "openrouter":
                self.model = settings.OPENROUTER_MODEL
            else:
                self.model = model.strip()
            api_key = os.getenv("OPENROUTER_API_KEY") or settings.OPENROUTER_API_KEY
            if not api_key:
                raise ValueError("OPENROUTER_API_KEY is not set.")
            self.pi_provider = build_provider(provider="openrouter", model=self.model, api_key=api_key)
            self.display_provider = "cloud (openrouter)"
            self.supports_tools = True
        elif self.provider_type == "anthropic":
            self.model = model or settings.ANTHROPIC_MODEL_NAME
            api_key = os.getenv("ANTHROPIC_API_KEY") or settings.ANTHROPIC_API_KEY
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY is not set.")
            self.pi_provider = build_provider(provider="anthropic", model=self.model, api_key=api_key)
            self.display_provider = "cloud (anthropic)"
            self.supports_tools = True
        else:
            # Fallback to Ollama local
            if not model or model.strip().lower() in ["local", "ollama"]:
                self.model = settings.OLLAMA_MODEL_NAME
            else:
                self.model = model.strip()
            ollama_base_url = settings.OLLAMA_BASE_URL.rstrip('/')
            if not ollama_base_url.endswith("/v1"):
                ollama_v1 = f"{ollama_base_url}/v1/"
            else:
                ollama_v1 = f"{ollama_base_url}/"

            # Check if model is actually installed (cached to eliminate per-request HTTP latency)
            global _INSTALLED_MODELS_CACHE
            if _INSTALLED_MODELS_CACHE is None or not any(
                m == self.model or m.startswith(self.model + ":") or self.model.startswith(m + ":")
                for m in _INSTALLED_MODELS_CACHE
            ):
                try:
                    import httpx
                    tags_url = ollama_base_url.replace("/v1", "") + "/api/tags"
                    with httpx.Client(timeout=2.0) as client:
                        resp = client.get(tags_url)
                        if resp.status_code == 200:
                            models = set(m.get("name") for m in resp.json().get("models", []))
                            _INSTALLED_MODELS_CACHE = models
                except httpx.RequestError:
                    logger.warning("Could not connect to Ollama to check models.")
                except Exception:
                    pass

            if _INSTALLED_MODELS_CACHE is not None:
                has_model = any(
                    m == self.model or m.startswith(self.model + ":") or self.model.startswith(m + ":")
                    or (":" not in self.model and m.startswith(self.model + ":"))
                    for m in _INSTALLED_MODELS_CACHE
                )
                if not has_model and len(_INSTALLED_MODELS_CACHE) > 0:
                    raise ValueError(f"Model '{self.model}' is not installed in Ollama. Please manually install it via 'ollama pull {self.model}'.")

            self.supports_tools = check_native_tool_support(self.provider_type, self.model, ollama_base_url)
            self.pi_provider = OllamaCompatibleProvider(
                model=self.model,
                base_url=ollama_v1,
                supports_tools=self.supports_tools
            )
            self.display_provider = "local (ollama)"
            
    def generate_response(self, system_prompt: str, messages: List[Dict[str, str]]) -> Tuple[str, str, str]:
        if self.provider_type == "local":
            system_prompt = system_prompt + "\n\nAnswer directly and concisely. Do NOT generate internal thinking tokens or <think> blocks."
        agent_init_start = time.perf_counter()
        from app.services.writing import writing_tool
        config = AgentConfig(system_prompt=system_prompt)
        sandbox = Sandbox(".")
        
        last_msg = messages[-1] if messages else None
        user_input = last_msg.get("content", "") if last_msg else "Hello"
        is_writing = is_writing_request(user_input)
        
        # Configure output limits dynamically: sensible limits for ordinary chat and longer limits for essays
        target_max_tokens = settings.ESSAY_MAX_TOKENS if is_writing else settings.CHAT_MAX_TOKENS
        if hasattr(self.pi_provider, "max_tokens"):
            self.pi_provider.max_tokens = target_max_tokens

        # For local providers, do not bind writing_tool as native function calling.
        # Instead, let the model generate XML markup directly as instructed by WRITING_SKILL_PROMPT.
        # This ensures all generated text streams live to the UI in real time.
        if self.supports_tools and self.provider_type != "local":
            registry = ToolRegistry([writing_tool])
        else:
            registry = ToolRegistry([])
        
        # Format conversation history
        neutral_messages = []
        history = messages[:-1]
        
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            neutral_messages.append({"role": role, "content": content})
            
        agent = Agent(
            config=config, 
            provider=self.pi_provider, 
            registry=registry, 
            sandbox=sandbox, 
            messages=neutral_messages
        )
        agent_init_time = time.perf_counter() - agent_init_start
        logger.info(f"TIMING: [llm] Agent Init Latency: {agent_init_time:.4f}s")
        
        inference_start = time.perf_counter()
        try:
            response_text = agent.run(user_input)
        except Exception as e:
            logger.error(f"Pi Coding Agent failed: {e}")
            raise RuntimeError(f"Pi Agent execution failed: {e}") from e

        inference_time = time.perf_counter() - inference_start
        logger.info(f"TIMING: [llm] Inference Latency: {inference_time:.4f}s")

        return response_text, self.display_provider, self.model

    def generate_streamed_response(self, system_prompt: str, messages: List[Dict[str, str]], on_event: callable) -> Tuple[str, str, str]:
        if self.provider_type == "local":
            system_prompt = system_prompt + "\n\nAnswer directly and concisely. Do NOT generate internal thinking tokens or <think> blocks."
        agent_init_start = time.perf_counter()
        from app.services.writing import writing_tool
        config = AgentConfig(system_prompt=system_prompt, stream=True)
        sandbox = Sandbox(".")
        
        last_msg = messages[-1] if messages else None
        user_input = last_msg.get("content", "") if last_msg else "Hello"
        is_writing = is_writing_request(user_input)

        target_max_tokens = settings.ESSAY_MAX_TOKENS if is_writing else settings.CHAT_MAX_TOKENS
        if hasattr(self.pi_provider, "max_tokens"):
            self.pi_provider.max_tokens = target_max_tokens
        
        if self.supports_tools and self.provider_type != "local":
            registry = ToolRegistry([writing_tool])
        else:
            registry = ToolRegistry([])
        
        neutral_messages = []
        history = messages[:-1]
        
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            neutral_messages.append({"role": role, "content": content})
            
        agent = Agent(
            config=config, 
            provider=self.pi_provider, 
            registry=registry, 
            sandbox=sandbox, 
            messages=neutral_messages
        )
        agent.on_event = on_event
        
        agent_init_time = time.perf_counter() - agent_init_start
        logger.info(f"TIMING: [llm] Agent Init Latency (streamed): {agent_init_time:.4f}s")
        
        inference_start = time.perf_counter()
        try:
            response_text = agent.run(user_input)
        except Exception as e:
            logger.error(f"Pi Coding Agent failed (streamed): {e}")
            raise RuntimeError(f"Pi Agent execution failed: {e}") from e

        inference_time = time.perf_counter() - inference_start
        logger.info(f"TIMING: [llm] Inference Latency (streamed): {inference_time:.4f}s")

        return response_text, self.display_provider, self.model

def get_llm_provider(provider_type: Optional[str] = None, model: Optional[str] = None) -> LLMProvider:
    if not provider_type:
        provider_type = settings.DEFAULT_LLM_PROVIDER
    provider_type = provider_type.lower().strip()
    return PiFrameworkProvider(provider_type, model=model)

