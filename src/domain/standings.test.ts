import { describe, expect, it } from "vitest"

import { buildStandings } from "./standings.js"
import type { Pareja, Partido } from "./types.js"

const pareja = (id: string, nombre: string): Pareja => ({
  id,
  nombre,
  categoria: "Tercera",
  zona: "B",
})

const parejas = [
  pareja("3B-1", "Latuf/Corso"),
  pareja("3B-2", "Portugal/Guerra"),
  pareja("3B-3", "Fernández/Zulueta"),
  pareja("3B-4", "Palma/Rial"),
]

const byId = new Map(parejas.map((item) => [item.id, item]))
const ref = (id: string) => ({ tipo: "pareja" as const, pareja: byId.get(id)! })

const fixtureZonaB: Partido[] = [
  { id: "30", a: ref("3B-4"), b: ref("3B-1"), sets: [[8, 12], [2, 12]] },
  { id: "31", a: ref("3B-2"), b: ref("3B-1"), sets: [[5, 12], [3, 12]] },
  { id: "32", a: ref("3B-4"), b: ref("3B-3"), sets: [[12, 9], [9, 12], [7, 6]] },
  { id: "33", a: ref("3B-4"), b: ref("3B-2"), sets: [[9, 12], [10, 12]] },
  { id: "34", a: ref("3B-3"), b: ref("3B-2"), sets: [[3, 12], [7, 12]] },
  { id: "35", a: ref("3B-1"), b: ref("3B-3"), sets: [[12, 7], [12, 11]] },
]

describe("buildStandings", () => {
  it("reproduces the verified Tercera Zona B standings from the template", () => {
    const table = buildStandings(parejas, fixtureZonaB)

    expect(table.map(({ pareja, posicion, dP, dS, dT }) => ({ nombre: pareja.nombre, posicion, dP, dS, dT }))).toEqual([
      { nombre: "Latuf/Corso", posicion: 1, dP: 3, dS: 6, dT: 36 },
      { nombre: "Portugal/Guerra", posicion: 2, dP: 1, dS: 2, dT: 3 },
      { nombre: "Palma/Rial", posicion: 3, dP: -1, dS: -3, dT: -18 },
      { nombre: "Fernández/Zulueta", posicion: 4, dP: -3, dS: -5, dT: -21 },
    ])

    expect(table.reduce((total, row) => total + row.dP, 0)).toBe(0)
    expect(table.reduce((total, row) => total + row.dS, 0)).toBe(0)
    expect(table.reduce((total, row) => total + row.dT, 0)).toBe(0)
  })

  it("does not count pending matches, but keeps every zone participant visible", () => {
    const table = buildStandings(parejas, [
      { id: "pending", a: ref("3B-1"), b: ref("3B-2"), sets: [] },
    ])

    expect(table).toHaveLength(4)
    expect(table.every((row) => row.pg === 0 && row.tf === 0)).toBe(true)
    expect(table.map((row) => row.posicion)).toEqual([1, 1, 1, 1])
  })

  it("ignores unresolved participants instead of fabricating statistics", () => {
    const table = buildStandings(parejas, [
      { id: "semi", a: { tipo: "label", label: "1° Zona A" }, b: ref("3B-1"), sets: [[12, 8], [12, 7]] },
    ])

    expect(table.every((row) => row.pg === 0 && row.pp === 0)).toBe(true)
  })

  it("assigns shared positions when all three declared tiebreakers are equal", () => {
    const tied = buildStandings(parejas.slice(0, 2), [
      { id: "one", a: ref("3B-1"), b: ref("3B-2"), sets: [[12, 10], [10, 12], [7, 6]] },
      { id: "two", a: ref("3B-2"), b: ref("3B-1"), sets: [[12, 10], [10, 12], [7, 6]] },
    ])

    expect(tied.map(({ pareja: item, posicion, dP, dS, dT }) => ({ id: item.id, posicion, dP, dS, dT }))).toEqual([
      { id: "3B-1", posicion: 1, dP: 0, dS: 0, dT: 0 },
      { id: "3B-2", posicion: 1, dP: 0, dS: 0, dT: 0 },
    ])
  })

  it("skips the following position after a shared rank", () => {
    const table = buildStandings(parejas, [
      { id: "completed", a: ref("3B-1"), b: ref("3B-2"), sets: [[12, 0], [12, 0]] },
    ])

    expect(table.map(({ pareja: item, posicion }) => ({ id: item.id, posicion }))).toEqual([
      { id: "3B-1", posicion: 1 },
      { id: "3B-3", posicion: 2 },
      { id: "3B-4", posicion: 2 },
      { id: "3B-2", posicion: 4 },
    ])
  })
})
