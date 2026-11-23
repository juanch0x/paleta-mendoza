import type { Pareja, Participante, SetScore } from "./types.js";

/**
 * Sets won by each side: a set goes to side a only when it scored more, any
 * other set goes to side b.
 */
export function setsWon(sets: readonly SetScore[]): [a: number, b: number] {
  const a = sets.filter(([home, away]) => home > away).length;
  return [a, sets.length - a];
}

export type MatchResult = { ganador: Pareja; perdedor: Pareja };

/**
 * Who won a match, for statistics: the pair that won more sets. A match
 * between unresolved participants, unscored or tied on sets has no winner.
 */
export function matchResult(partido: {
  a: Participante;
  b: Participante;
  sets: readonly SetScore[];
}): MatchResult | undefined {
  if (partido.a.tipo !== "pareja" || partido.b.tipo !== "pareja") return;
  const [a, b] = setsWon(partido.sets);
  if (a === b) return;
  return a > b
    ? { ganador: partido.a.pareja, perdedor: partido.b.pareja }
    : { ganador: partido.b.pareja, perdedor: partido.a.pareja };
}
