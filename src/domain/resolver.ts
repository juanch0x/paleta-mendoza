import { parseSets } from "./parse-sets.js"
import type { Pareja, Participante, PartidoRaw, PartidoResuelto, SetScore } from "./types.js"

const REFERENCE = /^([GP]):(.+)$/

export function crearResolver(partidos: readonly PartidoRaw[], parejas: ReadonlyMap<string, Pareja>) {
  const byId = new Map(partidos.map((partido) => [partido.id, partido]))
  const cache = new Map<string, Participante>()

  function resolve(valor: string, depth = 0): Participante {
    const pareja = parejas.get(valor)
    if (pareja) return { tipo: "pareja", pareja }

    const match = REFERENCE.exec(valor)
    if (!match || depth > 8) return { tipo: "label", label: valor }
    if (cache.has(valor)) return cache.get(valor)!

    const [, resultType, partidoId] = match
    const partido = byId.get(partidoId)
    let resolved: Participante

    if (!partido) {
      resolved = { tipo: "label", label: `⚠ ${valor}` }
    } else {
      const winner = ganadorDe(parseSets(partido.sets))
      if (!winner) {
        const label = resultType === "G" ? "Ganador" : "Perdedor"
        resolved = { tipo: "label", label: `${label} ${partido.fase} ${partido.id}` }
      } else {
        const participant = (resultType === "G") === (winner === "a") ? partido.pareja_a : partido.pareja_b
        resolved = resolve(participant, depth + 1)
      }
    }

    cache.set(valor, resolved)
    return resolved
  }

  return resolve
}

export function construirPartidos(raws: readonly PartidoRaw[], parejas: ReadonlyMap<string, Pareja>): PartidoResuelto[] {
  const resolve = crearResolver(raws, parejas)

  return raws.map((raw) => ({
    id: raw.id,
    categoria: raw.categoria,
    fase: raw.fase,
    ...(raw.zona ? { zona: raw.zona } : {}),
    ...(raw.fecha ? { fecha: raw.fecha } : {}),
    ...(raw.hora ? { hora: raw.hora } : {}),
    ...(raw.nota ? { nota: raw.nota } : {}),
    a: resolve(raw.pareja_a),
    b: resolve(raw.pareja_b),
    sets: parseSets(raw.sets),
  }))
}

function ganadorDe(sets: readonly SetScore[]): "a" | "b" | undefined {
  if (sets.length === 0) return undefined

  const [setsA, setsB] = sets.reduce(
    ([a, b], [tantosA, tantosB]) => (tantosA > tantosB ? [a + 1, b] : [a, b + 1]),
    [0, 0],
  )

  return setsA > setsB ? "a" : "b"
}
