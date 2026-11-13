import type { Pareja } from "../types.js";

const cleanName = (name: string): string => name.trim().replace(/\s+/g, " ");

const normalizeName = (name: string): string =>
  cleanName(name).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Extracts unique players, preserving the first spelling and encounter order. */
export function extractPlayers(
  pairs: readonly Pick<Pareja, "nombre">[]
): string[] {
  const players = new Map<string, string>();

  for (const pair of pairs) {
    const members = pair.nombre.split("/").map(cleanName);
    if (members.length !== 2 || members.some(member => member === "")) continue;

    for (const member of members) {
      const key = normalizeName(member);
      if (!players.has(key)) players.set(key, member);
    }
  }

  return [...players.values()];
}

export type PlayerSearchResult =
  | { status: "matched"; player: string }
  | { status: "suggestions"; players: string[] }
  | { status: "not_found" };

/** Prefers exact names and otherwise suggests names one edit away. */
export function findPlayers(
  players: readonly string[],
  name: string
): PlayerSearchResult {
  const query = normalizeName(name);
  if (!query) return { status: "not_found" };

  const exact = players.find(player => normalizeName(player) === query);
  if (exact !== undefined) return { status: "matched", player: exact };

  const suggestions = players.filter(player =>
    isOneEditAway(normalizeName(player), query)
  );

  return suggestions.length > 0
    ? { status: "suggestions", players: suggestions }
    : { status: "not_found" };
}

/** Checks a Levenshtein distance of one without building a distance matrix. */
function isOneEditAway(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;
    if (a.length >= b.length) i += 1;
    if (b.length >= a.length) j += 1;
  }

  return edits + (a.length - i) + (b.length - j) === 1;
}
