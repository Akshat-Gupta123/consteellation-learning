import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FREE_ITEM_IDS, GARAGE_ITEMS, getItem } from "./garage-catalog";
import type { AvatarCustomization, Profile } from "./types";

const DEFAULT_AVATAR: AvatarCustomization = {
  suit: "suit_basic",
  helmet: "helmet_basic",
  ship: "ship_basic",
  effect: "effect_none",
};

function parseAvatar(raw: unknown): AvatarCustomization {
  if (raw && typeof raw === "object") {
    const r = raw as Partial<AvatarCustomization>;
    return {
      suit: r.suit ?? DEFAULT_AVATAR.suit,
      helmet: r.helmet ?? DEFAULT_AVATAR.helmet,
      ship: r.ship ?? DEFAULT_AVATAR.ship,
      effect: r.effect ?? DEFAULT_AVATAR.effect,
    };
  }
  return DEFAULT_AVATAR;
}

/** Loads the user's profile, auto-creating it if the trigger hasn't fired yet. */
export const getProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Profile> => {
    let { data } = await context.supabase
      .from("profiles")
      .select("id,email,display_name,ic,avatar_customization,streak_days")
      .eq("id", context.userId)
      .maybeSingle();

    if (!data) {
      // backstop: create row if trigger didn't catch a signup
      const upsert = await context.supabase
        .from("profiles")
        .upsert({ id: context.userId })
        .select("id,email,display_name,ic,avatar_customization,streak_days")
        .single();
      data = upsert.data ?? null;
    }

    return {
      id: context.userId,
      email: data?.email ?? null,
      displayName: data?.display_name ?? null,
      ic: data?.ic ?? 0,
      streakDays: data?.streak_days ?? 0,
      avatar: parseAvatar(data?.avatar_customization),
    };
  });

export const listInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { data } = await context.supabase
      .from("inventory")
      .select("item_id")
      .eq("user_id", context.userId);
    const owned = new Set((data ?? []).map((r) => r.item_id as string));
    // Free starter items are always owned
    for (const id of FREE_ITEM_IDS) owned.add(id);
    return Array.from(owned);
  });

export const purchaseItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ itemId: z.enum(GARAGE_ITEMS.map((i) => i.id) as [string, ...string[]]) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ic: number; owned: string[] }> => {
    const item = getItem(data.itemId);
    if (!item) throw new Error("Unknown item");

    // Already owned?
    const inv = await context.supabase
      .from("inventory")
      .select("item_id")
      .eq("user_id", context.userId);
    const owned = new Set((inv.data ?? []).map((r) => r.item_id as string));
    for (const id of FREE_ITEM_IDS) owned.add(id);
    if (owned.has(item.id)) throw new Error("You already own that item.");

    // Check balance
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("ic")
      .eq("id", context.userId)
      .maybeSingle();
    const balance = prof?.ic ?? 0;
    if (balance < item.price) throw new Error("Not enough Interstellar Currency.");

    // Deduct + record
    const next = balance - item.price;
    const { error: upErr } = await context.supabase
      .from("profiles")
      .update({ ic: next })
      .eq("id", context.userId);
    if (upErr) throw new Error(upErr.message);

    await context.supabase
      .from("inventory")
      .insert({ user_id: context.userId, item_id: item.id });

    owned.add(item.id);
    return { ic: next, owned: Array.from(owned) };
  });

export const equipItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ itemId: z.enum(GARAGE_ITEMS.map((i) => i.id) as [string, ...string[]]) })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<AvatarCustomization> => {
    const item = getItem(data.itemId);
    if (!item) throw new Error("Unknown item");

    // Ownership check
    if (!FREE_ITEM_IDS.includes(item.id)) {
      const owned = await context.supabase
        .from("inventory")
        .select("item_id")
        .eq("user_id", context.userId)
        .eq("item_id", item.id)
        .maybeSingle();
      if (!owned.data) throw new Error("You don't own that item yet.");
    }

    const { data: prof } = await context.supabase
      .from("profiles")
      .select("avatar_customization")
      .eq("id", context.userId)
      .maybeSingle();
    const avatar = parseAvatar(prof?.avatar_customization);
    avatar[item.slot] = item.id;

    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_customization: avatar as never })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return avatar;
  });
