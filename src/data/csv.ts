import Papa from "papaparse"
import { z } from "zod"

import { parseSets } from "../domain/parse-sets.js"
import type { Pareja, PartidoRaw } from "../domain/types.js"

export type TournamentStatus = {
  delayMinutes?: number
  importantMessage?: string
  updatedAt?: string
}

const requiredText = z.string().trim().min(1)
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
)

/**
 * The published tournament data contract. CSV remains the runtime source of
 * truth; other readers (such as the Sheets diagnostics) import these values
 * instead of maintaining a second set of headers or validation rules.
 */
export const TOURNAMENT_SHEET_HEADERS = {
  parejas: ["id", "categoria", "zona", "jugador_1", "jugador_2"],
  partidos: ["id", "fecha", "hora", "categoria", "fase", "zona", "pareja_a", "pareja_b", "sets", "nota"],
  estado: ["demora_minutos", "mensaje_importante", "actualizado_en"],
} as const

export type TournamentSheetName = keyof typeof TOURNAMENT_SHEET_HEADERS

export const TOURNAMENT_REQUIRED_FIELDS = {
  parejas: ["id", "categoria", "jugador_1", "jugador_2"],
  partidos: ["id", "categoria", "fase", "pareja_a", "pareja_b"],
  estado: [],
} as const satisfies Record<TournamentSheetName, readonly string[]>

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

type TournamentRowSchema = typeof parejaRow | typeof partidoRow

export type TournamentRowIssue = {
  field: string
  message: string
}

/**
 * Validates one physical row using the exact Zod schemas used by the CSV
 * parser. It deliberately returns all field errors so operational diagnostics
 * can retain their cell coordinates instead of failing on the first row.
 */
export function validateTournamentDataRow(
  sheet: "parejas" | "partidos",
  row: Record<string, string>,
): TournamentRowIssue[] {
  const schema: TournamentRowSchema = sheet === "parejas" ? parejaRow : partidoRow
  const result = schema.safeParse(row)
  if (result.success) return []

  return result.error.issues.map((issue) => ({
    field: String(issue.path[0] ?? ""),
    message: issue.message,
  }))
}

/** Applies the same singleton status semantics as parseTournamentStatusCsv. */
export function validateTournamentStatusRow(row: Record<string, string>): TournamentRowIssue[] {
  const delayValue = row.demora_minutos?.trim()
  const delayMinutes = delayValue === undefined || delayValue === "" ? undefined : Number(delayValue)

  if (delayMinutes !== undefined && (!Number.isInteger(delayMinutes) || delayMinutes < 0)) {
    return [{ field: "demora_minutos", message: "demora_minutos debe ser un entero mayor o igual a 0" }]
  }

  return []
}

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

export function parseTournamentStatusCsv(csv: string): TournamentStatus | undefined {
  const rows = parseCsv(csv, "estado")
  if (rows.length === 0) return undefined
  if (rows.length > 1) throw new Error("estado: debe tener una sola fila")

  const row = rows[0]
  const statusIssues = validateTournamentStatusRow(row)
  if (statusIssues.length > 0) {
    throw new Error(`estado, fila 2: ${statusIssues[0].message}`)
  }

  const delayValue = row.demora_minutos?.trim()
  const delayMinutes = delayValue === undefined || delayValue === "" ? undefined : Number(delayValue)
  const importantMessage = row.mensaje_importante?.trim() || undefined
  const updatedAt = row.actualizado_en?.trim() || undefined

  if (!delayMinutes && !importantMessage) return undefined

  return {
    ...(delayMinutes ? { delayMinutes } : {}),
    ...(importantMessage ? { importantMessage } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  }
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
