import { construirPartidos } from "../domain/resolver.js"
import type { Pareja, PartidoResuelto } from "../domain/types.js"
import { parseParejasCsv, parsePartidosCsv } from "./csv.js"
import { fetchCsv, type FetchLike } from "./fetch-csv.js"

export type ActiveTournamentSource = {
  parejasUrl: string
  partidosUrl: string
}

export type ActiveTournament = {
  parejas: Pareja[]
  partidos: PartidoResuelto[]
}

export async function loadActiveTournament(
  source: ActiveTournamentSource,
  fetcher: FetchLike = fetch,
): Promise<ActiveTournament> {
  const [parejasCsv, partidosCsv] = await Promise.all([
    fetchCsv(source.parejasUrl, fetcher),
    fetchCsv(source.partidosUrl, fetcher),
  ])

  const parejas = parseParejasCsv(parejasCsv)
  const partidos = construirPartidos(parsePartidosCsv(partidosCsv), new Map(parejas.map((pareja) => [pareja.id, pareja])))

  return { parejas, partidos }
}
