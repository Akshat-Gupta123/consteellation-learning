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
