import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GARAGE_ITEMS, SLOTS, getItem } from "@/lib/garage-catalog";
import moonSurface from "@/assets/garage/moon_surface.jpg";
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
        content: "Customize your suit, helmet, ship and effects in the Space Garage.",
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

  const equippedSuit = getItem(profile.avatar.suit);
  const equippedHelmet = getItem(profile.avatar.helmet);
  const equippedShip = getItem(profile.avatar.ship);
  const equippedEffect = getItem(profile.avatar.effect);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-5 py-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Space Garage
        </h1>
        <p className="text-sm text-muted-foreground">
          Customize your suit, helmet, ship and effects. Items save to your account and follow you across devices.
        </p>
      </header>

      {/* Ship + Spaceman live preview */}
      <section className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Your Pilot &amp; Ship
        </h2>
        <div
          className="relative overflow-hidden rounded-xl"
          style={{ background: "linear-gradient(180deg, #000010 0%, #050018 100%)" }}
        >
          {/* twinkling stars */}
          <div className="pointer-events-none absolute inset-0 opacity-80">
            {Array.from({ length: 40 }).map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-white animate-pulse"
                style={{
                  top: `${(i * 53) % 60}%`,
                  left: `${(i * 37) % 100}%`,
                  width: i % 5 === 0 ? "2px" : "1px",
                  height: i % 5 === 0 ? "2px" : "1px",
                  animationDelay: `${(i % 6) * 0.3}s`,
                  animationDuration: `${1.5 + (i % 4) * 0.4}s`,
                }}
              />
            ))}
          </div>

          {/* Cratered moon surface as the ground */}
          <img
            src={moonSurface}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[55%] w-full object-cover object-top"
          />

          {/* Stage — characters stand ON the moon surface */}
          <div className="relative z-10 grid min-h-[22rem] grid-cols-[1fr_1.2fr] items-end gap-4 px-4 pt-8 pb-[12%] sm:min-h-[28rem] sm:gap-8 sm:px-8 sm:pt-12 sm:pb-[10%]">
            {/* Pilot: suit with helmet sitting on the neck ring */}
            <div className="relative mx-auto flex h-64 w-40 items-end justify-center sm:h-80 sm:w-52">
              <div className="relative h-full w-full">
                {equippedSuit?.image && (
                  <img
                    src={equippedSuit.image}
                    alt={equippedSuit.name}
                    loading="lazy"
                    className="absolute bottom-0 left-1/2 h-[78%] -translate-x-1/2 object-contain object-bottom drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
                  />
                )}
                {/* Helmet sits right on the suit's neck ring (top ~22% of pilot box) */}
                <img
                  src={(equippedHelmet ?? getItem("helmet_basic"))?.image}
                  alt={(equippedHelmet ?? getItem("helmet_basic"))?.name ?? "Helmet"}
                  loading="lazy"
                  className="absolute left-1/2 top-0 z-10 h-[30%] -translate-x-1/2 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                />
              </div>
            </div>

            {/* Ship next to pilot, with thrust effect from the back */}
            <div className="relative mx-auto flex h-64 w-full items-end justify-center sm:h-80">
              <div className="relative h-[70%] w-full">
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
              Pilot
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
              Ship · {equippedEffect?.name ?? "No effect"}
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
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
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
            Tip: drag any owned item from the catalog onto a slot to equip it.
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
                    !isOwned && "opacity-95",
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
                      {item.price === 0 ? "Starter" : `${item.price} IC`}
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
