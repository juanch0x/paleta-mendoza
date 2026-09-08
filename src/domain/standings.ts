import type { Pareja, Partido } from "./types.js"

export type StandingRow = {
  pareja: Pareja
  posicion: number
  pg: number
  pp: number
  sg: number
  sp: number
  tf: number
  tc: number
  dP: number
  dS: number
  dT: number
}

type MutableRow = Omit<StandingRow, "posicion" | "dP" | "dS" | "dT">

const isPareja = (value: Partido["a"]): value is Extract<Partido["a"], { tipo: "pareja" }> =>
  value.tipo === "pareja"

const createRow = (pareja: Pareja): MutableRow => ({
  pareja,
  pg: 0,
  pp: 0,
  sg: 0,
  sp: 0,
  tf: 0,
  tc: 0,
})

const compareRows = (a: MutableRow, b: MutableRow) =>
  b.pg - b.pp - (a.pg - a.pp) ||
  b.sg - b.sp - (a.sg - a.sp) ||
  b.tf - b.tc - (a.tf - a.tc)

const sameRank = (a: MutableRow, b: MutableRow) =>
  a.pg - a.pp === b.pg - b.pp &&
  a.sg - a.sp === b.sg - b.sp &&
  a.tf - a.tc === b.tf - b.tc

/**
 * Builds standings for a single zone. Matches with a blank score are pending and
 * therefore do not alter any statistic. The caller provides every zone member so
 * that pairs with no completed matches still render with zeroes.
 */
export function buildStandings(parejas: readonly Pareja[], partidos: readonly Partido[]): StandingRow[] {
  const rows = new Map(parejas.map((pareja) => [pareja.id, createRow(pareja)]))

  for (const partido of partidos) {
    if (partido.sets.length === 0 || !isPareja(partido.a) || !isPareja(partido.b)) continue

    const a = rows.get(partido.a.pareja.id)
    const b = rows.get(partido.b.pareja.id)
    if (!a || !b) continue

    let setsA = 0
    let setsB = 0

    for (const [tantosA, tantosB] of partido.sets) {
      a.tf += tantosA
      a.tc += tantosB
      b.tf += tantosB
      b.tc += tantosA

      if (tantosA > tantosB) setsA += 1
      else setsB += 1
    }

    a.sg += setsA
    a.sp += setsB
    b.sg += setsB
    b.sp += setsA

    if (setsA > setsB) {
      a.pg += 1
      b.pp += 1
    } else if (setsB > setsA) {
      b.pg += 1
      a.pp += 1
    }
  }

  const sorted = [...rows.values()].sort(compareRows)

  return sorted.map((row, index) => {
    const previous = sorted[index - 1]
    const posicion = previous && sameRank(row, previous) ? previousPosition(sorted, index) : index + 1

    return {
      ...row,
      posicion,
      dP: row.pg - row.pp,
      dS: row.sg - row.sp,
      dT: row.tf - row.tc,
    }
  })
}

function previousPosition(rows: readonly MutableRow[], index: number): number {
  let position = index
  while (position > 0 && sameRank(rows[index], rows[position - 1])) position -= 1
  return position + 1
}
