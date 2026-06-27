import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCQ } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { playCorrect, playWrong } from "@/lib/sfx";

const MAX_ATTEMPTS = 2;

interface MCQCardProps {
  question: MCQ;
  /**
   * Fired once per attempt. `attempt` is 1-indexed (1 = first try).
   * Use it to scale IC (e.g. full on attempt 1, partial on attempt 2).
   */
  onAnswered?: (isCorrect: boolean, selectedIndex: number, attempt: number) => void;
  /** Called when the user presses Continue after the card is resolved. */
  onContinue?: () => void;
  continueLabel?: string;
}

/**
 * MCQ with a strict 2-attempt cap.
 *  - Attempt 1 wrong → can retry once; wrong option stays greyed out.
 *  - Attempt 2 wrong → card is revealed as "Out of tries" and the
 *    correct answer is shown. Continue unlocks so the user moves on.
 *  - First-try correct earns full IC; second-try correct earns less.
 */
export function MCQCard({ question, onAnswered, onContinue, continueLabel = "Continue" }: MCQCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<Set<number>>(new Set());

  const outOfTries = !solved && attempts >= MAX_ATTEMPTS;
  const resolved = solved || outOfTries;

  function submit() {
    if (selected === null || resolved) return;
    const correct = selected === question.correctIndex;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setRevealed(true);
    if (correct) {
      setSolved(true);
      playCorrect();
      onAnswered?.(true, selected, nextAttempts);
    } else {
      setWrongPicks((s) => {
        const n = new Set(s);
        n.add(selected);
        return n;
      });
      playWrong();
      onAnswered?.(false, selected, nextAttempts);
    }
  }

  function tryAgain() {
    setRevealed(false);
    setSelected(null);
  }

  const explanation =
    selected === null
      ? ""
      : selected === question.correctIndex
        ? question.correctExplanation
        : question.wrongExplanations?.[selected] || question.correctExplanation;

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <p className="mb-4 text-base font-medium leading-relaxed text-foreground">{question.stem}</p>

      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === question.correctIndex;
          const wasWrong = wrongPicks.has(i);
          // After resolution, always reveal the correct answer.
          const showCorrect = resolved && isCorrect;
          const showWrong = (revealed && isSelected && !isCorrect) || wasWrong;
          const isLocked = wasWrong || resolved;
          return (
            <button
              key={i}
              type="button"
              onClick={() => !isLocked && !revealed && setSelected(i)}
              disabled={isLocked || revealed}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                !revealed && isSelected && "border-primary bg-primary/10 text-foreground",
                !revealed && !isSelected && !wasWrong && "border-border/60 bg-card/40 hover:border-primary/60 hover:bg-card/60",
                showCorrect && "border-gold bg-gold/10 text-gold",
                showWrong && "border-destructive bg-destructive/10 text-destructive",
                wasWrong && !revealed && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                  !showCorrect && !showWrong && "border-current",
                  showCorrect && "border-gold bg-gold/20",
                  showWrong && "border-destructive bg-destructive/20",
                )}
              >
                {showCorrect ? <Check className="h-3.5 w-3.5" /> : showWrong ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 leading-relaxed">{opt}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div
          className={cn(
            "mt-4 rounded-xl border p-4 text-sm leading-relaxed",
            solved
              ? "border-gold/40 bg-gold/5 text-foreground"
              : outOfTries
                ? "border-destructive/40 bg-destructive/5 text-foreground"
                : "border-border/60 bg-card/40 text-foreground",
          )}
        >
          <p className="mb-1 font-semibold">
            {solved
              ? attempts === 1
                ? "Correct — first try"
                : "Correct"
              : outOfTries
                ? "Out of tries"
                : "Not quite — one try left"}
          </p>
          <p className="text-muted-foreground">
            {outOfTries
              ? question.correctExplanation
              : explanation}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!revealed && !resolved && (
          <Button onClick={submit} disabled={selected === null} className="glow-primary">
            Check answer
          </Button>
        )}
        {revealed && !solved && !outOfTries && (
          <Button variant="secondary" onClick={tryAgain}>
            Try again
          </Button>
        )}
        {resolved && (
          <Button onClick={onContinue} className={solved ? "glow-gold" : ""}>
            {continueLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
