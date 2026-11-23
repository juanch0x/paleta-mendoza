import type { Player } from "./player.js";

/** Lowercases and strips accents so "Núñez" and "nunez" compare equal. */
const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Players whose official name contains the query, ignoring accents and case. */
export function filterPlayers<T extends Pick<Player, "nombreOficial">>(
  players: readonly T[],
  query: string
): T[] {
  const needle = normalize(query.trim());
  if (!needle) return [...players];
  return players.filter(player =>
    normalize(player.nombreOficial).includes(needle)
  );
}
