import { ExternalLink, Headphones } from "lucide-react";
import type { Source } from "@/types/assistant";

/**
 * Validates that a source citation is a real, legitimate reference.
 * Discards mock, demo, placeholder, and fictional entries.
 */
function isLegitimateSource(s: Source): boolean {
  if (!s) return false;

  const rawTitle = (s.title || s.episode_title || s.episode || "").trim();
  const rawSpeaker = (s.speaker || s.guest || "").trim();
  const url = (s.url || "").trim();

  const titleLower = rawTitle.toLowerCase();
  const speakerLower = rawSpeaker.toLowerCase();

  // 1. Exclude any mock, fictional, or demo/placeholder labels
  if (
    titleLower.includes("(mock)") ||
    titleLower.includes("mock") ||
    titleLower.includes("fictional") ||
    titleLower.includes("sample source") ||
    titleLower.includes("demo source") ||
    speakerLower.includes("fictional") ||
    speakerLower.includes("mock") ||
    speakerLower.includes("placeholder")
  ) {
    return false;
  }

  // 2. Exclude generic fallbacks if they lack actual episode info or URL
  if (
    (!rawTitle ||
      titleLower === "lenny's podcast" ||
      titleLower === "unknown" ||
      titleLower === "n/a") &&
    !url &&
    (!rawSpeaker || speakerLower === "lenny rachitsky")
  ) {
    return false;
  }

  // 3. Must have a specific episode title or a valid external URL
  const hasSpecificTitle =
    rawTitle.length > 0 &&
    titleLower !== "lenny's podcast" &&
    titleLower !== "unknown" &&
    titleLower !== "n/a";
  const hasValidUrl = url.startsWith("http://") || url.startsWith("https://");

  return Boolean(hasSpecificTitle || hasValidUrl);
}

export function SourceCitation({ sources }: { sources: Source[] }) {
  if (!sources || !Array.isArray(sources) || sources.length === 0) return null;

  // Filter out any mock, demo, or placeholder sources
  const validSources = sources.filter(isLegitimateSource);

  // If no legitimate source is available, render nothing!
  if (validSources.length === 0) return null;

  return (
    <div className="mt-6 border-t border-border/60 pt-4">
      <div className="mb-3.5 flex items-center gap-2">
        <Headphones className="size-4 text-muted-foreground" />
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Sources ({validSources.length})
        </span>
      </div>
      <ol className="grid gap-2.5">
        {validSources.map((s, i) => {
          const displayTitle =
            s.title || s.episode_title || s.episode || "Lenny's Podcast Transcript";
          const speakerName = (s.speaker || s.guest || "").trim();
          const showSpeaker = speakerName && speakerName.toLowerCase() !== "unknown";

          return (
            <li
              key={s.id || `source-${i}`}
              className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3.5 rounded-lg border border-border bg-card/50 p-3.5 text-xs transition-colors hover:border-border hover:bg-card shadow-2xs"
            >
              <span className="flex size-5.5 shrink-0 items-center justify-center rounded border border-border/70 bg-muted/60 font-mono text-[11px] font-medium text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="break-words text-[14.5px] sm:text-[15px] font-medium leading-relaxed text-foreground">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 transition-colors hover:underline"
                    >
                      <span>{displayTitle}</span>
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </a>
                  ) : (
                    <span>{displayTitle}</span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {showSpeaker && (
                    <span className="inline-flex items-center rounded border border-border/50 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {speakerName}
                    </span>
                  )}
                  {s.timestamp && (
                    <span className="inline-flex items-center rounded border border-border/50 bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {s.timestamp}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
