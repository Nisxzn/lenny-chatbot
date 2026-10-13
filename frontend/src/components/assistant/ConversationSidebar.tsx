import { Button } from "@/components/ui/button";
import { MessageSquare, PanelLeft, Search, SearchX, SquarePen } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { filterConversations, groupConversations } from "@/lib/conversations";
import { cn } from "@/lib/utils";
import { ConversationItem } from "./ConversationItem";
import { LogoMark } from "./Logo";
import { EmptyState } from "./States";
import { useAssistantStore } from "./store";

export function ConversationSidebar({
  collapsed,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  const { conversations, activeId, newChat, select, rename, remove, hydrated } =
    useAssistantStore();
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const groups = useMemo(
    () => groupConversations(filterConversations(conversations, q)),
    [conversations, q],
  );

  if (collapsed) {
    return (
      <aside className="flex h-full w-16 flex-col items-center gap-4 border-r border-sidebar-border bg-sidebar py-4">
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="size-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
          >
            <PanelLeft className="size-4" strokeWidth={1.5} />
          </Button>
        )}
        <LogoMark className="size-8" />
        <button
          type="button"
          onClick={newChat}
          title="New chat"
          aria-label="New chat"
          className="flex size-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-muted-foreground/80 transition-all duration-150 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-foreground focus-visible:outline-none"
        >
          <SquarePen className="size-4" strokeWidth={1.5} />
        </button>
      </aside>
    );
  }

  const toDelete = conversations.find((c) => c.id === pendingDelete);

  return (
    <aside className="flex h-full w-[285px] max-w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-1.5 min-w-0">
          <LogoMark className="size-7" />
          <div className="min-w-0 leading-tight">
            <p className="font-display text-[15px] font-semibold text-foreground">The Lenny</p>
            <p className="text-[11px] text-muted-foreground">Growth Assistant</p>
          </div>
        </div>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
          >
            <PanelLeft className="size-4" strokeWidth={1.5} />
          </Button>
        )}
      </div>
      <div className="space-y-3 px-4">
        <button
          type="button"
          onClick={() => {
            newChat();
            onNavigate?.();
          }}
          className="group flex h-10 w-full items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[13.5px] font-medium text-foreground/90 transition-all duration-150 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring select-none"
        >
          <SquarePen className="size-4 text-muted-foreground/80 transition-colors group-hover:text-foreground" strokeWidth={1.5} />
          <span>New chat</span>
        </button>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/50" strokeWidth={1.5} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find…"
            aria-label="Find"
            className="h-9.5 w-full rounded-lg border border-white/[0.05] bg-white/[0.02] pr-2.5 pl-8.5 text-[13px] text-foreground placeholder:text-muted-foreground/45 transition-colors focus:border-white/[0.15] focus:bg-white/[0.04] focus:outline-none focus:ring-0"
          />
        </div>
      </div>
      <nav
        className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 scrollbar-thin"
        aria-label="Conversations"
      >
        {hydrated && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center select-none">
            <div className="mb-2.5 flex size-8 items-center justify-center rounded-full bg-white/[0.03] text-muted-foreground/40">
              <MessageSquare className="size-3.5" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium text-foreground/75">No conversations yet</p>
            <p className="mt-1 max-w-[175px] text-[11.5px] leading-relaxed text-muted-foreground/50">
              Start a new chat to ask your first growth question
            </p>
          </div>
        )}
        {conversations.length > 0 && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center select-none">
            <div className="mb-2 flex size-7 items-center justify-center rounded-full bg-white/[0.03] text-muted-foreground/40">
              <SearchX className="size-3.5" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium text-foreground/70">No matches found</p>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.label} className="mb-5">
            <p className="px-2.5 pb-1.5 font-mono text-[10px] font-medium tracking-wider text-muted-foreground/60 uppercase">
              {g.label}
            </p>
            <ul className={cn("space-y-0.5")}>
              {g.items.map((c) => (
                <li key={c.id}>
                  <ConversationItem
                    conv={c}
                    active={c.id === activeId}
                    onSelect={() => {
                      select(c.id);
                      onNavigate?.();
                    }}
                    onRename={(t) => rename(c.id, t)}
                    onDelete={() => setPendingDelete(c.id)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mx-4 mb-4 flex items-center gap-2 border-t border-white/[0.06] pt-3.5 text-xs text-muted-foreground/70 select-none">
        <span className="size-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.35)]" />
        <span className="font-medium tracking-tight text-foreground/80">Growth Workspace</span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground/40">
          v1.0
        </span>
      </div>
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.title}” will be removed from this browser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) remove(pendingDelete);
                setPendingDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
