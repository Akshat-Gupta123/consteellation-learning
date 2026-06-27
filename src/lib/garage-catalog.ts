import type { GarageItem, GarageSlot } from "./types";
import suit_basic from "@/assets/garage/suit_basic.png";
import suit_aurora from "@/assets/garage/suit_aurora.png";
import suit_solarflare from "@/assets/garage/suit_solarflare.png";
import suit_emerald from "@/assets/garage/suit_emerald.png";
import suit_void from "@/assets/garage/suit_void.png";
import helmet_basic from "@/assets/garage/helmet_basic.png";
import helmet_visor from "@/assets/garage/helmet_visor.png";
import helmet_nova from "@/assets/garage/helmet_nova.png";
import helmet_solaris from "@/assets/garage/helmet_solaris.png";
import ship_basic from "@/assets/garage/ship_basic.png";
import ship_orbit from "@/assets/garage/ship_orbit.png";
import ship_starforge from "@/assets/garage/ship_starforge.png";
import ship_nebula from "@/assets/garage/ship_nebula.png";
import effect_stardust from "@/assets/garage/effect_stardust.png";
import effect_supernova from "@/assets/garage/effect_supernova.png";
import terrain_moon from "@/assets/garage/moon_surface.jpg";
import terrain_mars from "@/assets/garage/terrain_mars.jpg";
import terrain_ice from "@/assets/garage/terrain_ice.jpg";
import terrain_lava from "@/assets/garage/terrain_lava.jpg";

const effect_none =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * The Space Garage cosmetic catalog. "*_basic"/starter items are free.
 *
 * neckY / baseY (0–1, from top) let the garage preview line up helmets to
 * the actual artwork instead of the PNG bounding box, so the helmet sits
 * ON the suit's neck ring.
 */
