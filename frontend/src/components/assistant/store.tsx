import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/services/api";
import type { Artifact, Conversation, Message, ModelSelection, Source } from "@/types/assistant";
import { generateConversationTitle } from "@/lib/conversations";
import { toast } from "sonner";

interface RawCitation {
  episode_title?: string;
  title?: string;
  speaker?: string;
  guest?: string;
  episode?: string;
  timestamp?: string;
  url?: string;
  content?: string;
}

function mapRawCitations(rawList?: RawCitation[]): Source[] {
  if (!rawList || !Array.isArray(rawList)) return [];
  return rawList
    .filter((c) => {
      if (!c) return false;
      const title = (c.episode_title || c.title || "").trim();
      const speaker = (c.speaker || c.guest || "").trim();
      const lower = `${title} ${speaker}`.toLowerCase();

      // Discard mock, fictional, or placeholder entries
      if (
        lower.includes("mock") ||
        lower.includes("fictional") ||
        title.toLowerCase() === "unknown" ||
        title.toLowerCase() === "n/a"
      ) {
        return false;
      }

      // Must have an actual identifiable title or valid URL
      return Boolean(title || c.url);
    })
    .map((c, i) => {
      const title = (c.episode_title || c.title || "").trim();
      const guest = (c.speaker || c.guest || "").trim();
      return {
        id: `citation-${i}-${c.timestamp || ""}`,
        title,
        guest,
        speaker: c.speaker,
        episode: (c.episode_title || c.episode || "").trim(),
        episode_title: c.episode_title,
        timestamp: c.timestamp,
        url: c.url,
        content: c.content,
      };
    })
    .filter((s) => Boolean(s.title || s.url));
}

type Phase = "idle" | "loading" | "generating";

interface Store {
  hydrated: boolean;
  conversations: Conversation[];
  activeId: string | null;
  active: Conversation | null;
  model: ModelSelection;
  phase: Phase;
  error: string | null;
  artifact: Artifact | null;
  artifacts: Artifact[];
  artifactOpen: boolean;
  newChat(): void;
  select(id: string): void;
  rename(id: string, title: string): void;
  remove(id: string): void;
  send(text: string, onResponseStart?: () => void): Promise<void> | void;
  retry(): void;
  stop(): void;
  setModel(m: ModelSelection): void;
  openArtifact(a: Artifact): void;
  setArtifactOpen(v: boolean): void;
}

