import { describe, expect, it } from "vitest"

import { buildStandings } from "../domain/standings.js"
import { loadActiveTournament } from "./active-tournament.js"
import { fetchCsv, type FetchLike } from "./fetch-csv.js"

const parejasCsv = `id,categoria,zona,jugador_1,jugador_2
3A-1,Tercera,A,Fabián Tello,Diego Berna
3B-1,Tercera,B,Bautista Latuf,Ignacio Corso
3B-2,Tercera,B,Juan Portugal,Martín Guerra`

const partidosCsv = `id,fecha,hora,categoria,fase,zona,pareja_a,pareja_b,sets,nota
30,2026-08-17,19:00,Tercera,grupo,B,3B-1,3B-2,12-8 12-9,
40,2026-08-27,20:30,Tercera,semi,,3A-1,3B-1,12-9 8-12 6-7,
42,2026-08-28,19:30,Tercera,final,,G:40,3B-2,,`

const source = {
  parejasUrl: "https://example.test/parejas.csv",
  partidosUrl: "https://example.test/partidos.csv",
}

const successfulFetch: FetchLike = async (url) => ({
  ok: true,
  status: 200,
  text: async () => (url === source.parejasUrl ? parejasCsv : partidosCsv),
})

describe("loadActiveTournament", () => {
  it("runs the published CSVs through parsing and recursive resolution", async () => {
    const torneo = await loadActiveTournament(source, successfulFetch)
    const final = torneo.partidos.find((partido) => partido.id === "42")!
    const zonaB = torneo.parejas.filter((pareja) => pareja.zona === "B")
    const partidosGrupoB = torneo.partidos.filter((partido) => partido.fase === "grupo" && partido.zona === "B")

    expect(final.a).toEqual({ tipo: "pareja", pareja: expect.objectContaining({ id: "3B-1" }) })
    expect(final.sets).toEqual([])
    expect(buildStandings(zonaB, partidosGrupoB).map((row) => row.pareja.id)).toEqual(["3B-1", "3B-2"])
  })
})

describe("fetchCsv", () => {
  it("surfaces failed HTTP responses", async () => {
    const failedFetch: FetchLike = async () => ({ ok: false, status: 503, text: async () => "" })

    await expect(fetchCsv("https://example.test/unavailable.csv", failedFetch)).rejects.toThrow("respondió 503")
  })

  it("surfaces network failures", async () => {
    const offlineFetch: FetchLike = async () => {
      throw new Error("offline")
    }

    await expect(fetchCsv("https://example.test/offline.csv", offlineFetch)).rejects.toThrow("No se pudo descargar")
  })
})
