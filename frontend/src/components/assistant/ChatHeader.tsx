import { Menu, PanelRightOpen, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "./Logo";
import { useAssistantStore } from "./store";

export function ChatHeader({
  onToggleSidebar,
  onOpenMobileSidebar,
}: {
  onToggleSidebar?: () => void;
  onOpenMobileSidebar: () => void;
}) {
  const { active, artifact, artifacts, artifactOpen, setArtifactOpen, openArtifact } =
    useAssistantStore();

  const currentArtifact = artifact || (artifacts && artifacts.length > 0 ? artifacts[0] : null);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-background/80 px-3 backdrop-blur-md sm:px-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileSidebar}
          aria-label="Open conversations"
          title="Open conversations"
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground md:hidden"
        >
          <Menu className="size-4" />
        </Button>
        <LogoMark className="size-6 shrink-0 md:hidden" />
        <div className="min-w-0">
          <h1 className="truncate text-[15.5px] sm:text-base font-medium tracking-tight text-foreground">
            {active?.title ?? "New chat"}
          </h1>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            The Lenny · Growth Assistant
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {currentArtifact && !artifactOpen && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (currentArtifact) {
                openArtifact(currentArtifact);
              } else {
                setArtifactOpen(true);
              }
            }}
            aria-label="Open artifact viewer"
            title="Open artifact viewer"
            className="h-8.5 gap-1.5 border border-border bg-card/60 px-3 text-[13px] font-medium text-foreground hover:bg-card hover:border-border/90"
          >
            <PanelRightOpen className="size-3.5" />
            <span>View Artifact</span>
          </Button>
        )}
        {currentArtifact && artifactOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setArtifactOpen(false)}
            aria-label="Close artifact viewer"
            title="Close artifact viewer"
            className="h-8.5 gap-1.5 px-3 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <PanelRightClose className="size-3.5" />
            <span className="hidden sm:inline">Close Artifact</span>
          </Button>
        )}
      </div>
    </header>
  );
}
