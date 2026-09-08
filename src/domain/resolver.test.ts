import { describe, expect, it } from "vitest"

import { construirPartidos, crearResolver } from "./resolver.js"
import type { Pareja, PartidoRaw } from "./types.js"

const parejas = new Map<string, Pareja>([
  ["3A-1", { id: "3A-1", nombre: "Castro/Calderón", categoria: "Tercera", zona: "A" }],
  ["3A-2", { id: "3A-2", nombre: "Tello/Berna", categoria: "Tercera", zona: "A" }],
  ["3B-1", { id: "3B-1", nombre: "Latuf/Corso", categoria: "Tercera", zona: "B" }],
  ["3B-2", { id: "3B-2", nombre: "Portugal/Guerra", categoria: "Tercera", zona: "B" }],
])

const semi = (sets: string): PartidoRaw => ({
  id: "40",
  categoria: "Tercera",
  fase: "semi",
  pareja_a: "3A-1",
  pareja_b: "3B-1",
  sets,
})

describe("crearResolver", () => {
  it("resolves a direct pair id", () => {
    const resolve = crearResolver([], parejas)
    expect(resolve("3B-2")).toEqual({ tipo: "pareja", pareja: parejas.get("3B-2") })
  })

  it("keeps a final renderable while its semifinal is pending", () => {
    const resolve = crearResolver([semi("")], parejas)
    expect(resolve("G:40")).toEqual({ tipo: "label", label: "Ganador semi 40" })
    expect(resolve("P:40")).toEqual({ tipo: "label", label: "Perdedor semi 40" })
  })

  it("resolves the winner and loser of a completed match", () => {
    const resolve = crearResolver([semi("12-9 8-12 6-7")], parejas)
    expect(resolve("G:40")).toEqual({ tipo: "pareja", pareja: parejas.get("3B-1") })
    expect(resolve("P:40")).toEqual({ tipo: "pareja", pareja: parejas.get("3A-1") })
  })

  it("resolves chained winner references recursively", () => {
    const resolve = crearResolver(
      [
        {
          id: "30",
          categoria: "Tercera",
          fase: "cuartos",
          pareja_a: "3A-1",
          pareja_b: "3A-2",
          sets: "12-8 12-9",
        },
        {
          ...semi("12-9 12-8"),
          pareja_a: "G:30",
        },
      ],
      parejas,
    )

    expect(resolve("G:40")).toEqual({ tipo: "pareja", pareja: parejas.get("3A-1") })
  })

  it("keeps invalid references visible instead of throwing", () => {
    const resolve = crearResolver([], parejas)
    expect(resolve("G:999")).toEqual({ tipo: "label", label: "⚠ G:999" })
  })
})

describe("construirPartidos", () => {
  it("builds resolved matches without any explicit status field", () => {
    const [partido] = construirPartidos([semi("12-0 12-0")], parejas)
    expect(partido.sets).toEqual([[12, 0], [12, 0]])
    expect(partido.a).toEqual({ tipo: "pareja", pareja: parejas.get("3A-1") })
    expect("estado" in partido).toBe(false)
  })
})
