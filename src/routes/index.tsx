import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Rocket, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { generateAndSaveGalaxy, listGalaxies, deleteGalaxyFn } from "@/lib/galaxy.functions";
import type { Galaxy } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConstellationMark } from "@/components/ConstellationMark";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Constellation — Explore Knowledge, One Star at a Time" },
      {
        name: "description",
        content:
          "Enter any topic and Constellation generates a visual star-map learning journey, guided by the Nova AI tutor.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { status } = useAuth();
  const qc = useQueryClient();
  const generate = useServerFn(generateAndSaveGalaxy);
  const remove = useServerFn(deleteGalaxyFn);
  const [topic, setTopic] = useState("");

  const galaxiesQuery = useQuery({
    queryKey: ["galaxies"],
    queryFn: () => listGalaxies(),
    enabled: status === "signedIn",
  });

  const generateMutation = useMutation({
    mutationFn: async (t: string) => generate({ data: { topic: t } }),
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ["galaxies"] });
      navigate({ to: "/galaxy/$galaxyId", params: { galaxyId: id } });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Nova couldn't map that galaxy.";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["galaxies"] }),
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
  const recent = (galaxiesQuery.data ?? []) as Galaxy[];

  return (
    <main className="relative flex min-h-screen flex-col items-center px-5 py-10">
      <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center text-center">
        <ConstellationMark className="animate-float-up mb-2" />
        <p
          className="animate-float-up text-base text-muted-foreground sm:text-lg"
          style={{ animationDelay: "80ms" }}
        >
          Explore Knowledge, One Star at a Time
        </p>

        <form
          onSubmit={handleGenerate}
          className="animate-float-up mt-10 w-full"
          style={{ animationDelay: "160ms" }}
        >
          <div className="glass flex items-center gap-3 rounded-2xl p-2 pl-5 focus-within:border-primary focus-within:glow-primary">
            <Sparkles className="h-5 w-5 shrink-0 text-cyan" />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              autoFocus
              placeholder="Enter what you want to learn (e.g. Photosynthesis, Fractions, Python)"
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

          {status === "signedOut" && (
            <p className="mt-4 text-xs text-muted-foreground">
              <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>{" "}
              to save galaxies, earn IC, and customize your Space Garage.
            </p>
          )}
        </form>

        {status === "signedIn" && recent.length > 0 && (
          <section
            className="animate-float-up mt-14 w-full text-left"
            style={{ animationDelay: "240ms" }}
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Your galaxies
            </h2>
            <ul className="space-y-2">
              {recent.map((g) => (
                <li
                  key={g.id}
                  className="glass flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:border-primary/60"
                >
                  <Link
                    to="/galaxy/$galaxyId"
                    params={{ galaxyId: g.id }}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate font-display text-sm font-semibold">
                        {g.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {g.stars.length} stars · {g.difficulty}
                      </span>
                    </span>
                  </Link>
                  <button
                    onClick={() => deleteMutation.mutate(g.id)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    aria-label={`Delete ${g.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {status === "signedIn" && galaxiesQuery.isLoading && (
          <p className="mt-10 text-xs text-muted-foreground">Loading your galaxies…</p>
        )}
      </div>

      <footer className="pt-10 text-xs text-muted-foreground">
        Powered by Nova AI Learning System
      </footer>
    </main>
  );
}
