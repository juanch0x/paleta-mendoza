import { describe, expect, it } from "vitest";

import {
  diagnoseTournamentSheets,
  diagnosticRanges,
  fetchTournamentSheetGrids,
  type SheetGrid,
} from "./tournament-diagnostics.js";
import {
  parseParejasCsv,
  parsePartidosCsv,
  parseTournamentStatusCsv,
} from "./csv.js";

const validGrids: SheetGrid[] = [
  {
    name: "parejas",
    values: [
      ["id", "categoria", "zona", "jugador_1", "jugador_2"],
      ["3A-1", "Tercera", "A", "Ana", "Bea"],
      ["3A-2", "Tercera", "A", "Carla", "Diana"],
    ],
  },
  {
    name: "partidos",
    values: [
      [
        "id",
        "fecha",
        "hora",
        "categoria",
        "fase",
        "zona",
        "pareja_a",
        "pareja_b",
        "sets",
        "nota",
      ],
      [
        "10",
        "2026-09-17",
        "19:00",
        "Tercera",
        "grupo",
        "A",
        "3A-1",
        "3A-2",
        "12-8 12-7",
        "",
      ],
    ],
  },
  {
    name: "estado",
    values: [
      ["demora_minutos", "mensaje_importante", "actualizado_en"],
      ["15", "", "19:00"],
    ],
  },
];

describe("diagnoseTournamentSheets", () => {
  it("reports every physical orphan value once with its real coordinate", () => {
    const grids = structuredClone(validGrids);
    grids[1].values[353] = [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "12-7",
    ];

    const diagnostics = diagnoseTournamentSheets(
      grids,
      "2026-09-17T20:00:00.000Z"
    );

    expect(diagnostics.valid).toBe(false);
    expect(diagnostics.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sheet: "partidos",
          cell: "M354",
          rule: "orphan-data",
        }),
      ])
    );
    expect(
      diagnostics.issues.filter(
        issue =>
          issue.sheet === "partidos" &&
          issue.cell === "M354" &&
          issue.rule === "orphan-data"
      )
    ).toHaveLength(1);
  });

  it("accumulates runtime-contract errors instead of aborting at the first one", () => {
    const grids = structuredClone(validGrids);
    grids[0].values.push(["3A-1", "", "A", "", "Diana"]);
    grids[1].values.push([
      "11",
      "17-09-2026",
      "7pm",
      "Tercera",
      "grupo",
      "A",
      "9A-9",
      "G:404",
      "12-8",
      "",
    ]);
    grids[2].values.push(["late", "", ""]);

    const diagnostics = diagnoseTournamentSheets(grids);
    const locations = diagnostics.issues.map(
      issue => `${issue.cell}:${issue.rule}`
    );

    expect(locations).toEqual(
      expect.arrayContaining([
        "B4:required-value",
        "A4:duplicate-id",
        "B3:invalid-date",
        "C3:invalid-time",
        "I3:invalid-sets",
        "A3:invalid-delay",
        "A3:multiple-status-rows",
      ])
    );
  });

  it("allows plain-text and G/P participant labels because runtime resolves them as labels", () => {
    const grids = structuredClone(validGrids);
    grids[1].values.push([
      "11",
      "",
      "",
      "Tercera",
      "semi",
      "",
      "Ganador de la zona A",
      "G:404",
      "",
      "",
    ]);

    const issues = diagnoseTournamentSheets(grids).issues;

    expect(issues).toEqual([]);
  });

  it("keeps date and time validation aligned with the runtime regex contract", () => {
    const grids = structuredClone(validGrids);
    grids[1].values.push([
      "11",
      "2026-02-30",
      "24:60",
      "Tercera",
      "grupo",
      "A",
      "3A-1",
      "3A-2",
      "",
      "",
    ]);
    grids[2].values[0] = ["demora_minutos", "mensaje_importante"];

    const issues = diagnoseTournamentSheets(grids).issues;

    expect(() => parsePartidosCsv(toCsv(grids[1]))).not.toThrow();
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cell: "C2", rule: "orphan-data" }),
      ])
    );
    expect(issues.some(issue => issue.rule === "invalid-date")).toBe(false);
    expect(issues.some(issue => issue.rule === "invalid-time")).toBe(false);
  });

  it("accepts the current table contract, including editorial match columns", () => {
    const grids = structuredClone(validGrids);
    grids[1].values[0] = [
      "id",
      "dia",
      "fecha",
      "hora",
      "categoria",
      "fase",
      "zona",
      "pareja_a",
      "equipo_a",
      "pareja_b",
      "equipo_b",
      "sets",
      "nota",
    ];
    grids[1].values[1] = [
      "10",
      "miércoles",
      "2026-09-17",
      "19:00",
      "Tercera",
      "grupo",
      "A",
      "3A-1",
      "Ana / Bea",
      "3A-2",
      "Carla / Diana",
      "12-8 12-7",
      "",
    ];

    expect(diagnoseTournamentSheets(grids).valid).toBe(true);
  });
});

