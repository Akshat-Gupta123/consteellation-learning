import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Rocket, Sparkles, Trash2 } from "lucide-react";
import { listGalaxies, deleteGalaxyFn } from "@/lib/galaxy.functions";
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

// Deterministic positions / colours for galaxy nodes
const GALAXY_PALETTES = [
  ["#f472b6", "#a855f7"], // pink → purple
  ["#22d3ee", "#3b82f6"], // cyan → blue
  ["#f59e0b", "#ef4444"], // amber → red
  ["#34d399", "#06b6d4"], // green → cyan
  ["#a78bfa", "#ec4899"], // violet → pink
  ["#fde047", "#f97316"], // yellow → orange
] as const;

function hashIndex(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function GalaxyNode({
  galaxy,
  index,
  onDelete,
}: {
  galaxy: Galaxy;
  index: number;
  onDelete: (id: string) => void;
}) {
  const [c1, c2] = GALAXY_PALETTES[hashIndex(galaxy.id, GALAXY_PALETTES.length)];
  const size = 96 + (galaxy.stars.length % 5) * 8; // 96–128px
  const rotate = (index * 37) % 360;

  return (
    <li className="group relative flex flex-col items-center text-center">
      <Link
        to="/galaxy/$galaxyId"
        params={{ galaxyId: galaxy.id }}
        className="block"
        aria-label={`Open ${galaxy.name}`}
      >
        <div
          className="relative transition-transform duration-300 group-hover:scale-110"
          style={{ width: size, height: size }}
        >
          {/* outer glow */}
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-60 animate-pulse"
            style={{
              background: `radial-gradient(circle, ${c1}66, transparent 70%)`,
              animationDuration: "3.5s",
            }}
          />
          {/* spiral disk */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from ${rotate}deg, ${c1}, ${c2}, ${c1})`,
              maskImage:
                "radial-gradient(circle, black 38%, rgba(0,0,0,0.55) 55%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(circle, black 38%, rgba(0,0,0,0.55) 55%, transparent 72%)",
              filter: "blur(1px)",
            }}
          />
          {/* core */}
          <div
            className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
            style={{ boxShadow: `0 0 18px 4px ${c1}` }}
          />
          {/* orbiting stars */}
          {Array.from({ length: 4 }).map((_, i) => {
            const angle = (i / 4) * Math.PI * 2 + index;
            const r = size * 0.45;
            const x = size / 2 + Math.cos(angle) * r;
            const y = size / 2 + Math.sin(angle) * r;
            return (
              <span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-white animate-twinkle"
                style={{
                  left: x,
                  top: y,
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            );
          })}
        </div>
      </Link>
      <p className="mt-2 line-clamp-2 max-w-[10rem] font-display text-xs font-semibold sm:text-sm">
        {galaxy.name}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {galaxy.stars.length} stars · {galaxy.difficulty}
      </p>
      <button
        onClick={() => onDelete(galaxy.id)}
        aria-label={`Delete ${galaxy.name}`}
        className="absolute -right-1 -top-1 hidden rounded-full border border-white/10 bg-background/80 p-1 text-muted-foreground hover:text-destructive group-hover:block"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  );
}

function Home() {
  const navigate = useNavigate();
  const { status } = useAuth();
  const qc = useQueryClient();
  const remove = useServerFn(deleteGalaxyFn);

  const galaxiesQuery = useQuery({
    queryKey: ["galaxies"],
    queryFn: () => listGalaxies(),
    enabled: status === "signedIn",
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["galaxies"] }),
  });

  const recent = (galaxiesQuery.data ?? []) as Galaxy[];

  function handleGenerate() {
    if (status !== "signedIn") {
      navigate({ to: "/auth" });
      return;
    }
    navigate({ to: "/generate" });
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center px-5 py-10 sm:py-14">
      <div className="flex w-full max-w-5xl flex-1 flex-col items-center">
        <ConstellationMark className="animate-float-up" />
        <p
          className="animate-float-up mt-2 text-center text-sm text-muted-foreground sm:text-base"
          style={{ animationDelay: "80ms" }}
        >
          Explore Knowledge, One Star at a Time
        </p>

        {/* Galaxies web */}
        {status === "signedIn" && recent.length > 0 && (
          <section
            className="animate-float-up mt-10 w-full sm:mt-14"
            style={{ animationDelay: "180ms" }}
          >
            <h2 className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground sm:text-xs">
              Your galaxies
            </h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {recent.map((g, i) => (
                <GalaxyNode
                  key={g.id}
                  galaxy={g}
                  index={i}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </ul>
          </section>
        )}

        {status === "signedIn" && galaxiesQuery.isLoading && (
          <p className="mt-10 text-xs text-muted-foreground">Loading your galaxies…</p>
        )}

        {status === "signedIn" && !galaxiesQuery.isLoading && recent.length === 0 && (
          <p className="mt-12 max-w-md text-center text-sm text-muted-foreground">
            You haven't mapped any galaxies yet. Tap the button below to begin your first journey.
          </p>
        )}

        {status === "signedOut" && (
          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <Sparkles className="h-6 w-6 text-cyan" />
            <p className="max-w-md text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>{" "}
              to map galaxies, earn IC, and customize your Space Garage.
            </p>
          </div>
        )}

        {/* Generate Galaxy button — sits below the galaxies (not sticky) */}
        <div className="mt-12 w-full sm:mt-16 flex justify-center">
          <Button
            onClick={handleGenerate}
            size="lg"
            className="animate-float-up h-14 rounded-2xl px-10 text-base font-semibold glow-primary sm:px-14"
            style={{ animationDelay: "260ms" }}
          >
            <Rocket className="h-5 w-5" /> Generate Galaxy
          </Button>
        </div>
      </div>

      <footer className="pt-12 text-xs text-muted-foreground">
        Powered by Nova AI Learning System
      </footer>
    </main>
  );
}
