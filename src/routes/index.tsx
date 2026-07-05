import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QrCode, Sparkles, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { listGalaxies, deleteGalaxyFn } from "@/lib/galaxy.functions";
import { redeemLessonCode } from "@/lib/qr.functions";
import type { Galaxy } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConstellationMark } from "@/components/ConstellationMark";
import { QRScanner } from "@/components/QRScanner";
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
      { title: "Constellation — Scan to Unlock Your Next Lesson" },
      {
        name: "description",
        content:
          "Scan a Constellation access code to instantly unlock a hands-on lesson and start earning IC rewards.",
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

function hashIndex(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function Home() {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const qc = useQueryClient();

  const listGalaxiesFn = useServerFn(listGalaxies);
  const removeFn = useServerFn(deleteGalaxyFn);
  const redeemFn = useServerFn(redeemLessonCode);

  const galaxiesQuery = useQuery({
    queryKey: ["galaxies", user?.id ?? "anon"],
    queryFn: () => listGalaxiesFn(),
    enabled: status === "signedIn" && !!user,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => removeFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["galaxies"] }),
  });

  const redeemMutation = useMutation({
    mutationFn: async (code: string) => redeemFn({ data: { code } }),
    onSuccess: ({ galaxyId }) => {
      qc.invalidateQueries({ queryKey: ["galaxies"] });
      navigate({ to: "/galaxy/$galaxyId", params: { galaxyId } });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not redeem code.");
    },
  });

  const unlocked = (galaxiesQuery.data ?? []) as Galaxy[];

  function handleScan(code: string) {
    if (status !== "signedIn") {
      navigate({ to: "/auth" });
      return;
    }
    if (redeemMutation.isPending) return;
    redeemMutation.mutate(code);
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

      <div className="flex w-full max-w-3xl flex-1 flex-col items-center">
        <ConstellationMark className="animate-float-up" />
        <p
          className="animate-float-up mt-2 text-center text-sm text-muted-foreground sm:text-base"
          style={{ animationDelay: "80ms" }}
        >
          Scan your access code to unlock the next lesson
        </p>

        {status === "signedOut" && (
          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <Sparkles className="h-6 w-6 text-cyan" />
            <p className="max-w-md text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>{" "}
              to redeem access codes, earn IC, and outfit your Space Garage.
            </p>
          </div>
        )}

        {status === "signedIn" && (
          <section
            className="glass animate-float-up mt-8 w-full max-w-md rounded-2xl p-5 sm:p-6"
            style={{ animationDelay: "180ms" }}
          >
            <div className="mb-4 flex items-center gap-2 text-primary">
              <QrCode className="h-5 w-5" />
              <h2 className="font-display text-base font-bold">
                Unlock a lesson
              </h2>
            </div>
            <QRScanner
              onSubmit={handleScan}
              pending={redeemMutation.isPending}
              placeholder="GAL-XXX-000"
              submitLabel="Unlock"
            />
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Each access code works exactly once.
            </p>
          </section>
        )}

        {status === "signedIn" && unlocked.length > 0 && (
          <section
            className="animate-float-up mt-10 w-full"
            style={{ animationDelay: "260ms" }}
          >
            <h2 className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground sm:text-xs">
              Your unlocked lessons
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {unlocked.map((g) => {
                const img = GALAXY_IMAGES[hashIndex(g.id, GALAXY_IMAGES.length)];
                return (
                  <li
                    key={g.id}
                    className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-colors hover:border-primary/60"
                  >
                    <Link
                      to="/galaxy/$galaxyId"
                      params={{ galaxyId: g.id }}
                      className="flex items-center gap-3 p-3"
                    >
                      <img
                        src={img}
                        alt=""
                        width={56}
                        height={56}
                        loading="lazy"
                        className="galaxy-spin-slow h-14 w-14 shrink-0 select-none object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-display text-sm font-semibold">
                          {g.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {g.stars.length} stars · {g.difficulty}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => deleteMutation.mutate(g.id)}
                      aria-label={`Delete ${g.name}`}
                      className="absolute right-2 top-2 hidden rounded-full border border-white/10 bg-background/80 p-1.5 text-muted-foreground hover:text-destructive group-hover:block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {status === "signedIn" && galaxiesQuery.isLoading && (
          <p className="mt-10 text-xs text-muted-foreground">
            Loading your lessons…
          </p>
        )}
      </div>

      <footer className="pt-12 text-xs text-muted-foreground">
        Powered by Nova AI Learning System
      </footer>
    </main>
  );
}
