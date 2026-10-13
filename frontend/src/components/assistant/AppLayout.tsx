import { ArrowUpRight, CircleDollarSign, Compass, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { STARTER_QUESTIONS } from "@/mocks/data";
import { ArtifactViewer } from "./ArtifactViewer";
import { ChatHeader } from "./ChatHeader";
import { ChatMessage } from "./ChatMessage";
import { ConversationSidebar } from "./ConversationSidebar";
import { LogoMark } from "./Logo";
import { MessageComposer } from "./MessageComposer";
import { ErrorState, LoadingState } from "./States";
import { useAssistantStore } from "./store";
import MorphOrb from "@/components/ui/ai-thinking-orb-and-input";

function Welcome() {
  const { send } = useAssistantStore();
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);
  const icons = [Compass, TrendingUp, Sparkles, CircleDollarSign];
  const topics = ["Product-market fit", "Retention", "Onboarding", "Pricing"];
  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col px-5 pt-12 pb-8 sm:px-8 sm:pt-20">
      <LogoMark className="size-10" />
      <p className="mt-6 font-mono text-[13px] text-muted-foreground">{greeting}</p>
      <h2 className="mt-2 max-w-lg text-[29px] font-semibold tracking-tight text-foreground sm:text-[32px]">
        What growth challenge are we working on?
      </h2>
      <p className="mt-3 max-w-md text-[15px] sm:text-base leading-relaxed text-muted-foreground">
        A little clarity for your next big decision.
      </p>
      <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
        {STARTER_QUESTIONS.slice(0, 4).map((q, i) => {
          const Icon = icons[i] ?? Compass;
          return (
            <Button
              key={q}
              variant="outline"
              onClick={() => send(q)}
              className="group h-auto min-h-24 flex-col items-start gap-2.5 whitespace-normal rounded-xl border border-border bg-card/50 p-4 text-left shadow-2xs transition-colors hover:border-border hover:bg-card"
            >
              <span className="flex w-full items-center gap-2 text-[12.5px] text-muted-foreground">
                <Icon
                  className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground"
                  strokeWidth={1.5}
                />
                <span>{topics[i]}</span>
                <ArrowUpRight
                  className="ml-auto size-3 opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={1.5}
                />
              </span>
              <span className="text-[13.5px] font-normal leading-relaxed text-foreground/90">
                {q}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function ChatWorkspace() {
  const { active, phase, error, retry, hydrated } = useAssistantStore();
  const end = useRef<HTMLDivElement>(null);
  const msgs = active?.messages ?? [];
  const lastMsgContent = msgs[msgs.length - 1]?.content;
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, lastMsgContent, phase, error]);

  if (!hydrated)
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingState label="Loading workspace…" />
      </div>
    );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth scrollbar-thin">
      {msgs.length === 0 ? (
        <Welcome />
      ) : (
        <div className="mx-auto max-w-[800px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 pb-10">
          {msgs.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
          {phase === "loading" && (
            <div className="pl-10">
              <LoadingState />
            </div>
          )}
          {error && <ErrorState message={error} onRetry={retry} />}
          <div ref={end} />
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const { artifactOpen, setArtifactOpen, newChat, active, activeId, send, error, hydrated } =
    useAssistantStore();
  const [narrow, setNarrow] = useState(false);
  const [isMorphing, setIsMorphing] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1099px)");
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setIsMorphing(false);
  }, [activeId]);

  useEffect(() => {
    if (error) {
      setIsMorphing(false);
    }
  }, [error]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsMorphing(false);
        newChat();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newChat]);

  const hasMessages = (active?.messages.length ?? 0) > 0;
  const showMorphOrb = !hasMessages || isMorphing;

  if (!hydrated) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <LoadingState label="Loading workspace…" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <div className="hidden md:block">
        <ConversationSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[290px] p-0 [&>button]:hidden">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          <ConversationSidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <ChatHeader onOpenMobileSidebar={() => setMobileOpen(true)} />
        {showMorphOrb ? (
          <div className="relative min-h-0 flex-1 w-full overflow-hidden">
            <MorphOrb
              onSubmit={(text) => {
                setIsMorphing(true);
                return new Promise<void>((resolve) => {
                  let resolved = false;
                  const onStart = () => {
                    if (!resolved) {
                      resolved = true;
                      resolve();
                    }
                  };
                  void send(text, onStart);
                  // Safety timer: if response doesn't start in 12s, resolve anyway
                  setTimeout(onStart, 12000);
                });
              }}
              onTransition={() => {
                setIsMorphing(false);
              }}
            />
          </div>
        ) : (
          <>
            <ChatWorkspace />
            <MessageComposer />
          </>
        )}
      </main>
      {artifactOpen && !narrow && (
        <ArtifactViewer className="w-[43%] min-w-[380px] max-w-[720px] shrink-0 border-l border-border" />
      )}
      {narrow && (
        <Sheet open={artifactOpen} onOpenChange={setArtifactOpen}>
          <SheetContent side="bottom" className="h-[94dvh] p-0 [&>button]:hidden">
            <SheetTitle className="sr-only">Artifact</SheetTitle>
            <ArtifactViewer className="h-full" />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
