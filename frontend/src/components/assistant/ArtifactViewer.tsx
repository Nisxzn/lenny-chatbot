import { Button } from "@/components/ui/button";
import { Check, Code2, Copy, Download, Eye, FileText, Layers, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HtmlPreview } from "./HtmlPreview";
import { MarkdownPreview } from "./MarkdownPreview";
import { EmptyState } from "./States";
import { useAssistantStore } from "./store";

export function ArtifactViewer({ className }: { className?: string }) {
  const { artifact, artifacts, openArtifact, setArtifactOpen } = useAssistantStore();
  const [tab, setTab] = useState<"preview" | "source">("preview");
  const [copied, setCopied] = useState(false);

  if (!artifact) {
    return (
      <section className={cn("flex flex-col bg-background", className)}>
        <EmptyState icon={<FileText className="size-6" />} title="No artifact selected">
          Documents and pages the assistant creates appear here.
        </EmptyState>
      </section>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const download = () => {
    const ext = artifact.type === "html" ? "html" : "md";
    const blob = new Blob([artifact.content], {
      type: artifact.type === "html" ? "text/html" : "text/markdown",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const iconBtn =
    "size-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors rounded-md";

  return (
    <section
      aria-label="Artifact viewer"
      className={cn("flex min-h-0 min-w-0 flex-col bg-sidebar", className)}
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/60 text-foreground">
            {artifact.type === "html" ? (
              <Code2 className="size-3.5" />
            ) : (
              <FileText className="size-3.5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15.5px] sm:text-base font-medium tracking-tight text-foreground">
              {artifact.title}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {artifact.type === "html" ? "HTML / CSS" : "Markdown"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setArtifactOpen(false)}
          aria-label="Close artifact viewer"
          title="Close artifact viewer"
          className={iconBtn}
        >
          <X className="size-4" />
        </Button>
      </header>

      {/* Multiple artifacts selector tab bar if conversation has multiple artifacts */}
      {artifacts.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-sidebar/80 px-4 py-1.5 text-xs scrollbar-thin">
          <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <Layers className="size-3.5" /> Artifacts ({artifacts.length}):
          </span>
          <div className="flex gap-1">
            {artifacts.map((a) => (
              <Button
                key={a.id}
                variant="ghost"
                size="sm"
                onClick={() => openArtifact(a)}
                className={cn(
                  "h-6.5 max-w-[160px] truncate px-2.5 text-xs transition-colors rounded",
                  a.id === artifact.id
                    ? "border border-border/70 bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title={a.title}
              >
                {a.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div
          role="tablist"
          aria-label="Artifact view"
          className="flex gap-0.5 rounded-md border border-border/60 bg-background/60 p-0.5"
        >
          {(["preview", "source"] as const).map((t) => (
            <Button
              variant="ghost"
              size="sm"
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls="artifact-content"
              onClick={() => setTab(t)}
              className={cn(
                "h-7 gap-1.5 px-3 text-[12.5px] capitalize transition-colors rounded",
                tab === t
                  ? "bg-accent text-foreground font-medium shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "preview" ? <Eye className="size-3.5" /> : <Code2 className="size-3.5" />}
              {t}
            </Button>
          ))}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={copy}
            aria-label="Copy artifact"
            title="Copy artifact"
            className={iconBtn}
          >
            {copied ? (
              <Check className="size-3.5 text-foreground" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={download}
            aria-label="Download artifact"
            title="Download artifact"
            className={iconBtn}
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>
      <div
        id="artifact-content"
        role="tabpanel"
        className="min-h-0 flex-1 overflow-auto overscroll-contain p-4 sm:p-5 scrollbar-thin"
      >
        {!artifact.content ? (
          <EmptyState icon={<FileText className="size-6" />} title="No content">
            This artifact does not contain any content.
          </EmptyState>
        ) : tab === "source" ? (
          <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground/90">
            <code>{artifact.content}</code>
          </pre>
        ) : artifact.type === "html" ? (
          <HtmlPreview html={artifact.content} title={artifact.title} />
        ) : (
          <div className="min-h-full px-2 py-3 text-sm sm:px-4">
            <MarkdownPreview content={artifact.content} />
          </div>
        )}
      </div>
    </section>
  );
}
