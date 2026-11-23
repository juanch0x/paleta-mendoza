import type { Player } from "./player-stats.js";

/**
 * Normalises a full player name for matching: strips accents, lowercases and
 * collapses whitespace. The full name is always compared, never the surname
 * alone, because several families share surnames.
 */
export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns a lookup that finds the registry player whose official name matches. */
export function createPlayerMatcher(
  players: readonly Player[]
): (name: string) => Player | undefined {
  const byName = new Map(
    players.map(player => [normalizePlayerName(player.nombreOficial), player])
  );
  return name => byName.get(normalizePlayerName(name));
}
