import type { Player } from "./player.js";

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

/**
 * Returns a lookup that finds the registry player whose official name, or one
 * of their aliases, matches.
 */
export function createPlayerMatcher(
  players: readonly Player[]
): (name: string) => Player | undefined {
  const byName = new Map(
    players.flatMap(player =>
      [player.nombreOficial, ...(player.alias ?? [])].map(
        name => [normalizePlayerName(name), player] as const
      )
    )
  );
  return name => byName.get(normalizePlayerName(name));
}
