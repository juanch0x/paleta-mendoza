import { loadHistoricalTournaments } from "../../data/load-historical-tournaments.js";
import {
  getPlayerStats,
  type PlayerStats,
} from "../../domain/stats/player-stats.js";
import {
  extractPlayers,
  findPlayers,
  type PlayerSearchResult,
} from "../../domain/stats/players.js";
import { playerSearchSchema } from "./player-search-schema.js";
import { playerStatsSchema } from "./player-stats-schema.js";

export type HistoricalPlayerStatsResult =
  | { status: "matched"; player: string; stats: PlayerStats }
  | Exclude<PlayerSearchResult, { status: "matched" }>;

async function loadPlayerContext() {
  const tournaments = await loadHistoricalTournaments();
  const players = extractPlayers(tournaments.flatMap(({ parejas }) => parejas));
  return { tournaments, players };
}

/** Loads historical players and searches without selecting spelling suggestions. */
export async function searchHistoricalPlayers(
  input: unknown
): Promise<PlayerSearchResult> {
  const { name } = playerSearchSchema.parse(input);
  const { players } = await loadPlayerContext();
  return findPlayers(players, name);
}

/** Resolves the player before calculating statistics from the same snapshots. */
export async function queryHistoricalPlayerStats(
  input: unknown
): Promise<HistoricalPlayerStatsResult> {
  const query = playerStatsSchema.parse(input);
  const { tournaments, players } = await loadPlayerContext();
  const result = findPlayers(players, query.playerName);
  if (result.status !== "matched") return result;

  return {
    ...result,
    stats: getPlayerStats(tournaments, {
      ...query,
      category: query.category ?? undefined,
      playerName: result.player,
    }),
  };
}
