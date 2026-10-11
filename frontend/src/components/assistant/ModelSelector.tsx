import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Cloud, Cpu } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAssistantStore } from "./store";

export function ModelSelector({
  variant = "default",
  className,
}: {
  variant?: "default" | "composer";
  className?: string;
}) {
  const { model, setModel } = useAssistantStore();
  const [open, setOpen] = useState(false);

  const label =
    model.provider === "ollama"
      ? model.model === "llama3:latest"
        ? "Llama 3"
        : model.model === "qwen3:4b"
          ? "Qwen 3"
          : "Local"
      : "GPT-4o mini";

  const fullLabel =
    model.provider === "ollama"
      ? model.model === "llama3:latest"
        ? "Local (Llama 3)"
        : model.model === "qwen3:4b"
          ? "Local (Qwen3)"
          : "Local (Ollama)"
      : "Cloud (OpenRouter)";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "composer" ? (
          <button
            type="button"
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border border-border/60 bg-foreground/5 px-2.5 text-[12px] font-medium text-muted-foreground transition-all duration-150 hover:border-border hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0 select-none",
              className,
            )}
            aria-label={`Selected provider: ${fullLabel}`}
            title={`Active model: ${fullLabel}. Click to switch.`}
          >
            {model.provider === "ollama" ? (
              <Cpu className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <Cloud className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="max-w-[110px] truncate leading-none">{label}</span>
            <ChevronDown className="size-3 shrink-0 opacity-60" />
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex h-8.5 items-center gap-2 rounded-md border border-border bg-card/60 px-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent sm:px-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              className,
            )}
            aria-label={`Selected provider: ${fullLabel}`}
          >
            {model.provider === "ollama" ? (
              <Cpu className="size-3.5 text-muted-foreground" />
            ) : (
              <Cloud className="size-3.5 text-muted-foreground" />
            )}
            <span className="max-w-[100px] truncate sm:max-w-[180px]">{fullLabel}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side={variant === "composer" ? "top" : "bottom"}
        align={variant === "composer" ? "end" : "end"}
        sideOffset={8}
        className="w-70 border border-border bg-popover p-0 shadow-xl"
      >
        <div className="border-b border-border p-3">
          <p className="text-[13px] font-medium text-foreground">Provider Selection</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Select the backend AI provider.</p>
        </div>
        <div className="p-1.5 space-y-0.5">
          <Button
            variant="ghost"
            onClick={() => {
              setModel({ provider: "ollama", model: "llama3:latest", cloudProviderName: "" });
              setOpen(false);
            }}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] text-foreground/90 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              model.provider === "ollama" &&
                model.model === "llama3:latest" &&
                "bg-accent text-foreground font-medium",
            )}
          >
            <span className="flex items-center gap-2">
              <Cpu className="size-3.5 text-muted-foreground" /> Local (Llama 3 - Fast)
            </span>
            {model.provider === "ollama" && model.model === "llama3:latest" && (
              <Check className="size-3.5 text-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setModel({ provider: "ollama", model: "qwen3:4b", cloudProviderName: "" });
              setOpen(false);
            }}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] text-foreground/90 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              model.provider === "ollama" &&
                model.model === "qwen3:4b" &&
                "bg-accent text-foreground font-medium",
            )}
          >
            <span className="flex items-center gap-2">
              <Cpu className="size-3.5 text-muted-foreground" /> Local (Qwen3 - Reasoning)
            </span>
            {model.provider === "ollama" && model.model === "qwen3:4b" && (
              <Check className="size-3.5 text-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setModel({
                provider: "cloud",
                model: "openai/gpt-4o-mini",
                cloudProviderName: "OpenRouter",
              });
              setOpen(false);
            }}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] text-foreground/90 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              model.provider === "cloud" && "bg-accent text-foreground font-medium",
            )}
          >
            <span className="flex items-center gap-2">
              <Cloud className="size-3.5 text-muted-foreground" /> Cloud (OpenRouter)
            </span>
            {model.provider === "cloud" && <Check className="size-3.5 text-foreground" />}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
