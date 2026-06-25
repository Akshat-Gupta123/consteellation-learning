import { Lock, Sparkles, Star as StarIcon, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

export type StarStatus = "locked" | "available" | "completed";

const difficultyStyles: Record<Difficulty, string> = {
  Easy: "text-cyan border-cyan/40 bg-cyan/10",
  Medium: "text-primary border-primary/40 bg-primary/10",
  Hard: "text-purple border-purple/40 bg-purple/10",
};

interface StarNodeProps {
  index: number;
  title: string;
  difficulty: Difficulty;
  status: StarStatus;
  isBoss?: boolean;
  align: "left" | "right";
  onClick: () => void;
}

export function StarNode({
  index,
  title,
  difficulty,
  status,
  isBoss,
  align,
  onClick,
}: StarNodeProps) {
  const disabled = status === "locked";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${title} — ${status}`}
      className={cn(
        "group relative flex w-full max-w-md items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300",
        align === "right" ? "ml-auto flex-row-reverse text-right" : "mr-auto",
        status === "locked" && "cursor-not-allowed border-border/40 bg-muted/30 opacity-60",
        status === "available" &&
          "glass border-primary/50 hover:-translate-y-0.5 hover:border-primary",
        status === "completed" && "glass border-gold/50 hover:-translate-y-0.5",
      )}
    >
      {/* Orb */}
      <span
        className={cn(
          "relative grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 transition-all",
          status === "locked" && "border-border bg-muted text-muted-foreground",
          status === "available" && "border-primary bg-primary/15 text-primary animate-pulse-glow",
          status === "completed" && "border-gold bg-gold/15 text-gold glow-gold",
        )}
      >
        {status === "locked" ? (
          <Lock className="h-5 w-5" />
        ) : isBoss ? (
          <Trophy className="h-6 w-6" />
        ) : status === "completed" ? (
          <StarIcon className="h-6 w-6 fill-current" />
        ) : (
          <Sparkles className="h-6 w-6" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {isBoss ? "Final Challenge" : `Star ${index + 1}`}
          </span>
        </span>
        <span className="mt-1 block truncate font-display text-base font-semibold text-foreground">
          {title}
        </span>
        <span
          className={cn(
            "mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            difficultyStyles[difficulty],
          )}
        >
          {difficulty}
        </span>
      </span>
    </button>
  );
}