const Ctx = createContext<Store | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [model, setModelState] = useState<ModelSelection>(() => {
    try {
      const saved = localStorage.getItem("lenny_model_selection");
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore localStorage errors
    }
    return {
      provider: "ollama",
      model: "llama3:latest",
      cloudProviderName: "OpenRouter",
    };
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [artifactOpen, setArtifactOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastPrompt = useRef<string>("");

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const list = await api.listConversations();
        if (mounted) {
          setConversations(list);
          if (list.length > 0) {
            setActiveId(list[0].id);
          } else {
            const newConv = await api.createConversation();
            setConversations([newConv]);
            setActiveId(newConv.id);
          }
        }
      } catch (err) {
        if (mounted) {
          toast.error("Failed to connect to backend.");
        }
      } finally {
        if (mounted) setHydrated(true);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch messages and artifacts whenever activeId changes
  useEffect(() => {
    if (!activeId) {
      setArtifact(null);
      setArtifacts([]);
      return;
    }

    let mounted = true;

    // Fetch conversation artifacts
    api
      .getArtifacts(activeId)
      .then((arts) => {
        if (mounted) {
          setArtifacts(arts);
          if (arts.length > 0) {
            // Keep the newest artifact ready
            setArtifact(arts[0]);
          } else {
            setArtifact(null);
          }
        }
      })
      .catch(() => {
        // Safe fallback if conversation has no artifacts or error
        if (mounted) {
          setArtifacts([]);
        }
      });

    // Fetch messages if not yet loaded
    const activeConv = conversations.find((c) => c.id === activeId);
    if (activeConv && activeConv.messages.length === 0) {
      api
        .getMessages(activeId)
        .then((msgs) => {
          if (mounted) {
            setConversations((list) =>
              list.map((c) => (c.id === activeId ? { ...c, messages: msgs } : c)),
            );
            // If messages have artifacts, ensure store has the latest
            const msgWithArt = msgs
              .slice()
              .reverse()
              .find((m) => m.artifact);
            if (msgWithArt?.artifact) {
              setArtifact((current) => current || msgWithArt.artifact!);
            }
          }
        })
        .catch(() => {
          if (mounted) toast.error("Failed to load messages.");
        });
    }

    return () => {
      mounted = false;
    };
  }, [activeId, conversations]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  const patch = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((list) => list.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
  }, []);

  const run = useCallback(
    async (
      convId: string | null,
      text: string,
      history: Message[],
      onResponseStart?: () => void,
    ) => {
      setError(null);
      setPhase("loading");
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      let hasStarted = false;
      const notifyStart = () => {
        if (!hasStarted) {
          hasStarted = true;
          onResponseStart?.();
        }
      };

      // optimistic user msg
      const userMsgId = Math.random().toString();
      const optimisticMsg: Message = {
        id: userMsgId,
        role: "user",
        content: text,
        createdAt: Date.now(),
      };

      let currentConvId = convId;
      const meaningfulTitle = generateConversationTitle(text);

      if (currentConvId && conversations.some((c) => c.id === currentConvId)) {
        patch(currentConvId, (c) => {
          // If conversation still has placeholder or untitled title, update it immediately to meaningful title
          const shouldUpdateTitle =
            !c.title ||
            c.title.trim().toLowerCase() === "new chat" ||
            c.title.trim().toLowerCase() === "untitled" ||
            c.messages.length === 0;

          return {
            ...c,
            title: shouldUpdateTitle ? meaningfulTitle : c.title,
            messages: [...c.messages, optimisticMsg],
          };
        });
      } else {
        // Create an optimistic local conversation if none exists
        const tempId = `conv-${Date.now()}`;
        currentConvId = tempId;
        const newConv: Conversation = {
          id: tempId,
          title: meaningfulTitle,
          updatedAt: Date.now(),
          messages: [optimisticMsg],
        };
        setConversations((l) => [newConv, ...l]);
        setActiveId(tempId);
      }

      try {
        const res = await api.sendMessage({
          sessionId: currentConvId,
          content: text,
          history,
          model,
          signal: ctrl.signal,
        });

        // If backend returned a new conversationId or conversationTitle, sync it
        const finalConvId = res.conversationId || currentConvId;
        const finalTitle = res.conversationTitle || meaningfulTitle;

        if (finalConvId !== currentConvId || res.conversationTitle) {
          setConversations((l) =>
            l.map((c) =>
              c.id === currentConvId
                ? {
                    ...c,
                    id: finalConvId,
                    title: res.conversationTitle || c.title || finalTitle,
                  }
                : c,
            ),
          );
          setActiveId(finalConvId);
          currentConvId = finalConvId;
        }

        setPhase("generating");

        const msgId = res.id || Math.random().toString();
        patch(currentConvId, (c) => ({
          ...c,
          messages: [
            ...c.messages,
            {
              id: msgId,
              role: "assistant",
              content: "",
              status: "generating",
              statusMsg: "Preparing your question...",
              createdAt: Date.now(),
              sources: res.sources,
              artifact: res.artifact,
            },
          ],
        }));

        for await (const chunk of res.stream) {
          if (typeof chunk === "string") {
            notifyStart();
            // Fallback for non-streaming strings
            patch(currentConvId, (c) => ({
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, content: m.content + chunk, status: "generating" } : m,
              ),
            }));
          } else if (chunk.type === "init") {
            const mappedSources = mapRawCitations(chunk.citations);
            patch(currentConvId, (c) => ({
              ...c,
              id: chunk.conversationId || c.id,
              title: chunk.conversationTitle || c.title,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, sources: mappedSources } : m,
              ),
            }));
            if (chunk.conversationId && chunk.conversationId !== currentConvId) {
              setConversations((l) =>
                l.map((conv) =>
                  conv.id === currentConvId
                    ? {
                        ...conv,
                        id: chunk.conversationId,
                        title: chunk.conversationTitle || conv.title,
                      }
                    : conv,
                ),
              );
              setActiveId(chunk.conversationId);
              currentConvId = chunk.conversationId;
            }
          } else if (chunk.type === "status") {
            patch(currentConvId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, statusMsg: chunk.message } : m,
              ),
            }));
          } else if (chunk.type === "think_start") {
            notifyStart();
            patch(currentConvId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId
                  ? { ...m, statusMsg: "Thinking...", thinking: m.thinking || "" }
                  : m,
              ),
            }));
          } else if (chunk.type === "think_delta") {
            notifyStart();
            patch(currentConvId, (c) => ({
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map((m) =>
                m.id === msgId
                  ? { ...m, thinking: (m.thinking || "") + chunk.text }
                  : m,
              ),
            }));
          } else if (chunk.type === "think_end") {
            notifyStart();
            patch(currentConvId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId
                  ? { ...m, statusMsg: "Generating your answer..." }
                  : m,
              ),
            }));
          } else if (chunk.type === "text_delta") {
            notifyStart();
            patch(currentConvId, (c) => ({
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map((m) =>
                m.id === msgId
                  ? { ...m, content: m.content + chunk.text, status: "generating" }
                  : m,
              ),
            }));
          } else if (chunk.type === "error") {
            notifyStart();
            patch(currentConvId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      status: "error",
                      statusMsg: undefined,
                      content:
                        m.content || `Error: ${chunk.message || "Failed to generate response."}`,
                    }
                  : m,
              ),
            }));
            setError(chunk.message || "Something went wrong.");
            toast.error(chunk.message || "Something went wrong.");
          } else if (chunk.type === "done") {
            notifyStart();
            const mappedSources = mapRawCitations(chunk.data.citations);
            const rawArt = chunk.data.artifacts?.[0];
            const art: Artifact | undefined = rawArt
              ? {
                  id: rawArt.id,
                  title: rawArt.title,
                  type: rawArt.type || rawArt.artifact_type || "markdown",
                  content: rawArt.content,
                }
              : undefined;

            patch(currentConvId, (c) => ({
              ...c,
              title: chunk.data?.conversationTitle || c.title,
              messages: c.messages.map((m) => {
                if (m.id !== msgId) return m;
                const finalContent = art
                  ? (chunk.data?.content?.trim() || `I've created the **${art.title}** document for you.`)
                  : (m.content && m.content.trim().length > (chunk.data?.content?.trim().length || 0)
                      ? m.content
                      : chunk.data?.content || m.content);
                return {
                  ...m,
                  id: chunk.data.id || msgId,
                  content: finalContent,
                  statusMsg: undefined,
                  status: "done",
                  artifact: art,
                  sources: mappedSources.length > 0 ? mappedSources : m.sources,
                };
              }),
            }));
            if (art) {
              setArtifact(art);
              setArtifacts((prev) => [art, ...prev.filter((a) => a.id !== art.id)]);
              setArtifactOpen(true);
            }
          }
        }

        // Final fallback done marking
        patch(currentConvId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  status: m.status === "error" ? "error" : "done",
                  statusMsg: undefined,
                }
              : m,
          ),
        }));

        // The artifact is now updated through the "done" event in the stream
      } catch (e) {
        notifyStart();
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message || "Something went wrong.");
          toast.error((e as Error).message || "Something went wrong.");
        }
      } finally {
        notifyStart();
        setPhase("idle");
        abortRef.current = null;
      }
    },
    [conversations, model, patch],
  );

  const newChat = useCallback(async () => {
    stop();
    try {
      const c = await api.createConversation();
      setConversations((l) => [c, ...l]);
      setActiveId(c.id);
      setError(null);
      setArtifact(null);
      setArtifacts([]);
      setArtifactOpen(false);
    } catch (err) {
      toast.error("Failed to create conversation");
    }
  }, [stop]);

  const send = useCallback(
    (raw: string, onResponseStart?: () => void): Promise<void> => {
      const text = raw.trim();
      if (!text || phase !== "idle") return Promise.resolve();
      lastPrompt.current = text;
      const id = activeId;
      let history: Message[] = [];

      if (id) {
        const cur = conversations.find((c) => c.id === id);
        history = cur?.messages ?? [];
      }
      return run(id, text, history, onResponseStart);
    },
    [activeId, conversations, phase, run],
  );

  const retry = useCallback(() => {
    if (activeId && lastPrompt.current)
      void run(activeId, lastPrompt.current, active?.messages ?? []);
  }, [active, activeId, run]);

  const value = useMemo<Store>(
    () => ({
      hydrated,
      conversations,
      activeId,
      active,
      model,
      phase,
      error,
      artifact,
      artifacts,
      artifactOpen,
      newChat,
      select: (id) => {
        stop();
        setActiveId(id);
        setError(null);
        setArtifact(null);
        setArtifacts([]);
        setArtifactOpen(false);
      },
      rename: async (id, title) => {
        const nextTitle = title.trim();
        if (!nextTitle) return;
        // Optimistically update
        patch(id, (c) => ({ ...c, title: nextTitle }));
        try {
          await api.renameConversation(id, nextTitle);
        } catch (e) {
          toast.error("Failed to rename conversation.");
        }
      },
      remove: async (id) => {
        try {
          await api.deleteConversation(id);
          setConversations((list) => {
            const nextList = list.filter((c) => c.id !== id);
            if (activeId === id) {
              // Wait for React to settle before creating a new chat if needed
              if (nextList.length === 0) {
                setTimeout(() => newChat(), 0);
              } else {
                setActiveId(nextList[0].id);
              }
            }
            return nextList;
          });
        } catch (e) {
          toast.error("Failed to delete chat");
        }
      },
      send,
      retry,
      stop,
      setModel: (m) => {
        setModelState(m);
        try {
          localStorage.setItem("lenny_model_selection", JSON.stringify(m));
        } catch {
          // Ignore localStorage write error
        }
      },
      openArtifact: async (a) => {
        // ensure we have content
        if (!a.content) {
          try {
            const fullArtifact = await api.getArtifact(a.id);
            setArtifact(fullArtifact);
          } catch (e) {
            toast.error("Failed to fetch artifact details");
            return;
          }
        } else {
          setArtifact(a);
        }
        setArtifactOpen(true);
      },
      setArtifactOpen,
    }),
    [
      hydrated,
      conversations,
      activeId,
      active,
      model,
      phase,
      error,
      artifact,
      artifacts,
      artifactOpen,
      newChat,
      stop,
      send,
      retry,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAssistantStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useAssistantStore must be used within AssistantProvider");
  return s;
}
