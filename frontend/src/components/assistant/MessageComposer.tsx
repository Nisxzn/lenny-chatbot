import { useEffect, useRef, useState } from "react";
import { useAssistantStore } from "./store";
import { ModelSelector } from "./ModelSelector";
import "@/components/ui/ai-thinking-orb-and-input.css";

export function MessageComposer() {
  const { send, phase, stop, activeId, model, error } = useAssistantStore();
  const [value, setValue] = useState("");
  const [isMultiline, setIsMultiline] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const timers = useRef<{ typing?: number; shake?: number }>({});
  const busy = phase !== "idle";

  useEffect(() => {
    ref.current?.focus();
  }, [activeId, phase]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const nextH = Math.min(el.scrollHeight, 180);
    el.style.height = nextH + "px";
    setIsMultiline(nextH > 44);
  }, [value]);

  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      window.clearTimeout(currentTimers.typing);
      window.clearTimeout(currentTimers.shake);
    };
  }, []);

  const shake = () => {
    const box = boxRef.current;
    if (!box) return;
    box.removeAttribute("data-shake");
    void box.offsetWidth;
    box.setAttribute("data-shake", "");
    window.clearTimeout(timers.current.shake);
    timers.current.shake = window.setTimeout(() => box.removeAttribute("data-shake"), 260);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const box = boxRef.current;
    if (box) {
      box.setAttribute("data-typing", "");
      window.clearTimeout(timers.current.typing);
      timers.current.typing = window.setTimeout(() => box.removeAttribute("data-typing"), 300);
    }
  };

  const submit = () => {
    if (busy) return;
    const text = value.trim();
    if (!text) {
      shake();
      return;
    }
    send(text);
    setValue("");
  };

  const ready = value.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-[800px] shrink-0 px-4 pt-2 pb-5 sm:px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {error && (
        <p className="mb-2 text-center text-xs font-medium text-destructive">{error}</p>
      )}
      <div className="mo-composer-root">
        <div ref={boxRef} className={`mo-composer-box ${isMultiline ? "mo-multiline" : ""}`}>
          <div className="mo-composer-underglow" aria-hidden="true" />
          <div className="mo-composer-surface" aria-hidden="true">
            <div className="mo-composer-aurora">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="mo-composer-ring" aria-hidden="true" />

          <div className="mo-composer-row">
            <svg
              className="mo-composer-spark"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9.5 4.5C9.5 8.92 6.42 12 2 12C6.42 12 9.5 15.08 9.5 19.5C9.5 15.08 12.58 12 17 12C12.58 12 9.5 8.92 9.5 4.5Z" />
              <path d="M18 3.5C18 5.43 16.43 7 14.5 7C16.43 7 18 8.57 18 10.5C18 8.57 19.57 7 21.5 7C19.57 7 18 5.43 18 3.5Z" />
            </svg>

            <label htmlFor="composer" className="sr-only">
              Ask anything
            </label>
            <textarea
              id="composer"
              ref={ref}
              rows={1}
              value={value}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="What's on your mind?"
              className="mo-composer-field"
            />

            <div className="mo-composer-actions">
              <ModelSelector variant="composer" />
              {busy ? (
                <button
                  type="button"
                  onClick={stop}
                  title="Stop generating"
                  aria-label="Stop generating"
                  className="mo-composer-btn mo-composer-stop"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-3.5"
                    aria-hidden="true"
                  >
                    <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  title="Send message"
                  aria-label="Send message"
                  data-ready={ready ? "" : undefined}
                  disabled={!ready}
                  className="mo-composer-btn"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 18.5V5.5" />
                    <path d="m5.5 12 6.5-6.5 6.5 6.5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
