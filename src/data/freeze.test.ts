import { describe, expect, it } from "vitest"

import { freezeTournament } from "./freeze.js"

const parejasCsv = `id,categoria,zona,jugador_1,jugador_2
1A-1,Primera,A,Ana,Uno
1A-2,Primera,A,Beto,Dos`

describe("freezeTournament", () => {
  it("creates a validated historical snapshot from completed CSV data", () => {
    const partidosCsv = `id,fecha,hora,categoria,fase,zona,pareja_a,pareja_b,sets,nota
1,2026-09-01,20:00,Primera,grupo,A,1A-1,1A-2,12-8 12-9,`

    const tournament = freezeTournament({ slug: "prueba-2026", nombre: "Prueba", fecha: "Septiembre 2026" }, parejasCsv, partidosCsv)

    expect(tournament.alcance).toBe("Fase de grupos")
    expect(tournament.partidos).toHaveLength(1)
  })

  it("refuses to freeze a tournament with pending matches", () => {
    const partidosCsv = `id,fecha,hora,categoria,fase,zona,pareja_a,pareja_b,sets,nota
1,2026-09-01,20:00,Primera,grupo,A,1A-1,1A-2,,`

    expect(() => freezeTournament({ slug: "prueba-2026", nombre: "Prueba", fecha: "Septiembre 2026" }, parejasCsv, partidosCsv)).toThrow("sin resultado")
  })
})
