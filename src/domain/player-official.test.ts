import { describe, expect, it } from "vitest";

import type {
  ArchivedPareja,
  ArchivedTournament,
} from "./archived-tournament.js";
import type { Player } from "./player.js";
import { buildOfficialProfile, categoryOn } from "./player-official.js";
import type { PartidoResuelto } from "./types.js";

const pareja = (
  id: string,
  jugadores: readonly [string, string]
): ArchivedPareja => ({
  id,
  categoria: "Tercera",
  nombre: jugadores.join(" / "),
  jugadores,
});

const ab = pareja("3A-1", ["ana-alfa", "beto-beta"]);
const cd = pareja("3A-2", ["caro-gama", "dani-delta"]);

/** A one-category tournament whose final, played on `fecha`, `winner` wins. */
const tournament = (
  slug: string,
  fecha: string,
  winner: ArchivedPareja
): ArchivedTournament => {
  const loser = winner === ab ? cd : ab;
  const match = (id: string, fase: string, day: string): PartidoResuelto => ({
    id,
    categoria: "Tercera",
    fase,
    fecha: day,
    a: { tipo: "pareja", pareja: winner },
    b: { tipo: "pareja", pareja: loser },
    sets: [
      [12, 5],
      [12, 6],
    ],
  });
  return {
    slug,
    nombre: slug,
    fecha,
    parejas: [ab, cd],
    partidos: [
      match("2", "final", `${fecha.slice(0, 8)}28`),
      match("1", "grupo", fecha),
    ],
  };
};

const promoted: Player = {
  id: "ana-alfa",
  nombreOficial: "Ana Alfa",
  categorias: [
    { desde: "2026-01-01", categoria: "Tercera", origen: "federacion" },
    { desde: "2026-09-15", categoria: "Segunda", origen: "ascenso" },
  ],
};

describe("categoryOn", () => {
  it("returns the latest entry starting on or before the date", () => {
    expect(categoryOn(promoted, "2026-09-14")?.categoria).toBe("Tercera");
    expect(categoryOn(promoted, "2026-09-15")?.categoria).toBe("Segunda");
    expect(categoryOn(promoted, "2026-12-01")).toEqual({
      desde: "2026-09-15",
      categoria: "Segunda",
      origen: "ascenso",
    });
  });

  it("has no category before the first entry or without entries", () => {
    expect(categoryOn(promoted, "2025-12-31")).toBeUndefined();
    expect(
      categoryOn({ id: "beto-beta", nombreOficial: "Beto Beta" }, "2026-05-01")
    ).toBeUndefined();
  });
});

describe("buildOfficialProfile", () => {
  const withPosition: Player = {
    ...promoted,
    posiciones: [
      { anio: 2025, posicion: "zaguero", origen: "federacion" },
      { anio: 2026, posicion: "delantero", origen: "provisoria" },
    ],
  };

  it("shows the category in effect on the reference date and the position for its year", () => {
    const profile = buildOfficialProfile(withPosition, [], "2026-11-23");

    expect(profile.categoria?.categoria).toBe("Segunda");
    expect(profile.posicion).toEqual({
      anio: 2026,
      posicion: "delantero",
      origen: "provisoria",
    });
    expect(profile.posicionProvisoria).toBe(true);
  });

  it("works for a player without category or position", () => {
    const profile = buildOfficialProfile(
      { id: "beto-beta", nombreOficial: "Beto Beta" },
      [],
      "2026-11-23"
    );

    expect(profile).toMatchObject({
      categoria: undefined,
      posicion: undefined,
      posicionProvisoria: false,
    });
  });

  it("lists category changes during the reference year, with the previous category", () => {
    const player: Player = {
      ...promoted,
      categorias: [
        { desde: "2025-03-01", categoria: "Cuarta", origen: "federacion" },
        { desde: "2026-01-01", categoria: "Tercera", origen: "federacion" },
        { desde: "2026-09-15", categoria: "Segunda", origen: "ascenso" },
      ],
    };

    expect(buildOfficialProfile(player, [], "2026-11-23").cambios).toEqual([
      {
        desde: "2026-01-01",
        anterior: "Cuarta",
        categoria: "Tercera",
        origen: "federacion",
      },
      {
        desde: "2026-09-15",
        anterior: "Tercera",
        categoria: "Segunda",
        origen: "ascenso",
      },
    ]);
    expect(buildOfficialProfile(promoted, [], "2026-11-23").cambios).toEqual([
      {
        desde: "2026-09-15",
        anterior: "Tercera",
        categoria: "Segunda",
        origen: "ascenso",
      },
    ]);
  });

  it("splits titles by year under the position recorded for that year", () => {
    const player: Player = {
      ...promoted,
      posiciones: [
        { anio: 2025, posicion: "zaguero", origen: "federacion" },
        { anio: 2026, posicion: "delantero", origen: "provisoria" },
      ],
    };
    const tournaments = [
      tournament("apertura-2025", "2025-04-10", ab),
      tournament("clausura-2025", "2025-09-10", ab),
      tournament("apertura-2026", "2026-04-10", ab),
      tournament("clausura-2026", "2026-09-10", cd),
    ];

    expect(
      buildOfficialProfile(player, tournaments, "2026-11-23").titulosPorPosicion
    ).toEqual([
      { anio: 2026, posicion: "delantero", provisoria: true, titulos: 1 },
      { anio: 2025, posicion: "zaguero", provisoria: false, titulos: 2 },
    ]);
  });

  it("keeps titles of a year without a recorded position, with no position", () => {
    const tournaments = [tournament("apertura-2026", "2026-04-10", ab)];

    expect(
      buildOfficialProfile(
        { id: "beto-beta", nombreOficial: "Beto Beta" },
        tournaments,
        "2026-11-23"
      ).titulosPorPosicion
    ).toEqual([
      { anio: 2026, posicion: undefined, provisoria: false, titulos: 1 },
    ]);
  });
});
