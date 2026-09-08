import { z } from "zod"

import { construirPartidos } from "../domain/resolver.js"
import type { Pareja, PartidoResuelto } from "../domain/types.js"
import { parseParejasCsv, parsePartidosCsv } from "./csv.js"

export type TournamentMetadata = {
  slug: string
  nombre: string
  fecha: string
}

export type FrozenTournament = TournamentMetadata & {
  alcance: string
  parejas: Pareja[]
  partidos: PartidoResuelto[]
}

const frozenTournamentSchema = z.object({
  slug: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
  fecha: z.string().trim().min(1),
  alcance: z.string().trim().min(1),
  parejas: z.array(z.object({ id: z.string(), categoria: z.string(), zona: z.string().optional(), nombre: z.string() })),
  partidos: z.array(
    z.object({
      id: z.string(),
      categoria: z.string(),
      fase: z.string(),
      zona: z.string().optional(),
      fecha: z.string().optional(),
      hora: z.string().optional(),
      nota: z.string().optional(),
      sets: z.array(z.tuple([z.number(), z.number()])),
      a: z.discriminatedUnion("tipo", [
        z.object({ tipo: z.literal("pareja"), pareja: z.object({ id: z.string(), categoria: z.string(), zona: z.string().optional(), nombre: z.string() }) }),
        z.object({ tipo: z.literal("label"), label: z.string() }),
      ]),
      b: z.discriminatedUnion("tipo", [
        z.object({ tipo: z.literal("pareja"), pareja: z.object({ id: z.string(), categoria: z.string(), zona: z.string().optional(), nombre: z.string() }) }),
        z.object({ tipo: z.literal("label"), label: z.string() }),
      ]),
    }),
  ),
})

export function freezeTournament(metadata: TournamentMetadata, parejasCsv: string, partidosCsv: string): FrozenTournament {
  const parejas = parseParejasCsv(parejasCsv)
  const partidos = construirPartidos(parsePartidosCsv(partidosCsv), new Map(parejas.map((pareja) => [pareja.id, pareja])))

  const pendientes = partidos.filter((partido) => partido.sets.length === 0)
  if (pendientes.length > 0) {
    throw new Error(`No se puede congelar: quedan ${pendientes.length} partido(s) sin resultado (${pendientes.map((partido) => partido.id).join(", ")}).`)
  }

  const unresolved = partidos.filter((partido) => partido.a.tipo !== "pareja" || partido.b.tipo !== "pareja")
  if (unresolved.length > 0) {
    throw new Error(`No se puede congelar: quedan referencias sin resolver (${unresolved.map((partido) => partido.id).join(", ")}).`)
  }

  const alcance = partidos.some((partido) => partido.fase !== "grupo") ? "Fase de grupos y playoffs" : "Fase de grupos"

  return frozenTournamentSchema.parse({ ...metadata, alcance, parejas, partidos }) as FrozenTournament
}