export const GARAGE_ITEMS: GarageItem[] = [
  // ── Suits ────────────────────────────────────────────────────────────────
  {
    id: "suit_basic",
    image: suit_basic,
    slot: "suit",
    name: "Cadet Suit",
    description: "Standard issue navy thermal weave. Reliable.",
    price: 0,
    rarity: "Standard",
    swatch: "linear-gradient(135deg,#1e2a5e,#3b4a8a)",
    neckY: 0.16,
  },
  {
    id: "suit_aurora",
    image: suit_aurora,
    slot: "suit",
    name: "Aurora Suit",
    description: "Shimmering panels echo distant nebulae.",
    price: 650,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#0e7490,#7c3aed)",
    neckY: 0.16,
  },
  {
    id: "suit_solarflare",
    image: suit_solarflare,
    slot: "suit",
    name: "Solar Flare Suit",
    description: "Reactive heat-shield plates pulse with light.",
    price: 2800,
    rarity: "Legendary",
    swatch: "linear-gradient(135deg,#f59e0b,#dc2626)",
    neckY: 0.16,
  },
  {
    id: "suit_emerald",
    image: suit_emerald,
    slot: "suit",
    name: "Emerald Voyager",
    description: "Field-tested suit favoured by deep-system explorers.",
    price: 1200,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#065f46,#fb923c)",
    includesHelmet: true,
  },
  {
    id: "suit_void",
    image: suit_void,
    slot: "suit",
    name: "Void Operative",
    description: "Stealth-class shell wired with magenta runlights.",
    price: 3400,
    rarity: "Legendary",
    swatch: "linear-gradient(135deg,#0a0a0a,#d946ef)",
    includesHelmet: true,
  },

  // ── Helmets ─────────────────────────────────────────────────────────────
  {
    id: "helmet_basic",
    image: helmet_basic,
    slot: "helmet",
    name: "Cadet Helmet",
    description: "Single-visor learner's helmet.",
    price: 0,
    rarity: "Standard",
    swatch: "linear-gradient(135deg,#475569,#94a3b8)",
    baseY: 0.92,
  },
  {
    id: "helmet_visor",
    image: helmet_visor,
    slot: "helmet",
    name: "Wideband Visor",
    description: "Panoramic HUD with constellation overlay.",
    price: 700,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#22d3ee,#3b82f6)",
    baseY: 0.92,
  },
  {
    id: "helmet_solaris",
    image: helmet_solaris,
    slot: "helmet",
    name: "Solaris Dome",
    description: "Gold-mirrored visor with antenna relay.",
    price: 1400,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#fef3c7,#f59e0b)",
    baseY: 0.92,
  },
  {
    id: "helmet_nova",
    image: helmet_nova,
    slot: "helmet",
    name: "Nova Crown",
    description: "Iridescent halo channels Nova's signal.",
    price: 3200,
    rarity: "Legendary",
    swatch: "linear-gradient(135deg,#fde047,#a855f7)",
    baseY: 0.92,
  },

  // ── Ships ───────────────────────────────────────────────────────────────
  {
    id: "ship_basic",
    image: ship_basic,
    slot: "ship",
    name: "Scout Glider",
    description: "Single-seat training glider. Quick and quiet.",
    price: 0,
    rarity: "Standard",
    swatch: "linear-gradient(135deg,#334155,#64748b)",
  },
  {
    id: "ship_orbit",
    image: ship_orbit,
    slot: "ship",
    name: "Orbit Runner",
    description: "Twin-thruster ship for long-haul learning runs.",
    price: 1100,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#0891b2,#1e40af)",
  },
  {
    id: "ship_nebula",
    image: ship_nebula,
    slot: "ship",
    name: "Nebula Yacht",
    description: "Sleek teal-and-silver cruiser for the discerning cadet.",
    price: 1900,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#0d9488,#cbd5e1)",
  },
  {
    id: "ship_starforge",
    image: ship_starforge,
    slot: "ship",
    name: "Starforge Cruiser",
    description: "Capital-class cruiser with constellation drive.",
    price: 3800,
    rarity: "Legendary",
    swatch: "linear-gradient(135deg,#9333ea,#ec4899)",
  },

  // ── Effects ─────────────────────────────────────────────────────────────
  {
    id: "effect_none",
    image: effect_none,
    slot: "effect",
    name: "No Effect",
    description: "A clean cockpit. Pure focus.",
    price: 0,
    rarity: "Standard",
    swatch: "linear-gradient(135deg,#0f172a,#1e293b)",
  },
  {
    id: "effect_stardust",
    image: effect_stardust,
    slot: "effect",
    name: "Stardust Trail",
    description: "Leaves a soft trail of stardust behind your ship.",
    price: 500,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#e0e7ff,#f0abfc)",
  },
  {
    id: "effect_aurora",
    slot: "effect",
    name: "Aurora Wake",
    description: "Ribbons of teal and violet curl behind your engines.",
    price: 1500,
    rarity: "Rare",
    swatch: "linear-gradient(90deg,#22d3ee,#a855f7,#f0abfc)",
  },
  {
    id: "effect_supernova",
    image: effect_supernova,
    slot: "effect",
    name: "Supernova Burst",
    description: "A radiant burst plays on lesson completion.",
    price: 2500,
    rarity: "Legendary",
    swatch: "linear-gradient(135deg,#facc15,#f97316)",
  },

  // ── Terrains (the world you stand on) ──────────────────────────────────
  {
    id: "terrain_moon",
    image: terrain_moon,
    slot: "terrain",
    name: "Lunar Greys",
    description: "The classic cratered moon. Quiet, dusty, dependable.",
    price: 0,
    rarity: "Standard",
    swatch: "linear-gradient(135deg,#1f2937,#9ca3af)",
  },
  {
    id: "terrain_mars",
    image: terrain_mars,
    slot: "terrain",
    name: "Martian Flats",
    description: "Cracked red plains under a butterscotch sky.",
    price: 900,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#7c2d12,#f97316)",
  },
  {
    id: "terrain_ice",
    image: terrain_ice,
    slot: "terrain",
    name: "Glacier World",
    description: "Pale blue ice shelves splintered into a thousand panes.",
    price: 1600,
    rarity: "Rare",
    swatch: "linear-gradient(135deg,#bae6fd,#3b82f6)",
  },
  {
    id: "terrain_lava",
    image: terrain_lava,
    slot: "terrain",
    name: "Lava Forge",
    description: "A volcanic moon laced with bright orange veins.",
    price: 3000,
    rarity: "Legendary",
    swatch: "linear-gradient(135deg,#171717,#dc2626)",
  },
];

export const SLOTS: { id: GarageSlot; label: string }[] = [
  { id: "suit", label: "Suit" },
  { id: "helmet", label: "Helmet" },
  { id: "ship", label: "Ship" },
  { id: "effect", label: "Effect" },
  { id: "terrain", label: "Terrain" },
];

export function getItem(id: string): GarageItem | undefined {
  return GARAGE_ITEMS.find((i) => i.id === id);
}

export const FREE_ITEM_IDS = GARAGE_ITEMS.filter((i) => i.price === 0).map((i) => i.id);

/**
 * IC reward economy. With 20+ catalog items, top-tier prices in the
 * thousands, and the new 2-attempt quiz rule, these numbers keep the
 * full catalog reachable without trivialising it.
 */
export const IC_REWARDS = {
  CORRECT_FIRST_TRY: 8,
  CORRECT_SECOND_TRY: 3,
  STAR_COMPLETE: 40,
  GALAXY_COMPLETE_BONUS: 150,
  STREAK_DAILY: 10,
  /** Legacy alias kept for back-compat in older call sites. */
  CORRECT_ANSWER: 8,
} as const;
