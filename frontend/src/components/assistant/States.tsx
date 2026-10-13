import { AlertCircle, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function LoadingState({ label = "Thinking…" }: { label?: string }) {
  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-xs animate-in fade-in-50 duration-200"
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      <span className="text-foreground/90">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/35 bg-destructive/10 p-3.5 text-sm shadow-xs animate-in fade-in-50 duration-200"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={1.5} />
      <div className="flex-1">
        <p className="font-medium text-foreground">Response failed</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="h-8 gap-1.5 border-destructive/30 text-xs hover:border-destructive/60 hover:bg-destructive/10"
        >
          <RotateCcw className="size-3" strokeWidth={1.5} /> Retry
        </Button>
      )}
    </div>
  );
}
