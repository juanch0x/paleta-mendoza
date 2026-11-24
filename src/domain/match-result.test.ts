import { describe, expect, it } from "vitest";

import { matchResult } from "./match-result.js";
import type { Pareja, Participante, SetScore } from "./types.js";

const pareja = (id: string): Pareja => ({
  id,
  categoria: "Tercera",
  nombre: id,
});
const ab = pareja("3A-1");
const cd = pareja("3A-2");
const side = (p: Pareja): Participante => ({ tipo: "pareja", pareja: p });

const match = (sets: SetScore[], b: Participante = side(cd)) => ({
  a: side(ab),
  b,
  sets,
});

describe("matchResult", () => {
  it("gives the match to the pair that won more sets", () => {
    expect(
      matchResult(
        match([
          [8, 12],
          [12, 6],
          [5, 7],
        ])
      )
    ).toEqual({ ganador: cd, perdedor: ab });
  });

  it("has no winner for an unscored or set-tied match", () => {
    expect(matchResult(match([]))).toBeUndefined();
    expect(
      matchResult(
        match([
          [12, 8],
          [6, 12],
        ])
      )
    ).toBeUndefined();
  });

  it("has no winner while a participant is still unresolved", () => {
    expect(
      matchResult(match([[12, 8]], { tipo: "label", label: "Ganador semi" }))
    ).toBeUndefined();
  });
});
