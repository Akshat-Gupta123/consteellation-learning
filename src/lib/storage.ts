import type { Galaxy, GalaxyProgress } from "./types";

/**
 * Legacy localStorage shim. Constellation now stores all learning data in
 * Lovable Cloud per signed-in user. These helpers only exist to MIGRATE
 * pre-cloud galaxies into the user's account on first sign-in, then they're
 * cleared.
 */

const GALAXIES_KEY = "constellation.galaxies";
const PROGRESS_KEY = "constellation.progress";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadLocalGalaxies(): Galaxy[] {
  if (typeof window === "undefined") return [];
  return safeParse<Galaxy[]>(window.localStorage.getItem(GALAXIES_KEY), []);
}

export function loadLocalProgress(): Record<string, GalaxyProgress> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, GalaxyProgress>>(
    window.localStorage.getItem(PROGRESS_KEY),
    {},
  );
}

export function clearLocalConstellationData(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GALAXIES_KEY);
  window.localStorage.removeItem(PROGRESS_KEY);
}
