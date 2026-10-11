import type {
  Artifact,
  Message,
  ModelSelection,
  Source,
  Conversation as FrontendConversation,
} from "@/types/assistant";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function fetchWithValidation(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMsg = "API Error";
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorMsg;
    } catch {
      errorMsg = response.statusText;
    }
    throw new ApiError(response.status, errorMsg);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export interface SendMessageResult {
  stream: AsyncGenerator<string>;
  sources: Source[];
  artifact?: Artifact | undefined;
  id?: string;
  conversationId?: string;
  conversationTitle?: string;
}

export interface AssistantApi {
  health(): Promise<{ ok: boolean; mode: "mock" | "live" }>;
  listModels(): Promise<{ ollama: string[] }>;
  selectModel(sel: ModelSelection): Promise<void>;
  sendMessage(input: {
    sessionId: string;
    content: string;
    history: Message[];
    model: ModelSelection;
    signal?: AbortSignal;
  }): Promise<SendMessageResult>;
  listConversations(): Promise<FrontendConversation[]>;
  createConversation(title?: string): Promise<FrontendConversation>;
  renameConversation(conversationId: string, title: string): Promise<FrontendConversation>;
  deleteConversation(conversationId: string): Promise<void>;
  getMessages(conversationId: string): Promise<Message[]>;
  getArtifacts(conversationId: string): Promise<Artifact[]>;
  getArtifact(artifactId: string): Promise<Artifact>;
}

interface BackendConversation {
  id: string;
  title: string | null;
  updated_at: string;
}

interface BackendMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  artifact?: BackendArtifact | null;
  artifacts?: BackendArtifact[];
  citations?: BackendCitation[];
}

interface BackendArtifact {
  id: string;
  title: string;
  artifact_type: "markdown" | "html";
  content: string;
}

interface BackendCitation {
  episode_title?: string;
  url?: string;
  speaker?: string;
  timestamp?: string;
  content?: string;
}

