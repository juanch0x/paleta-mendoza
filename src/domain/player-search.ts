import type { Player } from "./player.js";
import { normalizePlayerName } from "./player-names.js";

/** Players whose official name contains the query, ignoring accents and case. */
export function filterPlayers<T extends Pick<Player, "nombreOficial">>(
  players: readonly T[],
  query: string
): T[] {
  const needle = normalizePlayerName(query);
  if (!needle) return [...players];
  return players.filter(player =>
    normalizePlayerName(player.nombreOficial).includes(needle)
  );
}
