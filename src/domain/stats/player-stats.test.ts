import { describe, expect, it } from "vitest";

import type { PartidoResuelto } from "../types.js";
import { getPlayerStats } from "./player-stats.js";

function match(overrides: Partial<PartidoResuelto> = {}): PartidoResuelto {
  return {
    id: "1",
    categoria: "Cuarta",
    fase: "grupo",
    fecha: "2026-08-28",
    a: {
      tipo: "pareja",
      pareja: {
        id: "a",
        categoria: "Cuarta",
        nombre: "Juan Portugal / Ana Díaz",
      },
    },
    b: {
      tipo: "pareja",
      pareja: {
        id: "b",
        categoria: "Cuarta",
        nombre: "Luis Pérez / María Soto",
      },
    },
    sets: [
      [12, 4],
      [12, 5],
    ],
    ...overrides,
  };
}

const query = { playerName: "Juan Portugal" };

describe("getPlayerStats", () => {
  it("counts wins and losses on either side across tournaments", () => {
    const original = match();
    const tournaments = [
      {
        partidos: [
          original,
          match({
            sets: [
              [4, 12],
              [5, 12],
            ],
          }),
        ],
      },
      {
        partidos: [
          match({
            a: original.b,
            b: original.a,
            sets: [
              [12, 3],
              [2, 12],
              [4, 7],
            ],
          }),
        ],
      },
    ];
    expect(getPlayerStats(tournaments, query)).toEqual({
      playerName: "Juan Portugal",
      matchesPlayed: 3,
      wins: 2,
      losses: 1,
      winPercentage: (2 / 3) * 100,
    });
  });

  it("filters categories exactly and matches normalized full names only", () => {
    const tournaments = [
      {
        partidos: [
          match(),
          match({
            categoria: "Tercera",
            sets: [
              [1, 12],
              [2, 12],
            ],
          }),
        ],
      },
    ];
    expect(
      getPlayerStats(tournaments, {
        playerName: "  JUAN   PORTUGAL ",
        category: "Cuarta",
      }).wins
    ).toBe(1);
    expect(
      getPlayerStats(tournaments, { playerName: "ana diaz" }).matchesPlayed
    ).toBe(2);
    expect(
      getPlayerStats(tournaments, { playerName: "Juan Portugl" }).matchesPlayed
    ).toBe(0);
    expect(
      getPlayerStats(tournaments, { ...query, category: "cuarta" })
        .matchesPlayed
    ).toBe(0);
  });

  it("skips incomplete, invalid, unresolved and ambiguous matches", () => {
    const original = match();
    const tournaments = [
      {
        partidos: [
          match({ sets: [] }),
          match({ sets: [[12, 3]] }),
          match({
            sets: [
              [12, 3],
              [2, 12],
            ],
          }),
          match({
            sets: [
              [12, 3],
              [12, 2],
              [7, 1],
            ],
          }),
          match({
            sets: [
              [11, 3],
              [12, 2],
            ],
          }),
          match({ b: { tipo: "label", label: "Ganador semifinal" } }),
          match({ b: original.a }),
        ],
      },
    ];
    expect(getPlayerStats(tournaments, query)).toEqual({
      ...query,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      winPercentage: null,
    });
  });

  it("includes whole overlapping tournaments using all dated matches", () => {
    const tournaments = [
      {
        partidos: [
          match(),
          match({ fecha: "2026-09-04", categoria: "Tercera", sets: [] }),
        ],
      },
      { partidos: [match({ fecha: "2026-07-01" })] },
    ];
    expect(
      getPlayerStats(tournaments, {
        ...query,
        category: "Cuarta",
        dateFrom: "2026-09-01",
        dateTo: "2026-09-02",
      }).matchesPlayed
    ).toBe(1);
    expect(
      getPlayerStats(tournaments, { ...query, dateFrom: "2026-09-04" })
        .matchesPlayed
    ).toBe(1);
    expect(
      getPlayerStats(tournaments, {
        ...query,
        dateTo: "2026-08-28",
        dateFrom: "2026-08-28",
      }).matchesPlayed
    ).toBe(1);
    expect(
      getPlayerStats(tournaments, { ...query, dateFrom: "2026-09-05" })
        .matchesPlayed
    ).toBe(0);
    expect(
      getPlayerStats(tournaments, { ...query, dateTo: "2026-06-30" })
        .matchesPlayed
    ).toBe(0);
  });

  it("ignores invalid or absent dates only when a temporal filter is supplied", () => {
    const tournaments = [
      {
        partidos: [match({ fecha: undefined }), match({ fecha: "2026-02-30" })],
      },
    ];
    expect(getPlayerStats(tournaments, query).matchesPlayed).toBe(2);
    expect(
      getPlayerStats(tournaments, { ...query, dateFrom: "2026-01-01" })
        .matchesPlayed
    ).toBe(0);
  });

  it("returns empty statistics for no data or an unknown player", () => {
    expect(getPlayerStats([], query).winPercentage).toBeNull();
    expect(
      getPlayerStats([{ partidos: [match()] }], {
        playerName: "Unknown Player",
      }).matchesPlayed
    ).toBe(0);
  });

  it("rejects invalid calendar dates, formats and inverted ranges", () => {
    for (const dateFrom of ["2026-02-30", "2026-13-01", "2026-2-01", ""]) {
      expect(() => getPlayerStats([], { ...query, dateFrom })).toThrow(
        "valid calendar dates"
      );
    }
    expect(() =>
      getPlayerStats([], { ...query, dateTo: "2026-02-29" })
    ).toThrow();
    expect(() =>
      getPlayerStats([], {
        ...query,
        dateFrom: "2026-09-01",
        dateTo: "2026-08-01",
      })
    ).toThrow("dateFrom must not be after dateTo");
    expect(() =>
      getPlayerStats([], { ...query, dateFrom: "2024-02-29" })
    ).not.toThrow();
  });
});