describe("CSV runtime contract alignment", () => {
  const cases = [
    {
      name: "a required pair field",
      mutate: (grids: SheetGrid[]) => {
        grids[0].values[1][1] = "";
      },
      parse: (grids: SheetGrid[]) => parseParejasCsv(toCsv(grids[0])),
      coordinate: "B2",
      rule: "required-value",
    },
    {
      name: "a malformed match date",
      mutate: (grids: SheetGrid[]) => {
        grids[1].values[1][1] = "17-09-2026";
      },
      parse: (grids: SheetGrid[]) => parsePartidosCsv(toCsv(grids[1])),
      coordinate: "B2",
      rule: "invalid-date",
    },
    {
      name: "a malformed match time",
      mutate: (grids: SheetGrid[]) => {
        grids[1].values[1][2] = "7pm";
      },
      parse: (grids: SheetGrid[]) => parsePartidosCsv(toCsv(grids[1])),
      coordinate: "C2",
      rule: "invalid-time",
    },
    {
      name: "an invalid score",
      mutate: (grids: SheetGrid[]) => {
        grids[1].values[1][8] = "12-9";
      },
      parse: (grids: SheetGrid[]) => parsePartidosCsv(toCsv(grids[1])),
      coordinate: "I2",
      rule: "invalid-sets",
    },
    {
      name: "an invalid status delay",
      mutate: (grids: SheetGrid[]) => {
        grids[2].values[1][0] = "15.5";
      },
      parse: (grids: SheetGrid[]) => parseTournamentStatusCsv(toCsv(grids[2])),
      coordinate: "A2",
      rule: "invalid-delay",
    },
    {
      name: "multiple status rows",
      mutate: (grids: SheetGrid[]) => {
        grids[2].values.push(["0", "", ""]);
      },
      parse: (grids: SheetGrid[]) => parseTournamentStatusCsv(toCsv(grids[2])),
      coordinate: "A3",
      rule: "multiple-status-rows",
    },
  ] as const;

  it.each(cases)(
    "flags $name at its physical coordinate when runtime rejects it",
    ({ mutate, parse, coordinate, rule }) => {
      const grids = structuredClone(validGrids);
      mutate(grids);

      expect(() => parse(grids)).toThrow();
      expect(diagnoseTournamentSheets(grids).issues).toContainEqual(
        expect.objectContaining({ cell: coordinate, rule })
      );
    }
  );

  it("accepts valid data in both the runtime CSV parser and Sheets diagnostics", () => {
    expect(() => parseParejasCsv(toCsv(validGrids[0]))).not.toThrow();
    expect(() => parsePartidosCsv(toCsv(validGrids[1]))).not.toThrow();
    expect(() => parseTournamentStatusCsv(toCsv(validGrids[2]))).not.toThrow();
    expect(diagnoseTournamentSheets(validGrids).valid).toBe(true);
  });
});

describe("fetchTournamentSheetGrids", () => {
  it("requests the three fixed physical ranges in one Sheets API call", async () => {
    let requestedUrl = "";
    const grids = await fetchTournamentSheetGrids(
      "sheet-id",
      "key",
      async input => {
        requestedUrl = String(input);
        return new Response(
          JSON.stringify({
            valueRanges: validGrids.map(grid => ({ values: grid.values })),
          }),
          { status: 200 }
        );
      }
    );

    expect(grids).toEqual(validGrids);
    const url = new URL(requestedUrl);
    expect(url.searchParams.getAll("ranges")).toEqual(
      Object.values(diagnosticRanges())
    );
    expect(url.searchParams.get("key")).toBe("key");
  });
});

function toCsv(grid: SheetGrid) {
  return grid.values
    .map(row => row.map(value => String(value ?? "")).join(","))
    .join("\n");
}
