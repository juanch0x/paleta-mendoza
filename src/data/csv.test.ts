import { describe, expect, it } from "vitest"

import { parseParejasCsv, parsePartidosCsv } from "./csv.js"

describe("parseParejasCsv", () => {
  it("normalizes names and ignores columns outside the domain contract", () => {
    const parejas = parseParejasCsv(`id,categoria,zona,jugador_1,jugador_2,estado
3A-1,Tercera,A,Fabián Tello,Diego Berna,activa`)

    expect(parejas).toEqual([
      { id: "3A-1", categoria: "Tercera", zona: "A", nombre: "Fabián Tello / Diego Berna" },
    ])
  })

  it("rejects duplicate ids", () => {
    const csv = `id,categoria,zona,jugador_1,jugador_2
3A-1,Tercera,A,Fabián Tello,Diego Berna
3A-1,Tercera,A,Erik Castro,Osvaldo Calderón`

    expect(() => parseParejasCsv(csv)).toThrow("id duplicado 3A-1")
  })
})

describe("parsePartidosCsv", () => {
  const headers = "id,dia,fecha,hora,categoria,fase,zona,pareja_a,equipo_a,pareja_b,equipo_b,sets,nota"

  it("ignores editorial columns and preserves only the raw match contract", () => {
    const partidos = parsePartidosCsv(`${headers}
40,Wed 27/8,2026-08-27,20:30,Tercera,semi,,3A-1,Fabián Tello / Diego Berna,3B-1,Bautista Latuf / Ignacio Corso,12-9 8-12 6-7,cruce declarado`)

    expect(partidos).toEqual([
      {
        id: "40",
        fecha: "2026-08-27",
        hora: "20:30",
        categoria: "Tercera",
        fase: "semi",
        pareja_a: "3A-1",
        pareja_b: "3B-1",
        sets: "12-9 8-12 6-7",
        nota: "cruce declarado",
      },
    ])
  })

  it("accepts a pending match with blank schedule and score", () => {
    const partidos = parsePartidosCsv(`${headers}
42,,,,Tercera,final,,G:40,G:40,G:41,G:41,,`)

    expect(partidos[0]).toMatchObject({ id: "42", pareja_a: "G:40", pareja_b: "G:41", sets: "" })
    expect(partidos[0].fecha).toBeUndefined()
  })

  it("rejects malformed dates, scores and duplicate ids", () => {
    expect(() => parsePartidosCsv(`${headers}
40,,27-08-2026,20:30,Tercera,semi,,3A-1,,3B-1,,12-9 12-8,`)).toThrow("Fecha inválida")
    expect(() => parsePartidosCsv(`${headers}
40,,2026-08-27,20:30,Tercera,semi,,3A-1,,3B-1,,12-9,`)).toThrow("dos o tres sets")
    expect(() => parsePartidosCsv(`${headers}
40,,2026-08-27,20:30,Tercera,semi,,3A-1,,3B-1,,12-9 12-8,
40,,2026-08-28,20:30,Tercera,final,,G:40,G:40,G:41,G:41,12-7 12-4,`)).toThrow("id duplicado 40")
  })
})
