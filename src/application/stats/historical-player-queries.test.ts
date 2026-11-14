import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FrozenTournament } from "../../data/freeze.js";
import { loadHistoricalTournaments } from "../../data/load-historical-tournaments.js";
import * as statistics from "../../domain/stats/player-stats.js";
import {
  queryHistoricalPlayerStats,
  searchHistoricalPlayers,
} from "./historical-player-queries.js";

vi.mock("../../data/load-historical-tournaments.js", () => ({
  loadHistoricalTournaments: vi.fn(),
}));

const tournaments: FrozenTournament[] = [
  {
    slug: "example",
    nombre: "Example tournament",
    fecha: "October 2026",
    edition: "2026",
    hostClubName: "Regatas",
    clubId: "regatas",
    clubLogo: "regatas.svg",
    alcance: "Groups",
    parejas: [
      { id: "a", categoria: "Cuarta", nombre: "Juan Portugal / Martín Guerra" },
    ],
    partidos: [],
  },
];

describe("historical player queries", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(loadHistoricalTournaments).mockReset();
    vi.mocked(loadHistoricalTournaments).mockResolvedValue(tournaments);
  });

  it("loads players for standalone searches", async () => {
    await expect(
      searchHistoricalPlayers({ name: "Juan Portugl" })
    ).resolves.toEqual({
      status: "suggestions",
      players: ["Juan Portugal"],
    });
    expect(loadHistoricalTournaments).toHaveBeenCalledTimes(1);
  });

  it.each([
    undefined,
    null,
    {},
    [],
    { name: null },
    { name: 12 },
    { name: "" },
    { name: " \t\n " },
    { name: "Juan Portugal", extra: true },
  ])(
    "rejects invalid search input before loading archives: %j",
    async input => {
      await expect(searchHistoricalPlayers(input)).rejects.toThrow();
      expect(loadHistoricalTournaments).not.toHaveBeenCalled();
    }
  );

  it.each([
    undefined,
    {},
    { playerName: " " },
    { playerName: "Juan Portugal", category: " " },
    { playerName: "Juan Portugal", category: "Unknown" },
    { playerName: "Juan Portugal", dateFrom: "2026-02-30" },
    { playerName: "Juan Portugal", dateTo: "October 2026" },
    {
      playerName: "Juan Portugal",
      dateFrom: "2026-11-01",
      dateTo: "2026-10-01",
    },
    { playerName: "Juan Portugal", extra: true },
  ])("rejects invalid statistics input before IO: %j", async input => {
    await expect(queryHistoricalPlayerStats(input)).rejects.toThrow();
    expect(loadHistoricalTournaments).not.toHaveBeenCalled();
  });

  it("accepts normalized search input without changing display spelling", async () => {
    await expect(
      searchHistoricalPlayers({ name: "  JUAN   portugal  " })
    ).resolves.toEqual({ status: "matched", player: "Juan Portugal" });
  });

  it("treats null and omitted categories as all categories while preserving explicit filters", async () => {
    const pair = tournaments[0].parejas[0];
    vi.mocked(loadHistoricalTournaments).mockResolvedValue([
      {
        ...tournaments[0],
        partidos: [
          {
            id: "played",
            categoria: "Cuarta",
            fase: "grupo",
            a: { tipo: "pareja", pareja: pair },
            b: {
              tipo: "pareja",
              pareja: {
                id: "b",
                categoria: "Cuarta",
                nombre: "Ariel Vives / Luca Vives",
              },
            },
            sets: [
              [12, 5],
              [12, 8],
            ],
          },
        ],
      },
    ]);

    const overall = await queryHistoricalPlayerStats({
      playerName: "Juan Portugal",
    });
    expect(
      await queryHistoricalPlayerStats({
        playerName: "Juan Portugal",
        category: null,
      })
    ).toEqual(overall);
    expect(overall).toMatchObject({
      stats: { matchesPlayed: 1, wins: 1, losses: 0, winPercentage: 100 },
    });
    expect(
      await queryHistoricalPlayerStats({
        playerName: "Juan Portugal",
        category: "Cuarta",
      })
    ).toEqual(overall);
    expect(
      await queryHistoricalPlayerStats({
        playerName: "Juan Portugal",
        category: "Tercera",
      })
    ).toMatchObject({ stats: { matchesPlayed: 0, winPercentage: null } });
  });

  it("uses the canonical name and forwards filters with the loaded snapshots", async () => {
    const calculate = vi.spyOn(statistics, "getPlayerStats");
    const filters = {
      category: "Cuarta",
      dateFrom: "2026-09-01",
      dateTo: "2026-10-31",
    };

    await expect(
      queryHistoricalPlayerStats({ playerName: " JUAN portugal ", ...filters })
    ).resolves.toEqual({
      status: "matched",
      player: "Juan Portugal",
      stats: {
        playerName: "Juan Portugal",
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        winPercentage: null,
      },
    });
    expect(loadHistoricalTournaments).toHaveBeenCalledTimes(1);
    expect(calculate).toHaveBeenCalledWith(tournaments, {
      playerName: "Juan Portugal",
      ...filters,
    });
  });

  it.each([
    ["Juan Portugl", { status: "suggestions", players: ["Juan Portugal"] }],
    ["Unknown Person", { status: "not_found" }],
  ])(
    "does not calculate statistics for unresolved name %s",
    async (name, result) => {
      const calculate = vi.spyOn(statistics, "getPlayerStats");
      await expect(
        queryHistoricalPlayerStats({ playerName: name })
      ).resolves.toEqual(result);
      expect(calculate).not.toHaveBeenCalled();
    }
  );

  it("propagates loading failures instead of reporting an unknown player", async () => {
    vi.mocked(loadHistoricalTournaments).mockRejectedValue(
      new Error("Unreadable archive")
    );
    await expect(
      searchHistoricalPlayers({ name: "Juan Portugal" })
    ).rejects.toThrow("Unreadable archive");
  });
});
