import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Rocket, Sparkles, Trash2 } from "lucide-react";
import { listGalaxies, deleteGalaxyFn } from "@/lib/galaxy.functions";
import type { Galaxy } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConstellationMark } from "@/components/ConstellationMark";
import { useAuth } from "@/hooks/use-auth";

import galaxyPink from "@/assets/galaxy-pink.png";
import galaxyBlue from "@/assets/galaxy-blue.png";
import galaxyAmber from "@/assets/galaxy-amber.png";
import galaxyGreen from "@/assets/galaxy-green.png";
import galaxyViolet from "@/assets/galaxy-violet.png";
import galaxyGold from "@/assets/galaxy-gold.png";

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

const GALAXY_IMAGES = [
  galaxyPink,
  galaxyBlue,
  galaxyAmber,
  galaxyGreen,
  galaxyViolet,
  galaxyGold,
] as const;

const GALAXY_ACCENTS = [
  "#f472b6",
  "#22d3ee",
  "#f59e0b",
  "#34d399",
  "#a78bfa",
  "#fde047",
] as const;

function hashIndex(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

// Web-graph layout: positions are in % within a fixed-aspect SVG/HTML canvas.
// Deterministic per index — first node centered, rest on rings.
function webPosition(i: number, total: number) {
  if (total === 1) return { x: 50, y: 50 };
  // Ring layout, offset per ring
  const ringSize = 6;
  const ring = Math.floor((i) / ringSize);
  const inRing = i % ringSize;
  const perRing = Math.min(ringSize, total - ring * ringSize);
  const radius = 22 + ring * 18; // % from center
  const angle = (inRing / perRing) * Math.PI * 2 + ring * 0.4;
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius * 0.78, // squashed vertically
  };
}

function GalaxyWeb({
  galaxies,
  onDelete,
}: {
  galaxies: Galaxy[];
  onDelete: (id: string) => void;
}) {
  const positions = galaxies.map((_, i) => webPosition(i, galaxies.length));

  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-4xl">
      {/* connecting lines: complete graph */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {positions.map((a, i) =>
          positions.slice(i + 1).map((b, j) => (
            <line
              key={`${i}-${j}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="white"
              strokeWidth="0.15"
              strokeDasharray="0.6 0.8"
              style={{
                opacity: 0.25,
                animation: `line-pulse ${4 + ((i + j) % 5)}s ease-in-out infinite`,
                animationDelay: `${(i + j) * 0.3}s`,
              }}
            />
          ))
        )}
      </svg>

      {galaxies.map((g, i) => {
        const pos = positions[i];
        const imgIdx = hashIndex(g.id, GALAXY_IMAGES.length);
        const img = GALAXY_IMAGES[imgIdx];
        const accent = GALAXY_ACCENTS[imgIdx];
        const size = 110 + (g.stars.length % 4) * 14; // 110-152px
        return (
          <div
            key={g.id}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <Link
              to="/galaxy/$galaxyId"
              params={{ galaxyId: g.id }}
              aria-label={`Open ${g.name}`}
              className="relative block"
              style={{ width: size, height: size }}
            >
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-60 transition-opacity group-hover:opacity-90"
                style={{ background: `radial-gradient(circle, ${accent}55, transparent 70%)` }}
              />
              <img
                src={img}
                alt=""
                width={size}
                height={size}
                loading="lazy"
                draggable={false}
                className="galaxy-spin-slow relative h-full w-full select-none object-contain transition-transform duration-300 group-hover:scale-110"
                style={{ animationDuration: `${60 + (i % 5) * 14}s` }}
              />
            </Link>
            <div className="pointer-events-none mt-1 text-center">
              <p className="line-clamp-1 max-w-[10rem] font-display text-xs font-semibold sm:text-sm">
                {g.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {g.stars.length} stars · {g.difficulty}
              </p>
            </div>
            <button
              onClick={() => onDelete(g.id)}
              aria-label={`Delete ${g.name}`}
              className="absolute right-0 top-0 hidden rounded-full border border-white/10 bg-background/80 p-1 text-muted-foreground hover:text-destructive group-hover:block"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
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
      {status === "signedIn" && (
        <nav className="absolute right-5 top-5 flex items-center gap-2 text-xs font-semibold sm:right-8 sm:top-8">
          <Link
            to="/garage"
            className="rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            Garage
          </Link>
          <Link
            to="/achievements"
            className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-gold transition-colors hover:bg-gold/20"
          >
            <Trophy className="mr-1 inline h-3.5 w-3.5" /> Achievements
          </Link>
        </nav>
      )}
      <div className="flex w-full max-w-5xl flex-1 flex-col items-center">
        <ConstellationMark className="animate-float-up" />
        <p
          className="animate-float-up mt-2 text-center text-sm text-muted-foreground sm:text-base"
          style={{ animationDelay: "80ms" }}
        >
          Explore Knowledge, One Star at a Time
        </p>

        {status === "signedIn" && recent.length > 0 && (
          <section
            className="animate-float-up mt-8 w-full sm:mt-12"
            style={{ animationDelay: "180ms" }}
          >
            <h2 className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground sm:text-xs">
              Your galaxy web
            </h2>
            <GalaxyWeb
              galaxies={recent}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
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

        <div className="mt-10 w-full sm:mt-14 flex justify-center">
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

