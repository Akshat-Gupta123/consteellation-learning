import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bot, CheckCircle2, Loader2, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { getGalaxyById } from "@/lib/galaxy.functions";
import { awardIC, completeStar, getOrGenerateLesson } from "@/lib/lesson.functions";
import { IC_REWARDS } from "@/lib/garage-catalog";
import type { Galaxy, Lesson, Star } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MCQCard } from "@/components/MCQCard";
import { NovaPanel } from "@/components/NovaPanel";

export const Route = createFileRoute("/_authenticated/lesson/$galaxyId/$starId")({
  component: LessonScreen,
});

type Phase = "core" | "steps" | "quiz" | "summary" | "complete";

const NOVA_QUIZ_LIMIT = 2;

function LessonScreen() {
  const { galaxyId, starId } = useParams({
    from: "/_authenticated/lesson/$galaxyId/$starId",
  });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const galaxyQuery = useQuery({
    queryKey: ["galaxy", galaxyId],
    queryFn: () => getGalaxyById({ data: { id: galaxyId } }),
  });
  const lessonQuery = useQuery({
    queryKey: ["lesson", galaxyId, starId],
    queryFn: () => getOrGenerateLesson({ data: { galaxyId, starId } }),
    enabled: Boolean(galaxyQuery.data),
  });

  const award = useServerFn(awardIC);
  const complete = useServerFn(completeStar);

  const awardMutation = useMutation({
    mutationFn: async (amount: number) => award({ data: { amount } }),
    onSuccess: ({ ic }) => {
      qc.setQueryData(["profile"], (old: { ic: number } | undefined) =>
        old ? { ...old, ic } : old,
      );
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => complete({ data: { galaxyId, starId } }),
    onSuccess: (res) => {
      qc.setQueryData(["profile"], (old: { ic: number } | undefined) =>
        old ? { ...old, ic: res.newBalance } : old,
      );
      qc.invalidateQueries({ queryKey: ["galaxy", galaxyId] });
      if (res.galaxyComplete) {
        toast.success("Galaxy complete! +" + res.awardedIC + " IC bonus", {
          icon: "🌌",
        });
      } else {
        toast.success("Star completed. +" + res.awardedIC + " IC");
      }
    },
  });

  const [phase, setPhase] = useState<Phase>("core");
  const [stepIndex, setStepIndex] = useState(0);
  const [stepAnswered, setStepAnswered] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [novaOpen, setNovaOpen] = useState(false);
  const [novaUsedOnQuestion, setNovaUsedOnQuestion] = useState<Set<number>>(new Set());

  useEffect(() => {
    setPhase("core");
    setStepIndex(0);
    setStepAnswered(false);
    setQuizIndex(0);
    setQuizCorrect(0);
    setNovaUsedOnQuestion(new Set());
  }, [starId]);

  if (galaxyQuery.isLoading) return <Centered>Calibrating the lesson…</Centered>;
  if (galaxyQuery.isError || !galaxyQuery.data)
    return (
      <Centered>
        <p className="mb-4">This lesson could not be loaded.</p>
        <Link to="/" className="text-primary underline-offset-4 hover:underline">
          Return home
        </Link>
      </Centered>
    );

  const galaxy = galaxyQuery.data.galaxy as Galaxy;
  const star = galaxy.stars.find((s) => s.id === starId);
  if (!star) {
    return (
      <Centered>
        <p className="mb-4">This star isn&apos;t part of the galaxy.</p>
        <Link to="/galaxy/$galaxyId" params={{ galaxyId }} className="text-primary underline-offset-4 hover:underline">
          Back to galaxy
        </Link>
      </Centered>
    );
  }
  const alreadyDone = galaxyQuery.data.progress.completed.includes(starId);

  if (lessonQuery.isLoading) {
    return (
      <LessonShell galaxy={galaxy} star={star} onBack={() => navigate({ to: "/galaxy/$galaxyId", params: { galaxyId } })}>
        <div className="grid place-items-center py-20 text-sm text-muted-foreground">
          <Loader2 className="mb-3 h-6 w-6 animate-spin text-primary" />
          Nova is composing your lesson…
        </div>
      </LessonShell>
    );
  }
  if (lessonQuery.isError || !lessonQuery.data) {
    return (
      <LessonShell galaxy={galaxy} star={star} onBack={() => navigate({ to: "/galaxy/$galaxyId", params: { galaxyId } })}>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
          <p className="mb-3 font-semibold">Nova lost the signal.</p>
          <Button variant="secondary" onClick={() => lessonQuery.refetch()}>
            Try again
          </Button>
        </div>
      </LessonShell>
    );
  }

  const lesson = lessonQuery.data as Lesson;
  const totalQuiz = lesson.quiz.length;
  const novaUsesLeft = NOVA_QUIZ_LIMIT - novaUsedOnQuestion.size;
  const canAskNovaNow =
    phase !== "quiz" || novaUsedOnQuestion.has(quizIndex) || novaUsesLeft > 0;

  function handleAnswered(isCorrect: boolean) {
    if (isCorrect) {
      awardMutation.mutate(IC_REWARDS.CORRECT_ANSWER);
    }
  }

  function handleStepAnswered(isCorrect: boolean) {
    setStepAnswered(true);
    handleAnswered(isCorrect);
  }

  function handleQuizAnswered(isCorrect: boolean) {
    if (isCorrect) setQuizCorrect((c) => c + 1);
    handleAnswered(isCorrect);
  }

  function advanceFromStep() {
    setStepAnswered(false);
    if (stepIndex < lesson.steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setPhase("quiz");
    }
  }

  function advanceFromQuiz() {
    if (quizIndex < totalQuiz - 1) {
      setQuizIndex((i) => i + 1);
    } else {
      setPhase("summary");
    }
  }

  function finishLesson() {
    completeMutation.mutate();
    setPhase("complete");
  }

  function openNova() {
    if (phase === "quiz") {
      if (novaUsedOnQuestion.has(quizIndex)) {
        setNovaOpen(true);
        return;
      }
      if (novaUsesLeft <= 0) {
        toast.error(`Nova can only assist on ${NOVA_QUIZ_LIMIT} quiz questions per lesson.`);
        return;
      }
      setNovaUsedOnQuestion((s) => new Set(s).add(quizIndex));
    }
    setNovaOpen(true);
  }

  const previousStars = galaxy.stars
    .slice(0, galaxy.stars.findIndex((s) => s.id === starId))
    .map((s) => s.title);

  const currentStep = lesson.steps[stepIndex];

  const currentQuestion =
    phase === "quiz"
      ? { mcq: lesson.quiz[quizIndex], phase: "quiz" as const, index: quizIndex, total: totalQuiz }
      : phase === "steps" && currentStep?.question
        ? {
            mcq: currentStep.question,
            phase: "step" as const,
            index: stepIndex,
            total: lesson.steps.length,
          }
        : undefined;

  return (
    <LessonShell
      galaxy={galaxy}
      star={star}
      alreadyDone={alreadyDone}
      onBack={() => navigate({ to: "/galaxy/$galaxyId", params: { galaxyId } })}
    >
      {phase === "core" && (
        <section className="glass animate-float-up space-y-4 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 text-cyan">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Core idea</span>
          </div>
          <p className="whitespace-pre-line text-base leading-relaxed text-foreground">
            {lesson.coreIdea}
          </p>
          <Button onClick={() => setPhase("steps")} className="glow-primary">
            Begin discovery
          </Button>
        </section>
      )}

      {phase === "steps" && currentStep && (
        <section className="animate-float-up space-y-4" key={stepIndex}>
          <div className="glass space-y-3 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Step {stepIndex + 1} of {lesson.steps.length}
              </span>
            </div>
            <h2 className="font-display text-lg font-bold text-foreground">{currentStep.title}</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {currentStep.explanation}
            </p>
            {!currentStep.question && (
              <Button onClick={advanceFromStep} className="glow-primary">
                {stepIndex === lesson.steps.length - 1 ? "On to the quiz" : "Next step"}
              </Button>
            )}
          </div>
          {currentStep.question && (
            <MCQCard
              question={currentStep.question}
              onAnswered={handleStepAnswered}
              onContinue={advanceFromStep}
              continueLabel={stepIndex === lesson.steps.length - 1 ? "On to the quiz" : "Next step"}
            />
          )}
          {currentStep.question === undefined && stepAnswered}
        </section>
      )}

      {phase === "quiz" && (
        <section className="animate-float-up space-y-4" key={quizIndex}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">
                Quiz · {quizIndex + 1} of {totalQuiz}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Score: <span className="text-gold">{quizCorrect}</span>/{totalQuiz}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((quizIndex) / totalQuiz) * 100}%` }}
            />
          </div>
          <MCQCard
            question={lesson.quiz[quizIndex]}
            onAnswered={handleQuizAnswered}
            onContinue={advanceFromQuiz}
            continueLabel={quizIndex === totalQuiz - 1 ? "See summary" : "Next question"}
          />
          <p className="text-center text-[11px] text-muted-foreground">
            Nova can guide you on up to {NOVA_QUIZ_LIMIT} quiz questions — {novaUsesLeft} remaining.
          </p>
        </section>
      )}

      {phase === "summary" && (
        <section className="glass animate-float-up space-y-4 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 text-gold">
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Quiz complete · {quizCorrect}/{totalQuiz}
            </span>
          </div>
          <p className="whitespace-pre-line text-base leading-relaxed text-foreground">
            {lesson.summary}
          </p>
          <Button onClick={finishLesson} disabled={completeMutation.isPending} className="glow-gold">
            <CheckCircle2 className="h-4 w-4" />
            {alreadyDone ? "Mark reviewed" : "Complete star"}
          </Button>
        </section>
      )}

      {phase === "complete" && (
        <section className="glass animate-float-up grid place-items-center gap-3 rounded-2xl p-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gold/15 text-gold glow-gold">
            <Trophy className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-bold">Star secured</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            You answered {quizCorrect} of {totalQuiz} correctly. Your progress is saved across the cosmos.
          </p>
          <Button
            onClick={() => navigate({ to: "/galaxy/$galaxyId", params: { galaxyId } })}
            className="mt-2 glow-primary"
          >
            Back to galaxy
          </Button>
        </section>
      )}

      <NovaPanel
        open={novaOpen}
        onClose={() => setNovaOpen(false)}
        galaxyName={galaxy.name}
        star={star}
        previousStars={previousStars}
      />
    </LessonShell>
  );
}

function LessonShell({
  galaxy,
  star,
  alreadyDone,
  onBack,
  onAskNova,
  novaBadge,
  children,
}: {
  galaxy: Galaxy;
  star: Star;
  alreadyDone?: boolean;
  onBack: () => void;
  onAskNova?: () => void;
  novaBadge?: string;
  children: React.ReactNode;
}) {
  const difficultyClass = useMemo(() => {
    switch (star.difficulty) {
      case "Easy":
        return "border-cyan/40 bg-cyan/10 text-cyan";
      case "Hard":
        return "border-purple/40 bg-purple/10 text-purple";
      default:
        return "border-primary/40 bg-primary/10 text-primary";
    }
  }, [star.difficulty]);

  return (
    <div className="relative">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 pt-4 text-sm">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {galaxy.name}
        </button>
        {onAskNova && (
          <Button variant="secondary" size="sm" onClick={onAskNova} className="gap-1.5">
            <Bot className="h-4 w-4 text-cyan" /> Ask Nova
            {novaBadge && (
              <span className="ml-1 rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-cyan">
                {novaBadge}
              </span>
            )}
          </Button>
        )}
      </div>

      <main className="mx-auto max-w-4xl space-y-5 px-5 py-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${difficultyClass}`}>
              {star.difficulty}
            </span>
            {star.isBoss && (
              <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-gold">
                Final Challenge
              </span>
            )}
            {alreadyDone && (
              <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-gold">
                Completed
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {star.title}
          </h1>
        </header>
        {children}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-5 text-center text-muted-foreground">
      <div>{children}</div>
    </div>
  );
}