export const api: AssistantApi = {
  async health() {
    return { ok: true, mode: "live" };
  },

  async listModels() {
    return { ollama: [] }; // The backend model selector will be handled manually via provider flags
  },

  async selectModel() {
    /* UI-only */
  },

  async listConversations() {
    const data = await fetchWithValidation("/conversations");
    return data.map((c: BackendConversation) => ({
      id: c.id,
      title: c.title || "New Chat",
      updatedAt: new Date(c.updated_at).getTime(),
      messages: [],
    }));
  },

  async createConversation(title?: string) {
    const data = await fetchWithValidation("/conversations", {
      method: "POST",
      body: JSON.stringify({ title: title || "New Chat" }),
    });
    return {
      id: data.id,
      title: data.title || "New Chat",
      updatedAt: new Date(data.updated_at).getTime(),
      messages: [],
    };
  },

  async renameConversation(conversationId: string, title: string) {
    const data = await fetchWithValidation(`/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
    return {
      id: data.id,
      title: data.title,
      updatedAt: new Date(data.updated_at).getTime(),
      messages: [],
    };
  },

  async deleteConversation(conversationId: string) {
    try {
      await fetchWithValidation(`/conversations/${conversationId}`, {
        method: "DELETE",
      });
    } catch (e: any) {
      if (e?.status === 404) return;
      throw e;
    }
  },

  async getMessages(conversationId: string) {
    let data: BackendMessage[] = [];
    try {
      const res = await fetchWithValidation(`/conversations/${conversationId}/messages`);
      if (Array.isArray(res)) data = res;
    } catch (e: any) {
      if (e?.status === 404) return [];
      throw e;
    }
    return data.map((m: BackendMessage) => {
      const art =
        m.artifact || (m.artifacts && m.artifacts.length > 0 ? m.artifacts[0] : undefined);
      const sources: Source[] = (m.citations || [])
        .filter((c: BackendCitation) => {
          if (!c) return false;
          const title = (c.episode_title || "").trim();
          const speaker = (c.speaker || "").trim();
          const lower = `${title} ${speaker}`.toLowerCase();
          if (
            lower.includes("mock") ||
            lower.includes("fictional") ||
            title.toLowerCase() === "unknown" ||
            title.toLowerCase() === "n/a"
          ) {
            return false;
          }
          return Boolean(title || c.url);
        })
        .map((c: BackendCitation, idx: number) => ({
          id: `citation-${m.id}-${idx}`,
          title: c.episode_title?.trim() || "",
          guest: c.speaker?.trim() || "",
          speaker: c.speaker,
          episode: c.episode_title?.trim() || "",
          episode_title: c.episode_title,
          timestamp: c.timestamp,
          url: c.url,
          content: c.content,
        }))
        .filter((s: Source) => Boolean(s.title || s.url));
      return {
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: new Date(m.created_at).getTime(),
        status: "done" as const,
        sources,
        artifact: art
          ? {
              id: art.id,
              title: art.title,
              type: art.artifact_type || "markdown",
              content: art.content,
            }
          : undefined,
      };
    });
  },

  async getArtifacts(conversationId: string) {
    try {
      const data = await fetchWithValidation(`/conversations/${conversationId}/artifacts`);
      if (!Array.isArray(data)) return [];
      return data.map((a: BackendArtifact) => ({
        id: a.id,
        title: a.title,
        type: a.artifact_type,
        content: a.content,
      }));
    } catch (e: any) {
      if (e?.status === 404) return [];
      throw e;
    }
  },

  async getArtifact(artifactId: string) {
    const a = await fetchWithValidation(`/artifacts/${artifactId}`);
    return {
      id: a.id,
      title: a.title,
      type: a.artifact_type,
      content: a.content,
    };
  },

  async sendMessage({ sessionId, content, model, signal }) {
    const providerStr = model.provider === "ollama" ? "local" : "cloud";
    const isValidUuid =
      Boolean(sessionId) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);

    // Send message to actual backend with stream=true
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: content,
        conversation_id: isValidUuid ? sessionId : null,
        provider: providerStr,
        model: model.model,
        stream: true, // Request streaming
      }),
      signal,
    });

    if (!response.ok) {
      let errorMsg = "API Error";
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch {
        errorMsg = response.statusText;
      }
      throw new ApiError(response.status, errorMsg);
    }

    // Fallback if the backend does not stream (e.g. content-type is json or body is absent)
    if (!response.body || response.headers?.get?.("content-type")?.includes("application/json")) {
      const responseData = await response.json();
      const sources: Source[] = (responseData.citations || [])
        .filter((c: BackendCitation) => {
          if (!c) return false;
          const title = (c.episode_title || "").trim();
          const speaker = (c.speaker || "").trim();
          const lower = `${title} ${speaker}`.toLowerCase();
          if (
            lower.includes("mock") ||
            lower.includes("fictional") ||
            title.toLowerCase() === "unknown" ||
            title.toLowerCase() === "n/a"
          ) {
            return false;
          }
          return Boolean(title || c.url);
        })
        .map((c: BackendCitation, index: number) => ({
          id: `citation-${index}`,
          title: c.episode_title?.trim() || "",
          guest: c.speaker?.trim() || "",
          speaker: c.speaker,
          episode: c.episode_title?.trim() || "",
          episode_title: c.episode_title,
          timestamp: c.timestamp,
          url: c.url,
          content: c.content,
        }))
        .filter((s: Source) => Boolean(s.title || s.url));
      let artifact: Artifact | undefined = undefined;
      if (responseData.artifacts && responseData.artifacts.length > 0) {
        const a = responseData.artifacts[0] as BackendArtifact;
        artifact = {
          id: a.id,
          title: a.title,
          type: a.artifact_type,
          content: a.content,
        };
      }
      async function* streamString() {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        yield responseData.response_text || "";
      }
      return {
        stream: streamString(),
        sources,
        artifact,
        id: responseData.assistant_message_id,
        conversationId: responseData.conversation_id,
        conversationTitle: responseData.conversation_title,
      };
    }

    async function* stream() {
      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      try {
        while (true) {
          if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") return;
              try {
                const parsed = JSON.parse(data);
                yield parsed;
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    return {
      stream: stream() as unknown as AsyncGenerator<string>, // the store now expects any
      sources: [],
      artifact: undefined,
    };
  },
};
