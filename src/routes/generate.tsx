import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateAndSaveGalaxy } from "@/lib/galaxy.functions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: "Generate a Galaxy — Constellation" },
      {
        name: "description",
        content: "Pick any topic and Nova will map a personalized galaxy of learning stars for you.",
      },
    ],
  }),
  component: GeneratePage,
});

function GeneratePage() {
  const navigate = useNavigate();
  const { status } = useAuth();
  const generate = useServerFn(generateAndSaveGalaxy);
  const [topic, setTopic] = useState("");

  const generateMutation = useMutation({
    mutationFn: async (t: string) => generate({ data: { topic: t } }),
    onSuccess: ({ id }) => {
      navigate({ to: "/galaxy/$galaxyId", params: { galaxyId: id } });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Nova couldn't map that galaxy.";
      toast.error(msg);
    },
  });

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const value = topic.trim();
    if (!value) return;
    if (status !== "signedIn") {
      navigate({ to: "/auth" });
      return;
    }
    generateMutation.mutate(value);
  }

  const loading = generateMutation.isPending;

  return (
    <main className="relative flex min-h-screen flex-col items-center px-5 py-8 sm:py-10">
      <div className="w-full max-w-2xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to your constellation
        </Link>

        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Generate a new galaxy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Type any topic — broad or specific — and Nova will map a complete learning journey.
        </p>

        <form onSubmit={handleGenerate} className="mt-8 w-full">
          <div className="glass flex items-center gap-3 rounded-2xl p-2 pl-5 focus-within:border-primary focus-within:glow-primary">
            <Sparkles className="h-5 w-5 shrink-0 text-cyan" />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              autoFocus
              placeholder="e.g. Photosynthesis, Fractions, Python loops"
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground sm:text-base"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={loading || !topic.trim()}
            className="mt-6 h-14 w-full rounded-2xl text-base font-semibold glow-primary sm:w-auto sm:px-12"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Mapping your galaxy…
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5" /> Generate Galaxy
              </>
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
