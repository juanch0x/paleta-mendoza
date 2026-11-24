import { describe, expect, it } from "vitest";

import {
  buildAnnualTables,
  type ArchivedPareja,
  type ArchivedTournament,
  type Player,
} from "./player-stats.js";
import type { PartidoResuelto } from "./types.js";

const enTercera = [
  { desde: "2026-01-01", categoria: "Tercera", origen: "federacion" },
] as const;

const player = (
  id: string,
  posicion: "delantero" | "zaguero" = "delantero",
  categorias: Player["categorias"] = enTercera,
  origen: "provisoria" | "federacion" = "federacion"
): Player => ({
  id,
  nombreOficial: id,
  categorias,
  posiciones: [{ anio: 2026, posicion, origen }],
});

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

const won = (
  id: string,
  fase: string,
  fecha: string,
  winner: ArchivedPareja,
  loser: ArchivedPareja
): PartidoResuelto => ({
  id,
  categoria: winner.categoria,
  fase,
  fecha,
  a: { tipo: "pareja", pareja: winner },
  b: { tipo: "pareja", pareja: loser },
  sets: [
    [12, 5],
    [12, 6],
  ],
});

/** A one-category tournament played on `fecha` whose final `winner` wins. */
const tournament = (
  slug: string,
  fecha: string,
  winner: ArchivedPareja,
  loser: ArchivedPareja
): ArchivedTournament => ({
  slug,
  nombre: slug,
  fecha: "Octubre 2026",
  parejas: [winner, loser],
  partidos: [won("1", "final", fecha, winner, loser)],
});

type Tables = ReturnType<typeof buildAnnualTables>;

const table = (
  tables: Tables,
  categoria: string,
  posicion: "delantero" | "zaguero" = "delantero"
) => tables.find(t => t.categoria === categoria && t.posicion === posicion);

const rows = (tables: Tables, categoria: string, posicion?: "zaguero") =>
  table(tables, categoria, posicion)?.filas.map(fila => ({
    id: fila.player.id,
    puesto: fila.puesto,
    titulos: fila.titulos,
    finales: fila.finales,
    partidosGanados: fila.partidosGanados,
    categoriaInferior: fila.categoriaInferior,
  }));

