This is a fairly big polish pass. Here's what I'll do, grouped so you can push back on any piece before I build it.

## 1. Garage preview fixes (visual only)

- Move the pilot and ship down so the ship hovers just above the moon surface (currently both float in mid-air).
- Fix the helmet alignment: instead of aligning to the image bounding box, position the helmet so its base sits exactly on the suit's neck ring. I'll do this by adding per-item anchor offsets (helmet `neckY`, suit `neckY`, suit `feetY`) in `garage-catalog.ts` so the math is based on the actual artwork, not the PNG borders. Pilot's feet will be anchored to the moon ground line.
- Add a subtle hover bob to the ship only; pilot stays planted.

## 2. New "Terrain" slot + planets to buy

- Add a 5th garage slot: **Terrain** (the world your pilot stands on).
- Ship 6 terrains: Moon (free starter), Mars, Ice World, Lava World, Gas Giant Orbit, Alien Jungle. The garage preview swaps the background + ground image based on the equipped terrain.
- Requires a tiny DB tweak: extend the `avatar_customization` default to include `terrain: "terrain_moon"`. Existing users get a fallback in code.

## 3. Expand the catalog to ~25 items, rebalance prices

Roughly:
- 5 suits, 5 helmets, 5 ships, 5 effects, 6 terrains (25 total, up from 12).
- Three tiers with new pricing: Standard (free starter), Rare ~600–900 IC, Legendary ~2,500–4,000 IC.
- Bump IC rewards slightly so the new economy still feels reachable but takes real play:
  - Correct first try: 5 → 8
  - Correct second try: new, 3
  - Star complete: 25 → 40
  - Galaxy bonus: 100 → 150

I'll generate the new images in parallel (transparent PNGs, consistent art style with what's already there).

## 4. Quiz scoring change (the "infinite tries" bug)

In `MCQCard` + lesson route:
- Max **2 attempts** per question. After a wrong second attempt, the correct answer is revealed and we move on.
- IC awarded per question: 8 if right on attempt 1, 3 if right on attempt 2, 0 otherwise.
- Wrong answers stay greyed out so you can't re-click them.
- Nova's 2-question allowance stays the same.

## 5. Achievements

New `achievements` table + `user_achievements` join table (with RLS + GRANTs). Achievements are unlocked server-side at the end of `completeStar` / quiz finish. Ship ~10 to start, e.g.:
- First Star, First Galaxy, 7-Day Streak, Perfect Quiz (10/10 first try), Speed Learner (galaxy in one day), Big Spender (1k IC spent), Collector (own 10 items), Nova Whisperer (finish a galaxy without asking Nova), etc.

Surface them in a new `/achievements` page linked from the home/garage header, plus a toast when one unlocks. No IC reward attached — pure prestige, so it stays a separate progression track.

## 6. Polish pass (small but high-impact)

- Consistent page headers, spacing, and empty states across `/`, `/garage`, `/generate`, `/lesson`.
- Smoother transitions between lesson phases (core → steps → quiz → summary) with `animate-fade-in`.
- Replace the remaining "sparkle" placeholders with real iconography.
- Real loading skeletons (not just spinners) on the home galaxy web and garage catalog.
- Tighten copy so it reads less like a demo and more like a product.

## Technical notes

- New migration: `terrain` in avatar default + `achievements` and `user_achievements` tables with proper RLS/GRANTs and a `has_achievement(uuid, text)` helper. Achievement unlocks happen in `profile.functions.ts` / `lesson.functions.ts` handlers using `supabaseAdmin` after auth check.
- New assets in `src/assets/garage/` (terrains + new suits/helmets/ships/effects).
- New route: `src/routes/_authenticated/achievements.tsx`.
- Updated files: `garage-catalog.ts`, `types.ts`, `garage.tsx`, `MCQCard.tsx`, lesson route, profile/lesson server fns, home + nav.

## What this will cost

This is a meaningful chunk of work — mostly the ~13 new image generations and the achievement plumbing. If you want to cut scope, the easiest pieces to drop are: (a) the full 25-item catalog (I could ship 18 instead), (b) achievements (defer to next pass), or (c) the terrain slot (keep the moon as the only world for now). Tell me which, if any, to trim and I'll start.