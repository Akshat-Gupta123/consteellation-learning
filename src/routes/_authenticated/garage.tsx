import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Lock, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { GARAGE_ITEMS, SLOTS, getItem } from "@/lib/garage-catalog";
import {
  equipItem,
  getProfile,
  listInventory,
  purchaseItem,
} from "@/lib/profile.functions";
import type { GarageItem, GarageSlot, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/garage")({
  head: () => ({
    meta: [
      { title: "Space Garage — Constellation" },
      {
        name: "description",
        content: "Customize your suit, helmet, ship, effects and terrain in the Space Garage.",
      },
    ],
  }),
  component: GaragePage,
});

const RARITY_STYLE: Record<GarageItem["rarity"], string> = {
  Standard: "border-border/60 text-muted-foreground",
  Rare: "border-cyan/50 text-cyan",
  Legendary: "border-gold/50 text-gold",
};

function GaragePage() {
  const qc = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const inventoryQuery = useQuery({
    queryKey: ["inventory"],
    queryFn: () => listInventory(),
  });

  const buy = useServerFn(purchaseItem);
  const equip = useServerFn(equipItem);

  const purchaseMutation = useMutation({
    mutationFn: async (itemId: string) => buy({ data: { itemId } }),
    onSuccess: ({ ic, owned }) => {
      qc.setQueryData(["profile"], (old: Profile | undefined) => (old ? { ...old, ic } : old));
      qc.setQueryData(["inventory"], owned);
      toast.success("Item acquired.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Purchase failed."),
  });

  const equipMutation = useMutation({
    mutationFn: async (itemId: string) => equip({ data: { itemId } }),
    onSuccess: (avatar) => {
      qc.setQueryData(["profile"], (old: Profile | undefined) =>
        old ? { ...old, avatar } : old,
      );
      toast.success("Loadout updated.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not equip."),
  });

  const [activeSlot, setActiveSlot] = useState<GarageSlot>("suit");
  const [dragging, setDragging] = useState<string | null>(null);

  const slotItems = useMemo(
    () => GARAGE_ITEMS.filter((i) => i.slot === activeSlot),
    [activeSlot],
  );

  if (profileQuery.isLoading || inventoryQuery.isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">
        <Loader2 className="mb-2 h-5 w-5 animate-spin text-primary" />
        Opening the garage…
      </div>
    );
  }

  const profile = profileQuery.data!;
  const owned = new Set(inventoryQuery.data ?? []);

  function handleDrop(itemId: string) {
    const item = getItem(itemId);
    if (!item) return;
    if (!owned.has(item.id)) {
      toast.error("You need to purchase this item first.");
      return;
    }
    equipMutation.mutate(item.id);
  }

  const equippedSuit = getItem(profile.avatar.suit) ?? getItem("suit_basic");
  const equippedHelmet = getItem(profile.avatar.helmet) ?? getItem("helmet_basic");
  const equippedShip = getItem(profile.avatar.ship) ?? getItem("ship_basic");
  const equippedEffect = getItem(profile.avatar.effect) ?? getItem("effect_none");
  const equippedTerrain = getItem(profile.avatar.terrain) ?? getItem("terrain_moon");

  // Suit + helmet alignment via per-item anchors (% from top of each PNG).
  const suitNeckY = equippedSuit?.neckY ?? 0.16;
  const helmetBaseY = equippedHelmet?.baseY ?? 0.92;
  const showHelmetOverlay = !equippedSuit?.includesHelmet;

  // Pilot box layout (in % of pilot box height):
  // Suit is 100% of pilot box, anchored to the bottom (feet on ground).
  // Helmet height = HELMET_PCT * pilot height. Helmet top = (suit neck) - (helmet base inside helmet box).
  const HELMET_PCT = 0.32;
  const helmetHeightPct = HELMET_PCT * 100;
  // Y of helmet TOP, measured from top of pilot box, as %:
  const helmetTopPct = Math.max(
    -4,
    suitNeckY * 100 - helmetBaseY * helmetHeightPct,
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-5 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Space Garage
          </h1>
          <p className="text-sm text-muted-foreground">
            Outfit your pilot. Items follow your account across every device.
          </p>
        </div>
        <Link
          to="/achievements"
          className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
        >
          <Trophy className="h-3.5 w-3.5" /> Achievements
        </Link>
      </header>

      {/* Pilot + Ship live preview */}
      <section className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Your Pilot &amp; Ship · standing on {equippedTerrain?.name}
        </h2>
        <div
          className="relative overflow-hidden rounded-xl"
          style={{ background: "radial-gradient(ellipse at top, #0b1026 0%, #03030d 70%)" }}
        >
          {/* twinkling stars */}
          <div className="pointer-events-none absolute inset-0 opacity-80">
            {Array.from({ length: 50 }).map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-white animate-pulse"
                style={{
                  top: `${(i * 53) % 55}%`,
                  left: `${(i * 37) % 100}%`,
                  width: i % 6 === 0 ? "2px" : "1px",
                  height: i % 6 === 0 ? "2px" : "1px",
                  animationDelay: `${(i % 6) * 0.3}s`,
                  animationDuration: `${1.5 + (i % 4) * 0.4}s`,
                }}
              />
            ))}
          </div>

          {/* Equipped terrain as the ground (bottom 38% of stage) */}
          {equippedTerrain?.image && (
            <img
              src={equippedTerrain.image}
              alt={equippedTerrain.name}
              aria-hidden="true"
              loading="lazy"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[38%] w-full object-cover object-top"
            />
          )}

          {/* Stage. Ground line sits at bottom of the inner stage region.
              Pilot's feet touch the ground. Ship hovers just above it. */}
          <div className="relative z-10 grid min-h-[24rem] grid-cols-[1fr_1.3fr] items-end gap-4 px-4 pt-10 pb-[14%] sm:min-h-[30rem] sm:gap-8 sm:px-8 sm:pt-14 sm:pb-[12%]">
            {/* Pilot */}
            <div className="relative mx-auto h-72 w-44 sm:h-96 sm:w-56">
              {/* Suit fills the whole pilot box, anchored at the bottom */}
              {equippedSuit?.image && (
                <img
                  src={equippedSuit.image}
                  alt={equippedSuit.name}
                  loading="lazy"
                  className="absolute inset-x-0 bottom-0 z-10 mx-auto h-full w-auto max-w-full object-contain object-bottom drop-shadow-[0_10px_18px_rgba(0,0,0,0.7)]"
                />
              )}
              {/* Helmet — only when the suit is genuinely headless */}
              {showHelmetOverlay && equippedHelmet?.image && (
                <img
                  src={equippedHelmet.image}
                  alt={equippedHelmet.name}
                  loading="lazy"
                  className="absolute left-1/2 z-20 -translate-x-1/2 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)]"
                  style={{
                    top: `${helmetTopPct}%`,
                    height: `${helmetHeightPct}%`,
                  }}
                />
              )}
            </div>

            {/* Ship — hovers ~10% above the ground, with thrust trail behind */}
            <div className="relative mx-auto h-72 w-full sm:h-96">
              <div className="absolute inset-x-0 bottom-[18%] mx-auto h-[55%] w-full">
                {/* thrust trail behind ship (left side = back) */}
                <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2">
                  <div
                    className="h-4 w-32 rounded-full blur-md animate-thrust sm:h-6 sm:w-48"
                    style={{
                      background:
                        equippedEffect && equippedEffect.id !== "effect_none"
                          ? equippedEffect.swatch
                          : "linear-gradient(90deg, transparent, #22d3ee, #a855f7)",
                    }}
                  />
                  <div
                    className="mt-1 h-2 w-20 rounded-full blur-sm opacity-70 animate-thrust sm:w-32"
                    style={{
                      background:
                        equippedEffect && equippedEffect.id !== "effect_none"
                          ? equippedEffect.swatch
                          : "linear-gradient(90deg, transparent, #f472b6, #22d3ee)",
                      animationDelay: "0.2s",
                    }}
                  />
                </div>
                {equippedShip?.image && (
                  <img
                    src={equippedShip.image}
                    alt={equippedShip.name}
                    loading="lazy"
                    className="absolute right-2 top-1/2 z-10 h-full -translate-y-1/2 animate-ship-bob object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.6)]"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 px-4 pb-4 text-center sm:px-8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
              {equippedSuit?.name}
              {showHelmetOverlay && equippedHelmet ? ` · ${equippedHelmet.name}` : ""}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
              {equippedShip?.name} · {equippedEffect?.name}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Loadout / drop zone */}
        <section className="glass space-y-4 rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Current loadout
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {SLOTS.map((slot) => {
              const equippedId = profile.avatar[slot.id];
              const item = getItem(equippedId);
              const isDropTarget = activeSlot === slot.id;
              return (
                <div
                  key={slot.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain") || dragging;
                    if (!id) return;
                    const dropped = getItem(id);
                    if (!dropped || dropped.slot !== slot.id) {
                      toast.error(`That item doesn't fit in your ${slot.label.toLowerCase()} slot.`);
                      return;
                    }
                    setActiveSlot(slot.id);
                    handleDrop(id);
                  }}
                  onClick={() => setActiveSlot(slot.id)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-3 transition-all",
                    isDropTarget
                      ? "border-primary glow-primary"
                      : "border-border/60 hover:border-primary/60",
                  )}
                >
                  <div
                    className="mb-2 grid h-32 w-full place-items-center overflow-hidden rounded-lg text-xs text-white/80 sm:h-36"
                    style={{ background: item?.swatch ?? "linear-gradient(135deg,#0f172a,#1e293b)" }}
                  >
                    {item?.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                    ) : (
                      <Sparkles className="h-5 w-5 opacity-80" />
                    )}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {slot.label}
                  </p>
                  <p className="truncate text-sm font-medium">{item?.name ?? "Empty"}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Drag an owned item onto its slot — or tap a slot, then Equip.
          </p>
        </section>

        {/* Catalog */}
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {SLOTS.map((slot) => (
              <button
                key={slot.id}
                onClick={() => setActiveSlot(slot.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeSlot === slot.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {slot.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {slotItems.map((item) => {
              const isOwned = owned.has(item.id);
              const isEquipped = profile.avatar[item.slot] === item.id;
              return (
                <article
                  key={item.id}
                  draggable={isOwned}
                  onDragStart={(e) => {
                    if (!isOwned) return;
                    setDragging(item.id);
                    e.dataTransfer.setData("text/plain", item.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDragging(null)}
                  className={cn(
                    "glass relative space-y-3 rounded-2xl p-4 transition-all",
                    isEquipped && "border-gold/60 glow-gold",
                  )}
                >
                  <div
                    className="grid h-44 w-full place-items-center overflow-hidden rounded-xl text-white/80 sm:h-52"
                    style={{ background: item.swatch }}
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                    ) : (
                      <Sparkles className="h-6 w-6 opacity-70" />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-sm font-bold">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        RARITY_STYLE[item.rarity],
                      )}
                    >
                      {item.rarity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gold">
                      {item.price === 0 ? "Starter" : `${item.price.toLocaleString()} IC`}
                    </span>
                    {isEquipped ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Equipped
                      </span>
                    ) : isOwned ? (
                      <Button
                        size="sm"
                        onClick={() => equipMutation.mutate(item.id)}
                        disabled={equipMutation.isPending}
                      >
                        Equip
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => purchaseMutation.mutate(item.id)}
                        disabled={purchaseMutation.isPending || profile.ic < item.price}
                      >
                        {profile.ic < item.price ? (
                          <>
                            <Lock className="h-3.5 w-3.5" /> Need IC
                          </>
                        ) : (
                          "Purchase"
                        )}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