describe("buildAnnualTables", () => {
  it("builds one table per category and position counting titles, finals and wins", () => {
    const players = [
      player("ana"),
      player("beto", "zaguero"),
      player("caro"),
      player("dani", "zaguero"),
    ];
    const ab = pareja("3A-1", ["ana", "beto"]);
    const cd = pareja("3A-2", ["caro", "dani"]);

    const tables = buildAnnualTables(players, [
      tournament("t1", "2026-08-01", ab, cd),
    ]);

    expect(tables.map(t => [t.categoria, t.posicion])).toEqual([
      ["Tercera", "delantero"],
      ["Tercera", "zaguero"],
    ]);
    expect(rows(tables, "Tercera")).toEqual([
      {
        id: "ana",
        puesto: 1,
        titulos: 1,
        finales: 1,
        partidosGanados: 1,
        categoriaInferior: false,
      },
      {
        id: "caro",
        puesto: 2,
        titulos: 0,
        finales: 1,
        partidosGanados: 0,
        categoriaInferior: false,
      },
    ]);
  });

  it("splits a mid-year promotion at the promotion date", () => {
    const promovida = player("ana", "delantero", [
      { desde: "2026-01-01", categoria: "Tercera", origen: "federacion" },
      { desde: "2026-09-15", categoria: "Segunda", origen: "ascenso" },
    ]);
    const players = [promovida, player("beto"), player("caro")];
    const enTerceraAntes = pareja("3A-1", ["ana", "beto"]);
    const rival = pareja("3A-2", ["caro", "beto"]);
    const enSegunda = pareja("2A-1", ["ana", "beto"], "Segunda");
    const rivalSegunda = pareja("2A-2", ["caro", "beto"], "Segunda");

    const tables = buildAnnualTables(players, [
      tournament("agosto", "2026-08-01", enTerceraAntes, rival),
      tournament("octubre", "2026-10-01", enSegunda, rivalSegunda),
    ]);

    expect(rows(tables, "Tercera")?.find(r => r.id === "ana")).toMatchObject({
      titulos: 1,
      categoriaInferior: false,
    });
    expect(rows(tables, "Segunda")?.find(r => r.id === "ana")).toMatchObject({
      puesto: 1,
      titulos: 1,
      categoriaInferior: false,
    });
  });

  it("shows lower-category players unranked and skips them when ranking", () => {
    const players = [
      player("ana", "delantero", [
        { desde: "2026-01-01", categoria: "Segunda", origen: "federacion" },
      ]),
      player("beto", "delantero", [
        { desde: "2026-01-01", categoria: "Segunda", origen: "federacion" },
      ]),
      player("caro"),
      player("dani", "delantero", [
        { desde: "2026-01-01", categoria: "Segunda", origen: "federacion" },
      ]),
    ];
    const invitada = pareja("2A-1", ["caro", "beto"], "Segunda");
    const local = pareja("2A-2", ["ana", "dani"], "Segunda");
    const t = tournament("t1", "2026-08-01", invitada, local);

    expect(rows(buildAnnualTables(players, [t]), "Segunda")).toEqual([
      expect.objectContaining({ id: "beto", puesto: 1, titulos: 1 }),
      expect.objectContaining({
        id: "caro",
        puesto: undefined,
        titulos: 1,
        categoriaInferior: true,
      }),
      expect.objectContaining({ id: "ana", puesto: 2, finales: 1 }),
      expect.objectContaining({ id: "dani", puesto: 2, finales: 1 }),
    ]);
  });

  it("leaves out players without an official category or position", () => {
    const sinCategoria: Player = { id: "beto", nombreOficial: "beto" };
    const sinPosicion: Player = {
      id: "caro",
      nombreOficial: "caro",
      categorias: enTercera,
    };
    const players = [player("ana"), sinCategoria, sinPosicion, player("dani")];
    const t = tournament(
      "t1",
      "2026-08-01",
      pareja("3A-1", ["ana", "beto"]),
      pareja("3A-2", ["caro", "dani"])
    );

    expect(
      rows(buildAnnualTables(players, [t]), "Tercera")?.map(r => r.id)
    ).toEqual(["ana", "dani"]);
  });

  it("orders by titles, then finals, then matches won", () => {
    const players = ["ana", "beto", "caro", "dani", "eli", "fede"].map(id =>
      player(id)
    );
    const ab = pareja("3A-1", ["ana", "beto"]);
    const cd = pareja("3A-2", ["caro", "dani"]);
    const ef = pareja("3A-3", ["eli", "fede"]);
    const t: ArchivedTournament = {
      slug: "t1",
      nombre: "t1",
      fecha: "Octubre 2026",
      parejas: [ab, cd, ef],
      partidos: [
        won("1", "grupo", "2026-08-01", ef, ab),
        won("2", "grupo", "2026-08-01", ef, cd),
        won("3", "final", "2026-08-02", cd, ab),
      ],
    };

    // caro: 1 title; ana: 1 final, 0 wins; eli: 0 finals, 2 wins.
    expect(
      rows(buildAnnualTables(players, [t]), "Tercera")?.map(r => r.id)
    ).toEqual(["caro", "dani", "ana", "beto", "eli", "fede"]);
  });

  it("flags tables with provisional positions", () => {
    const players = [
      player("ana", "delantero", enTercera, "provisoria"),
      player("beto", "zaguero"),
      player("caro"),
      player("dani", "zaguero"),
    ];
    const tables = buildAnnualTables(players, [
      tournament(
        "t1",
        "2026-08-01",
        pareja("3A-1", ["ana", "beto"]),
        pareja("3A-2", ["caro", "dani"])
      ),
    ]);

    expect(table(tables, "Tercera", "delantero")?.posicionesProvisorias).toBe(
      true
    );
    expect(table(tables, "Tercera", "zaguero")?.posicionesProvisorias).toBe(
      false
    );
  });
});
