import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Code2, FileText, PanelRightOpen, Loader2, Sparkles, ChevronDown } from "lucide-react";
import type { Message } from "@/types/assistant";
import { MarkdownPreview } from "./MarkdownPreview";
import { SourceCitation } from "./SourceCitation";
import { useAssistantStore } from "./store";
import { LogoMark } from "./Logo";
import { cn } from "@/lib/utils";

/**
 * Separates internal model reasoning/thinking tokens (<think>...</think> or ...</think>)
 * from the actual user-facing response, mirroring ChatGPT and DeepSeek.
 */
function parseThinkingAndAnswer(rawContent: string): { thinking: string; answer: string } {
  if (!rawContent) return { thinking: "", answer: "" };

  // Case 1: Contains explicit <think> opening tag
  if (rawContent.includes("<think>")) {
    const parts = rawContent.split("<think>");
    const beforeThink = (parts[0] || "").trim();
    const afterOpen = parts.slice(1).join("<think>");

    if (afterOpen.includes("</think>")) {
      const [thinkingPart, ...afterCloseParts] = afterOpen.split("</think>");
      const afterClose = afterCloseParts.join("</think>").trim();
      const combinedAnswer = beforeThink ? `${beforeThink}\n\n${afterClose}`.trim() : afterClose;
      return {
        thinking: thinkingPart.trim(),
        answer: combinedAnswer,
      };
    } else {
      // Actively streaming thinking (unclosed <think>)
      return {
        thinking: afterOpen.trim(),
        answer: beforeThink,
      };
    }
  }

  // Case 2: Contains </think> without an opening <think> (e.g. Qwen Ollama modelfile template)
  if (rawContent.includes("</think>")) {
    const [thinkingPart, ...afterCloseParts] = rawContent.split("</think>");
    return {
      thinking: thinkingPart.trim(),
      answer: afterCloseParts.join("</think>").trim(),
    };
  }

  // Case 3: Clean response without reasoning tokens
  return {
    thinking: "",
    answer: rawContent,
  };
}

/**
 * ChatGPT-style Collapsible Thinking Block
 * Accurately tracks thinking duration and renders "Thought for a few seconds"
 * or "Thought for {X} seconds" like ChatGPT reasoning models.
 */
function ThinkingBlock({ thinking, isGenerating }: { thinking: string; isGenerating: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        const secs = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        setDuration(secs);
      }, 1000);
      return () => clearInterval(interval);
    } else if (duration === null) {
      const totalSecs = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      setDuration(totalSecs);
    }
  }, [isGenerating, duration]);

  const label = useMemo(() => {
    if (isGenerating) {
      return duration && duration > 1 ? `Thinking for ${duration}s…` : "Thinking…";
    }
    if (!duration || duration <= 3) {
      return "Thought for a few seconds";
    }
    return `Thought for ${duration} seconds`;
  }, [isGenerating, duration]);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-expanded={isOpen}
      >
        {isGenerating ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <Sparkles className="size-3.5 text-muted-foreground transition-transform duration-150 group-hover:scale-105" />
        )}
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "size-3 text-muted-foreground transition-transform duration-150",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="mt-2.5 max-h-72 overflow-y-auto rounded-lg border border-border/70 bg-card/60 p-3.5 text-[12.5px] leading-relaxed text-muted-foreground font-mono shadow-2xs">
          <div className="whitespace-pre-wrap break-words pr-1">{thinking}</div>
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message }: { message: Message }) {
  const { openArtifact } = useAssistantStore();
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm border border-border/70 bg-user-surface px-5 py-3.5 text-[16.5px] leading-relaxed text-foreground shadow-2xs">
          {message.content}
        </div>
      </div>
    );
  }

  const done = message.status === "done";
  const artifact = message.artifact;
  const parsed = parseThinkingAndAnswer(message.content || "");
  const thinking = (message.thinking || parsed.thinking).trim();

  // Clean single-shot display: When actively reasoning, keep focus on thinking.
  // When the answer is ready or done, render the response clearly in single shot.
  const isActivelyThinking = !done && Boolean(thinking) && !parsed.answer;
  const rawDisplay = done
    ? (parsed.answer || message.content)
    : (!isActivelyThinking ? (parsed.answer || message.content || "") : "");

  let displayAnswer = rawDisplay;

  // When an artifact is attached, do not dump the full artifact body into the chat conversation screen.
  // Show concise common text/intro in the conversation, keeping the artifact content in its dedicated section.
  if (artifact && done) {
    let cleanChat = rawDisplay
      .replace(/\*?\[Generated Artifact:[^\]]*\]\*?/gi, "")
      .trim();

    if (
      !cleanChat ||
      cleanChat === artifact.content.trim() ||
      (cleanChat.length > 80 && artifact.content.includes(cleanChat)) ||
      (cleanChat.startsWith("#") && cleanChat.length >= 100)
    ) {
      cleanChat = `I've created the **${artifact.title}** document for you. You can review and edit the complete document in the artifact panel on the right.`;
    }
    displayAnswer = cleanChat;
  }

  return (
    <div className="flex gap-3.5">
      <LogoMark className="mt-0.5 size-6.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {/* Active status indicator (shown only when generating and no thinking block present) */}
        {!done && message.statusMsg && !thinking && (
          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1 text-[12.5px] font-medium text-muted-foreground shadow-2xs">
            <Loader2 className="size-3.5 animate-spin text-foreground" />
            <span>{message.statusMsg}</span>
          </div>
        )}

        {/* Collapsible Thinking Process */}
        {thinking && <ThinkingBlock thinking={thinking} isGenerating={!done && !displayAnswer} />}

        {/* 1. Show the actual response text */}
        {displayAnswer && <MarkdownPreview content={displayAnswer} />}

        {/* 2. Then show the artifact if available */}
        {artifact && (
          <Button
            variant="outline"
            onClick={() => openArtifact(artifact)}
            className="group mt-4.5 flex h-auto w-full max-w-lg items-center gap-3.5 whitespace-normal rounded-xl border border-border bg-card/60 p-4 text-left shadow-2xs transition-colors hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span className="flex size-10 items-center justify-center rounded-lg border border-border/60 bg-muted/60 text-foreground">
              {artifact.type === "html" ? (
                <Code2 className="size-4.5" />
              ) : (
                <FileText className="size-4.5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] sm:text-[16px] font-medium text-foreground tracking-tight">
                {artifact.title}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {artifact.type === "html" ? "HTML page" : "Markdown document"}
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              View <PanelRightOpen className="size-4" />
            </span>
          </Button>
        )}

        {/* 3. Show the source section last (only when done) */}
        {done && message.sources && message.sources.length > 0 && (
          <div className="mt-5">
            <SourceCitation sources={message.sources} />
          </div>
        )}
      </div>
    </div>
  );
}
