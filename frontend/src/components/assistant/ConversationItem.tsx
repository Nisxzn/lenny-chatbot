import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/assistant";

export function ConversationItem({
  conv,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  conv: Conversation;
  active: boolean;
  onSelect: () => void;
  onRename: (t: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conv.title);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={input}
        aria-label="Rename conversation"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          onRename(title);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onRename(title);
            setEditing(false);
          }
          if (e.key === "Escape") {
            setTitle(conv.title);
            setEditing(false);
          }
        }}
        className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[13.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-lg border text-[13.5px] transition-all duration-150",
        active
          ? "border-white/[0.08] bg-white/[0.07] text-foreground font-medium"
          : "border-transparent text-sidebar-foreground/75 hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className="flex h-9.5 min-w-0 flex-1 items-center truncate px-2.5 text-left text-[13.5px] font-normal focus-visible:outline-none"
      >
        <span className="truncate">{conv.title}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${conv.title}`}
            className="mr-1 size-7 shrink-0 rounded p-1 text-muted-foreground opacity-100 sm:opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-34 border border-border bg-popover p-1 shadow-md"
        >
          <DropdownMenuItem
            onSelect={() => {
              setTitle(conv.title);
              setTimeout(() => setEditing(true), 0);
            }}
            className="text-[13px]"
          >
            <Pencil className="size-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={onDelete}
            className="text-[13px] text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="size-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
