import type { SetScore } from "./types.js"

const SCORE = /^(\d+)-(\d+)$/

export function parseSets(value: string): SetScore[] {
  const tokens = value.trim() === "" ? [] : value.trim().split(/\s+/)
  if (tokens.length === 0) return []
  if (tokens.length < 2 || tokens.length > 3) {
    throw new Error("Un partido jugado debe tener dos o tres sets")
  }

  const sets = tokens.map((token, index) => parseSet(token, index))
  const [first, second, third] = sets

  if (winnerOf(first) === winnerOf(second)) {
    if (third) throw new Error("Un partido definido en dos sets no puede tener tercer set")
  } else if (!third) {
    throw new Error("Un partido empatado en sets debe tener tercer set")
  }

  return sets
}

function parseSet(token: string, index: number): SetScore {
  const match = SCORE.exec(token)
  if (!match) throw new Error(`Set inválido: ${token}`)

  const score: SetScore = [Number(match[1]), Number(match[2])]
  const target = index === 2 ? 7 : 12

  if (score[0] === score[1] || Math.max(...score) !== target) {
    throw new Error(`El set ${index + 1} debe terminar ${target}-N, sin empate`)
  }

  return score
}

function winnerOf([a, b]: SetScore): "a" | "b" {
  return a > b ? "a" : "b"
}
