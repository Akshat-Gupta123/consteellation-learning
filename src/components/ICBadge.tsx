import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Animated Interstellar Currency badge.
 * - Shows balance.
 * - When the value increases, pulses gold and renders a floating "+N IC" popup
 *   for ~1.4s. This is the global IC reward feedback.
 */
interface ICBadgeProps {
  ic: number;
  className?: string;
}

export function ICBadge({ ic, className }: ICBadgeProps) {
  const [prev, setPrev] = useState(ic);
  const [pop, setPop] = useState<{ key: number; amount: number } | null>(null);

  useEffect(() => {
    if (ic > prev) {
      const diff = ic - prev;
      setPop({ key: Date.now(), amount: diff });
      const t = setTimeout(() => setPop(null), 1400);
      return () => clearTimeout(t);
    }
    setPrev(ic);
  }, [ic, prev]);

  useEffect(() => {
    if (pop) {
      // sync displayed prev to current after animation
      const t = setTimeout(() => setPrev(ic), 1400);
      return () => clearTimeout(t);
    }
  }, [pop, ic]);

  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold transition-all",
        pop && "glow-gold scale-105",
        className,
      )}
      aria-label={`${ic} Interstellar Currency`}
    >
      <Coins className="h-3.5 w-3.5" />
      <span className="tabular-nums">{ic.toLocaleString()}</span>
      <span className="opacity-70">IC</span>
      {pop && (
        <span
          key={pop.key}
          className="ic-popup pointer-events-none absolute -top-2 right-1 -translate-y-full text-xs font-bold text-gold"
        >
          +{pop.amount}
        </span>
      )}
    </div>
  );
}
