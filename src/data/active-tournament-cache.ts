import type {
  ActiveTournament,
  ActiveTournamentSource,
} from "./active-tournament.js";

export const ACTIVE_TOURNAMENT_STALE_TIME = 2 * 60 * 1000;

type CachedTournament = {
  tournament: ActiveTournament;
  updatedAt: Date;
  isFresh: boolean;
};

type StoredTournament = {
  tournament: ActiveTournament;
  updatedAt: string;
};

const storageKey = (source: ActiveTournamentSource) =>
  `paleta-mendoza:active-tournament:${source.parejasUrl}:${source.partidosUrl}`;

const canUseStorage = () => typeof sessionStorage !== "undefined";

export function getCachedActiveTournament(
  source: ActiveTournamentSource
): CachedTournament | undefined {
  if (!canUseStorage()) return undefined;

  try {
    const value = sessionStorage.getItem(storageKey(source));
    if (!value) return undefined;

    const cached = JSON.parse(value) as StoredTournament;
    const updatedAt = new Date(cached.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) return undefined;

    return {
      tournament: cached.tournament,
      updatedAt,
      isFresh: Date.now() - updatedAt.getTime() < ACTIVE_TOURNAMENT_STALE_TIME,
    };
  } catch {
    return undefined;
  }
}

export function cacheActiveTournament(
  source: ActiveTournamentSource,
  tournament: ActiveTournament,
  updatedAt: Date
) {
  if (!canUseStorage()) return;

  try {
    sessionStorage.setItem(
      storageKey(source),
      JSON.stringify({ tournament, updatedAt: updatedAt.toISOString() })
    );
  } catch {
    // Storage is an optional performance optimization.
  }
}

export function wasPageReloaded() {
  if (typeof performance === "undefined") return false;

  return performance
    .getEntriesByType("navigation")
    .some(entry => (entry as PerformanceNavigationTiming).type === "reload");
}
