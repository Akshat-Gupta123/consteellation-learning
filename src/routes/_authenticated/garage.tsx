import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Lock, Sparkles } from "lucide-react";
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
          className="relative grid grid-cols-2 gap-4 rounded-xl p-4 sm:p-6"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(124,58,237,0.25), transparent 60%), radial-gradient(circle at 80% 70%, rgba(14,165,233,0.25), transparent 60%), linear-gradient(135deg,#05060f,#0f172a)",
          }}
        >
          {/* twinkling stars */}
          <div className="pointer-events-none absolute inset-0 opacity-60">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="absolute h-0.5 w-0.5 rounded-full bg-white animate-pulse"
                style={{
                  top: `${(i * 53) % 100}%`,
                  left: `${(i * 37) % 100}%`,
                  animationDelay: `${(i % 6) * 0.3}s`,
                  animationDuration: `${1.5 + (i % 4) * 0.4}s`,
                }}
              />
            ))}
          </div>

          {/* Spaceman (suit + helmet) */}
          <div className="relative z-10 flex flex-col items-center justify-end gap-2">
            <div className="relative h-40 w-32 sm:h-56 sm:w-44">
              {equippedHelmet?.image && (
                <img
                  src={equippedHelmet.image}
                  alt={equippedHelmet.name}
                  className="absolute left-1/2 top-0 h-16 w-16 -translate-x-1/2 rounded-full object-cover ring-2 ring-cyan/40 sm:h-24 sm:w-24"
                />
              )}
              {equippedSuit?.image && (
                <img
                  src={equippedSuit.image}
                  alt={equippedSuit.name}
                  className="absolute bottom-0 left-1/2 h-28 w-28 -translate-x-1/2 rounded-2xl object-cover ring-2 ring-primary/40 sm:h-40 sm:w-40"
                />
              )}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Pilot
            </p>
          </div>

          {/* Ship + effect */}
          <div className="relative z-10 flex flex-col items-center justify-end gap-2">
            <div className="relative h-40 w-full sm:h-56">
              {/* animated effect trail */}
              <div className="absolute inset-0 -z-0 overflow-hidden rounded-2xl">
                <div
                  className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl opacity-70 animate-pulse sm:h-56 sm:w-56"
                  style={{
                    background: equippedEffect?.swatch ?? "transparent",
                    animationDuration: "2.5s",
                  }}
                />
                <div
                  className="absolute -bottom-2 left-1/2 h-3 w-24 -translate-x-1/2 rounded-full blur-md sm:w-36"
                  style={{
                    background: equippedEffect?.swatch ?? "linear-gradient(90deg,#22d3ee,#a855f7)",
                    animation: "pulse 1.4s ease-in-out infinite",
                  }}
                />
              </div>
              {equippedShip?.image && (
                <img
                  src={equippedShip.image}
                  alt={equippedShip.name}
                  className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-2xl object-contain drop-shadow-[0_0_24px_rgba(59,130,246,0.55)] sm:h-52 sm:w-52"
                  style={{ animation: "float 3.5s ease-in-out infinite" }}
                />
              )}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
