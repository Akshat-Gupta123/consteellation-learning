import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { askNova } from "@/lib/nova.functions";
import type { MCQ, NovaMessage, Star } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NovaPanelProps {
  open: boolean;
  onClose: () => void;
  galaxyName: string;
  star: Star;
  previousStars: string[];
  currentQuestion?: { mcq: MCQ; phase: "step" | "quiz"; index: number; total: number };
}

const HINT_LABELS = ["Gentle nudge", "Go deeper", "Walk me through it"];

export function NovaPanel({ open, onClose, galaxyName, star, previousStars }: NovaPanelProps) {
  const ask = useServerFn(askNova);
  const [messages, setMessages] = useState<NovaMessage[]>([]);
  const [input, setInput] = useState("");
  const [hintLevel, setHintLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Reset conversation when switching lessons
  useEffect(() => {
    setMessages([]);
    setHintLevel(1);
  }, [star.id]);

  async function send(text: string, level: number) {
    if (!text.trim() || loading) return;
    const history = messages;
    const userMsg: NovaMessage = { role: "user", content: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({
        data: {
          lessonTitle: star.title,
          lessonExplanation: star.explanation,
          galaxyName,
          previousStars,
          hintLevel: level,
          history,
          message: text.trim(),
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      setHintLevel((l) => Math.min(l + 1, 3));
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Nova lost the signal for a moment. Please try asking again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-primary/30 bg-sidebar shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-label="Nova AI tutor"
      >
        {/* header */}
        <header className="flex items-center justify-between border-b border-border/60 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary glow-primary">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-sm font-bold">Nova</p>
              <p className="text-xs text-muted-foreground">Hints, never answers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close Nova"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 text-sm text-muted-foreground">
              <p className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-cyan" /> Stuck on{" "}
                <span className="text-foreground">{star.title}</span>?
              </p>
              Ask me anything. I&apos;ll guide your thinking step by step with progressive hints —
              I&apos;ll never just hand you the answer.
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/60 bg-card/70",
                )}
              >
                {m.role === "assistant" ? (
                  <div className="prose-nova space-y-2 leading-relaxed [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-cyan">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-card/70 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-cyan [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-cyan [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-cyan" />
              </div>
            </div>
          )}
        </div>

        {/* quick hints */}
        <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 pt-3">
          {HINT_LABELS.map((label, i) => (
            <button
              key={label}
              disabled={loading}
              onClick={() => send(`Give me a hint for "${star.title}". (${label})`, i + 1)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                hintLevel === i + 1
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/60 hover:text-foreground",
              )}
            >
              Hint {i + 1}: {label}
            </button>
          ))}
        </div>

        {/* composer */}
        <form
          className="flex items-center gap-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(input, hintLevel);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Nova for a hint…"
            className="flex-1 rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </aside>
    </>
  );
}
