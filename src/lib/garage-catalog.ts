import type { GarageItem, GarageSlot } from "./types";
import suit_basic from "@/assets/garage/suit_basic.jpg";
import suit_aurora from "@/assets/garage/suit_aurora.jpg";
import suit_solarflare from "@/assets/garage/suit_solarflare.jpg";
import helmet_basic from "@/assets/garage/helmet_basic.jpg";
import helmet_visor from "@/assets/garage/helmet_visor.jpg";
import helmet_nova from "@/assets/garage/helmet_nova.jpg";
import ship_basic from "@/assets/garage/ship_basic.jpg";
import ship_orbit from "@/assets/garage/ship_orbit.jpg";
import ship_starforge from "@/assets/garage/ship_starforge.jpg";
import effect_none from "@/assets/garage/effect_none.jpg";
import effect_stardust from "@/assets/garage/effect_stardust.jpg";
import effect_supernova from "@/assets/garage/effect_supernova.jpg";

const IMG: Record<string, string> = {
  suit_basic,
  suit_aurora,
  suit_solarflare,
  helmet_basic,
  helmet_visor,
  helmet_nova,
  ship_basic,
  ship_orbit,
  ship_starforge,
  effect_none,
  effect_stardust,
  effect_supernova,
};

/**
 * The Space Garage cosmetic catalog. Items are referenced by id from the
 * database (profile.avatar_customization and the inventory table) but the
 * actual metadata lives here so we don't need a CMS.
 *
 * "*_basic" items are free starter pieces every user already owns and equips.
 */
export const GARAGE_ITEMS: GarageItem[] = [
  // Suits
  {
    id: "suit_basic",
    image: IMG.suit_basic,
    slot: "suit",
    name: "Cadet Suit",
    description: "Standard issue navy thermal weave. Reliable.",
    price: 0,
    rarity: "Standard",
    swatch: "linear-gradient(135deg,#1e2a5e,#3b4a8a)",
  },
  {
    id: "suit_aurora",
    image: IMG.suit_aurora,
    slot: "suit",
    name: "Aurora Suit",
    description: "Shimmering panels echo distant nebulae.",
    price: 250,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#0e7490,#7c3aed)",
  },
  {
    id: "suit_solarflare",
    image: IMG.suit_solarflare,
    slot: "suit",
    name: "Solar Flare Suit",
    description: "Reactive heat-shield plates pulse with light.",
    price: 600,
    rarity: "Legendary",
    swatch: "linear-gradient(135deg,#f59e0b,#dc2626)",
  },

  // Helmets
  {
    id: "helmet_basic",
    image: IMG.helmet_basic,
    slot: "helmet",
    name: "Cadet Helmet",
    description: "Single-visor learner's helmet.",
    price: 0,
    rarity: "Standard",
    swatch: "linear-gradient(135deg,#475569,#94a3b8)",
  },
  {
    id: "helmet_visor",
    image: IMG.helmet_visor,
    slot: "helmet",
    name: "Wideband Visor",
    description: "Panoramic HUD with constellation overlay.",
    price: 200,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#22d3ee,#3b82f6)",
  },
  {
    id: "helmet_nova",
    image: IMG.helmet_nova,
    slot: "helmet",
    name: "Nova Crown",
    description: "Iridescent halo channels Nova's signal.",
    price: 750,
    rarity: "Legendary",
    swatch: "linear-gradient(135deg,#fde047,#a855f7)",
  },

  // Ships
  {
    id: "ship_basic",
    image: IMG.ship_basic,
    slot: "ship",
    name: "Scout Glider",
    description: "Single-seat training glider. Quick and quiet.",
    price: 0,
    rarity: "Standard",
    swatch: "linear-gradient(135deg,#334155,#64748b)",
  },
  {
    id: "ship_orbit",
    image: IMG.ship_orbit,
    slot: "ship",
    name: "Orbit Runner",
    description: "Twin-thruster ship for long-haul learning runs.",
    price: 400,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#0891b2,#1e40af)",
  },
  {
    id: "ship_starforge",
    image: IMG.ship_starforge,
    slot: "ship",
    name: "Starforge Cruiser",
    description: "Capital-class cruiser with constellation drive.",
    price: 1200,
    rarity: "Legendary",
    swatch: "linear-gradient(135deg,#9333ea,#ec4899)",
  },

  // Effects
  {
    id: "effect_none",
    image: IMG.effect_none,
    slot: "effect",
    name: "No Effect",
    description: "A clean cockpit. Pure focus.",
    price: 0,
    rarity: "Standard",
    swatch: "linear-gradient(135deg,#0f172a,#1e293b)",
  },
  {
    id: "effect_stardust",
    image: IMG.effect_stardust,
    slot: "effect",
    name: "Stardust Trail",
    description: "Leaves a soft trail of stardust behind your ship.",
    price: 150,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#e0e7ff,#f0abfc)",
  },
  {
    id: "effect_supernova",
    image: IMG.effect_supernova,
    slot: "effect",
    name: "Supernova Burst",
    description: "A radiant burst plays on lesson completion.",
    price: 500,
    rarity: "Legendary",
    swatch: "linear-gradient(135deg,#facc15,#f97316)",
  },
];

export const SLOTS: { id: GarageSlot; label: string }[] = [
  { id: "suit",
    image: IMG.suit, label: "Suit" },
  { id: "helmet",
    image: IMG.helmet, label: "Helmet" },
  { id: "ship",
    image: IMG.ship, label: "Ship" },
  { id: "effect",
    image: IMG.effect, label: "Effect" },
];

export function getItem(id: string): GarageItem | undefined {
  return GARAGE_ITEMS.find((i) => i.id === id);
}

export const FREE_ITEM_IDS = GARAGE_ITEMS.filter((i) => i.price === 0).map((i) => i.id);

/**
 * IC reward economy (kept here so server fns and UI agree).
 */
export const IC_REWARDS = {
  CORRECT_ANSWER: 5,
  STAR_COMPLETE: 25,
  GALAXY_COMPLETE_BONUS: 100,
  STREAK_DAILY: 10,
} as const;
