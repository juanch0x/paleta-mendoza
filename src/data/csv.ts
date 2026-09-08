import Papa from "papaparse"
import { z } from "zod"

import { parseSets } from "../domain/parse-sets.js"
import type { Pareja, PartidoRaw } from "../domain/types.js"

const requiredText = z.string().trim().min(1)
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
)

const parejaRow = z.object({
  id: requiredText,
  categoria: requiredText,
  zona: optionalText,
  jugador_1: requiredText,
  jugador_2: requiredText,
})

const partidoRow = z.object({
  id: requiredText,
  fecha: optionalText.refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Fecha inválida: usar AAAA-MM-DD"),
  hora: optionalText.refine((value) => !value || /^\d{2}:\d{2}$/.test(value), "Hora inválida: usar HH:MM"),
  categoria: requiredText,
  fase: requiredText,
  zona: optionalText,
  pareja_a: requiredText,
  pareja_b: requiredText,
  sets: z.string(),
  nota: optionalText,
})

export function parseParejasCsv(csv: string): Pareja[] {
  const rows = parseCsv(csv, "parejas")
  const parejas = rows.map((row, index) => parseRow(parejaRow, row, "parejas", index + 2)).map((row) => ({
    id: row.id,
    categoria: row.categoria,
    ...(row.zona ? { zona: row.zona } : {}),
    nombre: `${row.jugador_1} / ${row.jugador_2}`,
  }))

  assertUniqueIds(parejas, "parejas")
  return parejas
}

export function parsePartidosCsv(csv: string): PartidoRaw[] {
  const rows = parseCsv(csv, "partidos")
  const partidos = rows.map((row, index) => parseRow(partidoRow, row, "partidos", index + 2))

  for (const partido of partidos) {
    try {
      parseSets(partido.sets)
    } catch (error) {
      const reason = error instanceof Error ? error.message : "marcador inválido"
      throw new Error(`Partido ${partido.id}: ${reason}`)
    }
  }

  assertUniqueIds(partidos, "partidos")
  return partidos
}

function parseCsv(csv: string, sheetName: string): Record<string, string>[] {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
  })

  if (parsed.errors.length > 0) {
    throw new Error(`${sheetName}: CSV inválido (${parsed.errors[0].message})`)
  }

  return parsed.data
}

function parseRow<T extends z.ZodType>(schema: T, row: Record<string, string>, sheetName: string, line: number): z.output<T> {
  const result = schema.safeParse(row)
  if (result.success) return result.data

  const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
  throw new Error(`${sheetName}, fila ${line}: ${issues}`)
}

function assertUniqueIds(rows: readonly { id: string }[], sheetName: string) {
  const ids = new Set<string>()
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`${sheetName}: id duplicado ${row.id}`)
    ids.add(row.id)
  }
}
