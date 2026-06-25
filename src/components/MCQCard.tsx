import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCQ } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface MCQCardProps {
  question: MCQ;
  /** Called with isCorrect=true exactly once per card lifetime. Use to award IC. */
  onAnswered?: (isCorrect: boolean, selectedIndex: number) => void;
  /** Called when the user presses Continue after seeing feedback. */
  onContinue?: () => void;
  continueLabel?: string;
}

/**
 * A Brilliant-style MCQ:
 *  - 3-4 options (provided by lesson generator)
 *  - On submit, reveals correctness + explanation
 *  - User can re-try wrong answers (they only earn IC on first-try correct)
 *  - Continue button unlocked only after a correct answer
 */
export function MCQCard({ question, onAnswered, onContinue, continueLabel = "Continue" }: MCQCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [solvedFirstTry, setSolvedFirstTry] = useState<boolean | null>(null);
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);

  function submit() {
    if (selected === null) return;
    const correct = selected === question.correctIndex;
    setRevealed(true);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (correct) {
      if (solvedFirstTry === null) setSolvedFirstTry(nextAttempts === 1);
      setSolved(true);
      onAnswered?.(true, selected);
    } else {
      if (solvedFirstTry === null) setSolvedFirstTry(false);
      onAnswered?.(false, selected);
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
          const showState = revealed && (isSelected || (solved && isCorrect));
          return (
            <button
              key={i}
              type="button"
              onClick={() => !revealed && setSelected(i)}
              disabled={revealed}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                !revealed && isSelected && "border-primary bg-primary/10 text-foreground",
                !revealed && !isSelected && "border-border/60 bg-card/40 hover:border-primary/60 hover:bg-card/60",
                showState && isCorrect && "border-gold bg-gold/10 text-gold",
                showState && !isCorrect && "border-destructive bg-destructive/10 text-destructive",
                revealed && !showState && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                  !revealed && "border-current",
                  showState && isCorrect && "border-gold bg-gold/20",
                  showState && !isCorrect && "border-destructive bg-destructive/20",
                )}
              >
                {showState && isCorrect ? <Check className="h-3.5 w-3.5" /> : showState && !isCorrect ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
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
            solved && selected === question.correctIndex
              ? "border-gold/40 bg-gold/5 text-foreground"
              : "border-destructive/40 bg-destructive/5 text-foreground",
          )}
        >
          <p className="mb-1 font-semibold">
            {selected === question.correctIndex ? "Correct" : "Not quite"}
          </p>
          <p className="text-muted-foreground">{explanation}</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!revealed && (
          <Button onClick={submit} disabled={selected === null} className="glow-primary">
            Check answer
          </Button>
        )}
        {revealed && !solved && (
          <Button variant="secondary" onClick={tryAgain}>
            Try again
          </Button>
        )}
        {revealed && solved && (
          <Button onClick={onContinue} className="glow-gold">
            {continueLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
