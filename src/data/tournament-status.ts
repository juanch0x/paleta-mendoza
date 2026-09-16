import { parseTournamentStatusCsv, type TournamentStatus } from "./csv.js";
import { fetchCsv, type FetchLike } from "./fetch-csv.js";

/**
 * Operational status is intentionally independent from the fixture load. A bad
 * or unavailable optional sheet must never prevent the tournament from loading.
 */
export async function loadTournamentStatus(
  url: string,
  fetcher?: FetchLike
): Promise<TournamentStatus | undefined> {
  try {
    const csv = await fetchCsv(url, fetcher);
    return parseTournamentStatusCsv(csv);
  } catch {
    return undefined;
  }
}
