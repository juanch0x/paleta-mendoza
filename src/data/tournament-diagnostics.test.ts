import { describe, expect, it } from "vitest";

import {
  diagnoseLikelyPromotions,
  diagnosePlayerRegistry,
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
import type {
  ArchivedPareja,
  ArchivedTournament,
} from "../domain/archived-tournament.js";
import type { CategoriaOficial, Player } from "../domain/player.js";

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

  it("lists names missing from the player registry as non-blocking warnings", () => {
    const players = [
      { id: "ana-ficticia", nombreOficial: "Ana Ficticia" },
      { id: "bea-ficticia", nombreOficial: "Bea Ficticia" },
      { id: "carla-ficticia", nombreOficial: "Carla Ficticia" },
    ];
    const grids = structuredClone(validGrids);
    grids[0].values[1] = [
      "3A-1",
      "Tercera",
      "A",
      "ana  FICTICIA",
      "Beá Ficticia",
    ];
    grids[0].values[2] = [
      "3A-2",
      "Tercera",
      "A",
      "Carla Ficticia",
      "Diana Ficticia",
    ];

    const diagnostics = diagnoseTournamentSheets(grids, undefined, {
      players,
    });

    expect(diagnostics.valid).toBe(true);
    expect(diagnostics.issues).toEqual([]);
    expect(diagnostics.warnings).toEqual([
      {
        sheet: "parejas",
        cell: "E3",
        rule: "unknown-player",
        message:
          '"Diana Ficticia" (pareja 3A-2) no está en el registro de jugadores.',
      },
    ]);
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

describe("diagnosePlayerRegistry", () => {
  it("lists players missing an official category or a position for the date", () => {
    const players = [
      {
        id: "ana-alfa",
        nombreOficial: "Ana Alfa",
        categorias: [
          {
            desde: "2026-01-01",
            categoria: "Tercera",
            origen: "federacion" as const,
          },
        ],
        posiciones: [
          {
            anio: 2026,
            posicion: "delantero" as const,
            origen: "provisoria" as const,
          },
        ],
      },
      {
        id: "beto-beta",
        nombreOficial: "Beto Beta",
        categorias: [
          {
            desde: "2026-12-01",
            categoria: "Tercera",
            origen: "federacion" as const,
          },
        ],
        posiciones: [
          {
            anio: 2026,
            posicion: "zaguero" as const,
            origen: "federacion" as const,
          },
        ],
      },
      {
        id: "caro-gama",
        nombreOficial: "Caro Gama",
        categorias: [
          {
            desde: "2025-01-01",
            categoria: "Segunda",
            origen: "federacion" as const,
          },
        ],
        posiciones: [
          {
            anio: 2025,
            posicion: "zaguero" as const,
            origen: "federacion" as const,
          },
        ],
      },
      { id: "dani-delta", nombreOficial: "Dani Delta" },
    ];

    expect(diagnosePlayerRegistry(players, "2026-11-23")).toEqual([
      {
        id: "beto-beta",
        nombreOficial: "Beto Beta",
        faltaCategoria: true,
        faltaPosicion: false,
      },
      {
        id: "caro-gama",
        nombreOficial: "Caro Gama",
        faltaCategoria: false,
        faltaPosicion: true,
      },
      {
        id: "dani-delta",
        nombreOficial: "Dani Delta",
        faltaCategoria: true,
        faltaPosicion: true,
      },
    ]);
  });
});

describe("diagnoseLikelyPromotions", () => {
  const ana: Player = { id: "ana-alfa", nombreOficial: "Ana Alfa" };
  const beto: Player = { id: "beto-beta", nombreOficial: "Beto Beta" };
  const caro: Player = { id: "caro-gama", nombreOficial: "Caro Gama" };
  const dani: Player = { id: "dani-delta", nombreOficial: "Dani Delta" };

  const pareja = (
    id: string,
    jugadores: readonly [string, string],
    categoria = "Tercera"
  ): ArchivedPareja => ({
    id,
    categoria,
    nombre: jugadores.join(" / "),
    jugadores,
  });

  /** A tournament whose only match is the `categoria` final, won by `winner`. */
  const torneo = (
    slug: string,
    fecha: string,
    winner: readonly [string, string],
    loser: readonly [string, string],
    categoria = "Tercera"
  ): ArchivedTournament => {
    const a = pareja(`${slug}-a`, winner, categoria);
    const b = pareja(`${slug}-b`, loser, categoria);
    return {
      slug,
      nombre: `Torneo ${slug}`,
      fecha: "Mes 2026",
      parejas: [a, b],
      partidos: [
        {
          id: `${slug}-final`,
          categoria,
          fase: "final",
          fecha,
          a: { tipo: "pareja", pareja: a },
          b: { tipo: "pareja", pareja: b },
          sets: [
            [12, 8],
            [12, 9],
          ],
        },
      ],
    };
  };

  const ab = ["ana-alfa", "beto-beta"] as const;
  const cd = ["caro-gama", "dani-delta"] as const;

  it("warns on three consecutive titles in a category, naming the player, category and tournaments", () => {
    const tournaments = [
      torneo("uno", "2026-03-10", ab, cd),
      torneo("dos", "2026-05-10", ab, cd),
      torneo("tres", "2026-07-10", ab, cd),
    ];

    expect(
      diagnoseLikelyPromotions([ana, beto, caro, dani], tournaments)
    ).toEqual([
      {
        id: "ana-alfa",
        nombreOficial: "Ana Alfa",
        categoria: "Tercera",
        torneos: [
          { slug: "uno", nombre: "Torneo uno" },
          { slug: "dos", nombre: "Torneo dos" },
          { slug: "tres", nombre: "Torneo tres" },
        ],
      },
      {
        id: "beto-beta",
        nombreOficial: "Beto Beta",
        categoria: "Tercera",
        torneos: [
          { slug: "uno", nombre: "Torneo uno" },
          { slug: "dos", nombre: "Torneo dos" },
          { slug: "tres", nombre: "Torneo tres" },
        ],
      },
    ]);
  });

  const promotedOn = (desde: string): CategoriaOficial[] => [
    { desde: "2026-01-01", categoria: "Tercera", origen: "federacion" },
    { desde, categoria: "Segunda", origen: "ascenso" },
  ];

  it("does not warn when a promotion entry exists after the third title", () => {
    const tournaments = [
      torneo("uno", "2026-03-10", ab, cd),
      torneo("dos", "2026-05-10", ab, cd),
      torneo("tres", "2026-07-10", ab, cd),
    ];
    const promoted = [ana, beto].map(player => ({
      ...player,
      categorias: promotedOn("2026-07-20"),
    }));

    expect(diagnoseLikelyPromotions(promoted, tournaments)).toEqual([]);
  });

  it("still warns when the only promotion entry predates the third title", () => {
    const tournaments = [
      torneo("uno", "2026-03-10", ab, cd),
      torneo("dos", "2026-05-10", ab, cd),
      torneo("tres", "2026-07-10", ab, cd),
    ];
    const promotedEarly = { ...ana, categorias: promotedOn("2026-04-01") };

    expect(
      diagnoseLikelyPromotions([promotedEarly], tournaments).map(w => w.id)
    ).toEqual(["ana-alfa"]);
  });

  it("still warns when the promotion is dated before the third tournament's final", () => {
    const tres = torneo("tres", "2026-07-12", ab, cd);
    const opening = {
      ...tres.partidos[0],
      id: "tres-grupo",
      fase: "grupo",
      fecha: "2026-07-10",
    };
    const tournaments = [
      torneo("uno", "2026-03-10", ab, cd),
      torneo("dos", "2026-05-10", ab, cd),
      { ...tres, partidos: [opening, ...tres.partidos] },
    ];
    const promotedMidTournament = {
      ...ana,
      categorias: promotedOn("2026-07-11"),
    };
    const promotedOnFinalDay = {
      ...beto,
      categorias: promotedOn("2026-07-12"),
    };

    expect(
      diagnoseLikelyPromotions(
        [promotedMidTournament, promotedOnFinalDay],
        tournaments
      ).map(w => w.id)
    ).toEqual(["ana-alfa"]);
  });

  it("does not warn when another pair wins a tournament in between", () => {
    const tournaments = [
      torneo("uno", "2026-03-10", ab, cd),
      torneo("dos", "2026-05-10", cd, ab),
      torneo("tres", "2026-07-10", ab, cd),
      torneo("cuatro", "2026-09-10", ab, cd),
    ];

    expect(diagnoseLikelyPromotions([ana, caro], tournaments)).toEqual([]);
  });

  it("orders tournaments by match date, not by archive order or month label", () => {
    // In archive order the "cuatro" loss would break the run; by match date
    // it is played after the three titles.
    const tournaments = [
      torneo("uno", "2026-03-10", ab, cd),
      torneo("cuatro", "2026-09-10", cd, ab),
      torneo("tres", "2026-07-10", ab, cd),
      torneo("dos", "2026-05-10", ab, cd),
    ];

    expect(
      diagnoseLikelyPromotions([ana], tournaments).map(w =>
        w.torneos.map(t => t.slug)
      )
    ).toEqual([["uno", "dos", "tres"]]);
  });

  it("breaks ties between tournaments on the same date by slug", () => {
    const tournaments = [
      torneo("c", "2026-03-10", ab, cd),
      torneo("a", "2026-03-10", ab, cd),
      torneo("b", "2026-03-10", ab, cd),
    ];

    expect(
      diagnoseLikelyPromotions([ana], tournaments).map(w =>
        w.torneos.map(t => t.slug)
      )
    ).toEqual([["a", "b", "c"]]);
  });

  it("counts each category separately", () => {
    const tournaments = [
      torneo("uno", "2026-03-10", ab, cd),
      torneo("dos", "2026-04-10", ab, cd, "Segunda"),
      torneo("tres", "2026-05-10", ab, cd),
      torneo("cuatro", "2026-07-10", ab, cd),
    ];

    expect(
      diagnoseLikelyPromotions([ana], tournaments).map(w => [
        w.categoria,
        w.torneos.map(t => t.slug),
      ])
    ).toEqual([["Tercera", ["uno", "tres", "cuatro"]]]);
  });
});
