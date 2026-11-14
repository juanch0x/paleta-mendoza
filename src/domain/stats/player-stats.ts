import { parseSets } from "../parse-sets.js";
import type { Participante, PartidoResuelto } from "../types.js";
import { extractPlayers, findPlayers } from "./players.js";

export type StatsTournament = {
  partidos: readonly PartidoResuelto[];
};

export type PlayerStatsQuery = {
  playerName: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type PlayerStats = {
  playerName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winPercentage: number | null;
};

/** Counts valid results in whole tournaments overlapping the requested dates. */
export function getPlayerStats(
  tournaments: readonly StatsTournament[],
  query: PlayerStatsQuery
): PlayerStats {
  validateDateRange(query);
  let wins = 0;
  let losses = 0;

  for (const tournament of tournaments) {
    if (!overlapsDateRange(tournament, query)) continue;

    for (const match of tournament.partidos) {
      if (query.category !== undefined && match.categoria !== query.category)
        continue;
      if (match.a.tipo !== "pareja" || match.b.tipo !== "pareja") continue;

      const playsA = includesPlayer(match.a, query.playerName);
      const playsB = includesPlayer(match.b, query.playerName);
      if (playsA === playsB) continue;

      // Snapshots contain tuples; use the existing parser as the single validator.
      let sets;
      try {
        sets = parseSets(match.sets.map(set => set.join("-")).join(" "));
      } catch {
        continue;
      }
      if (sets.length === 0) continue;

      const setsWonByA = sets.filter(([a, b]) => a > b).length;
      const won = playsA === setsWonByA > sets.length / 2;
      if (won) wins += 1;
      else losses += 1;
    }
  }

  const matchesPlayed = wins + losses;
  return {
    playerName: query.playerName,
    matchesPlayed,
    wins,
    losses,
    winPercentage: matchesPlayed === 0 ? null : (wins / matchesPlayed) * 100,
  };
}

function includesPlayer(participant: Participante, name: string): boolean {
  return (
    participant.tipo === "pareja" &&
    findPlayers(extractPlayers([participant.pareja]), name).status === "matched"
  );
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function validateDateRange({ dateFrom, dateTo }: PlayerStatsQuery): void {
  for (const date of [dateFrom, dateTo]) {
    if (date !== undefined && !isDate(date))
      throw new Error(
        "Dates must be valid calendar dates in YYYY-MM-DD format"
      );
  }
  if (dateFrom !== undefined && dateTo !== undefined && dateFrom > dateTo)
    throw new Error("dateFrom must not be after dateTo");
}

function overlapsDateRange(
  tournament: StatsTournament,
  { dateFrom, dateTo }: PlayerStatsQuery
): boolean {
  if (dateFrom === undefined && dateTo === undefined) return true;

  let start: string | undefined;
  let end: string | undefined;
  for (const { fecha } of tournament.partidos) {
    if (fecha === undefined || !isDate(fecha)) continue;
    if (start === undefined || fecha < start) start = fecha;
    if (end === undefined || fecha > end) end = fecha;
  }

  if (start === undefined || end === undefined) return false;
  return (
    (dateFrom === undefined || end >= dateFrom) &&
    (dateTo === undefined || start <= dateTo)
  );
}
