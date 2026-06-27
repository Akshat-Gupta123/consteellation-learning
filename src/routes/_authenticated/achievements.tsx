import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Award,
  BookOpenCheck,
  Crown,
  Flame,
  Loader2,
  Lock,
  Rocket,
  Sparkles,
  Star as StarIcon,
  Telescope,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { getProfile, listInventory } from "@/lib/profile.functions";
import { listAllProgress, listGalaxies } from "@/lib/galaxy.functions";
import { GARAGE_ITEMS } from "@/lib/garage-catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — Constellation" },
      {
        name: "description",
        content: "Track your learning milestones across the Constellation universe.",
      },
    ],
  }),
  component: AchievementsPage,
});

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** 0–1 progress toward the goal. */
  progress: number;
  unlocked: boolean;
  /** Optional progress label, e.g. "3 / 10 stars". */
  label?: string;
  rarity: "Bronze" | "Silver" | "Gold";
}

const RARITY_RING: Record<Achievement["rarity"], string> = {
  Bronze: "border-amber-700/40 text-amber-500",
  Silver: "border-slate-300/40 text-slate-200",
  Gold: "border-gold/50 text-gold",
};

function AchievementsPage() {
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const invQ = useQuery({ queryKey: ["inventory"], queryFn: () => listInventory() });
  const galaxiesQ = useQuery({ queryKey: ["galaxies"], queryFn: () => listGalaxies() });
  const progressQ = useQuery({ queryKey: ["all-progress"], queryFn: () => listAllProgress() });

  const achievements = useMemo<Achievement[]>(() => {
    if (!profileQ.data || !invQ.data || !galaxiesQ.data || !progressQ.data) return [];
    const profile = profileQ.data;
    const inv = invQ.data;
    const galaxies = galaxiesQ.data;
    const progress = progressQ.data;

    const totalStarsCompleted = progress.reduce((sum, p) => sum + p.completed.length, 0);
    const completedGalaxies = galaxies.filter((g) => {
      const p = progress.find((x) => x.galaxyId === g.id);
      return p && p.completed.length >= g.stars.length;
    }).length;
    const ownedNonStarter = inv.filter((id) => {
      const it = GARAGE_ITEMS.find((x) => x.id === id);
      return it && it.price > 0;
    }).length;
    const legendaryOwned = inv.filter((id) => {
      const it = GARAGE_ITEMS.find((x) => x.id === id);
      return it?.rarity === "Legendary";
    }).length;

    function clamp(n: number) {
      return Math.max(0, Math.min(1, n));
    }

    const list: Omit<Achievement, "unlocked">[] = [
      {
        id: "first_star",
        name: "First Light",
        description: "Complete your first star.",
        icon: StarIcon,
        progress: clamp(totalStarsCompleted / 1),
        label: `${Math.min(totalStarsCompleted, 1)} / 1 star`,
        rarity: "Bronze",
      },
      {
        id: "ten_stars",
        name: "Constellation Cartographer",
        description: "Complete 10 stars across any galaxies.",
        icon: Telescope,
        progress: clamp(totalStarsCompleted / 10),
        label: `${Math.min(totalStarsCompleted, 10)} / 10 stars`,
        rarity: "Silver",
      },
      {
        id: "fifty_stars",
        name: "Sky Scholar",
        description: "Complete 50 stars across any galaxies.",
        icon: BookOpenCheck,
        progress: clamp(totalStarsCompleted / 50),
        label: `${Math.min(totalStarsCompleted, 50)} / 50 stars`,
        rarity: "Gold",
      },
      {
        id: "first_galaxy",
        name: "Galaxy Pioneer",
        description: "Generate your first galaxy.",
        icon: Sparkles,
        progress: clamp(galaxies.length / 1),
        label: `${Math.min(galaxies.length, 1)} / 1 galaxy`,
        rarity: "Bronze",
      },
      {
        id: "five_galaxies",
        name: "Galaxy Collector",
        description: "Generate 5 galaxies on any topics you like.",
        icon: Sparkles,
        progress: clamp(galaxies.length / 5),
        label: `${Math.min(galaxies.length, 5)} / 5 galaxies`,
        rarity: "Silver",
      },
      {
        id: "complete_galaxy",
        name: "Full Spectrum",
        description: "Finish every star in a single galaxy.",
        icon: Trophy,
        progress: clamp(completedGalaxies / 1),
        label: `${Math.min(completedGalaxies, 1)} / 1 galaxy`,
        rarity: "Silver",
      },
      {
        id: "three_galaxies_done",
        name: "Triple Crown",
        description: "Complete every star in 3 different galaxies.",
        icon: Crown,
        progress: clamp(completedGalaxies / 3),
        label: `${completedGalaxies} / 3 galaxies`,
        rarity: "Gold",
      },
      {
        id: "ic_earner",
        name: "Stellar Banker",
        description: "Accumulate 1,000 Interstellar Currency.",
        icon: Wallet,
        progress: clamp(profile.ic / 1000),
        label: `${profile.ic.toLocaleString()} / 1,000 IC`,
        rarity: "Silver",
      },
      {
        id: "collector_5",
        name: "Garage Regular",
        description: "Own 5 cosmetic items (starters don't count).",
        icon: Rocket,
        progress: clamp(ownedNonStarter / 5),
        label: `${ownedNonStarter} / 5 items`,
        rarity: "Silver",
      },
      {
        id: "legendary_owner",
        name: "Legend in Orbit",
        description: "Own a Legendary cosmetic.",
        icon: Award,
        progress: clamp(legendaryOwned / 1),
        label: `${Math.min(legendaryOwned, 1)} / 1 legendary`,
        rarity: "Gold",
      },
      {
        id: "streak_3",
        name: "Daily Cadet",
        description: "Maintain a 3-day learning streak.",
        icon: Flame,
        progress: clamp(profile.streakDays / 3),
        label: `${Math.min(profile.streakDays, 3)} / 3 days`,
        rarity: "Bronze",
      },
      {
        id: "streak_7",
        name: "Lightspeed Habit",
        description: "Maintain a 7-day learning streak.",
        icon: Zap,
        progress: clamp(profile.streakDays / 7),
        label: `${Math.min(profile.streakDays, 7)} / 7 days`,
        rarity: "Gold",
      },
    ];

    return list.map((a) => ({ ...a, unlocked: a.progress >= 1 }));
  }, [profileQ.data, invQ.data, galaxiesQ.data, progressQ.data]);

  const isLoading =
    profileQ.isLoading || invQ.isLoading || galaxiesQ.isLoading || progressQ.isLoading;

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">
        <Loader2 className="mb-2 h-5 w-5 animate-spin text-primary" />
        Charting your milestones…
      </div>
    );
  }

  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Achievements
          </h1>
          <p className="text-sm text-muted-foreground">
            Pure prestige — no IC, just bragging rights.{" "}
            <span className="text-gold">{unlocked}</span>{" "}
            <span className="text-muted-foreground">of {achievements.length} unlocked.</span>
          </p>
        </div>
        <Link
          to="/garage"
          className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          Back to garage →
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => {
          const Icon = a.icon;
          return (
            <article
              key={a.id}
              className={cn(
                "glass relative overflow-hidden rounded-2xl border p-4 transition-all",
                a.unlocked
                  ? "border-gold/40 glow-gold"
                  : "border-border/60 opacity-90",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-xl border",
                    a.unlocked
                      ? RARITY_RING[a.rarity] + " bg-gold/10"
                      : "border-border/60 bg-muted/30 text-muted-foreground",
                  )}
                >
                  {a.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-sm font-bold">{a.name}</h3>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                        RARITY_RING[a.rarity],
                      )}
                    >
                      {a.rarity}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      a.unlocked ? "bg-gold" : "bg-primary",
                    )}
                    style={{ width: `${Math.round(a.progress * 100)}%` }}
                  />
                </div>
                {a.label && (
                  <p className="text-[11px] text-muted-foreground">{a.label}</p>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
