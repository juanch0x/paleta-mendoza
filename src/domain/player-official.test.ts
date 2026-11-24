import { describe, expect, it } from "vitest";

import type { Player } from "./player.js";
import { buildOfficialProfile, categoryOn } from "./player-official.js";

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
    const profile = buildOfficialProfile(withPosition, "2026-11-23");

    expect(profile.categoria?.categoria).toBe("Segunda");
    expect(profile.posicion).toEqual({
      anio: 2026,
      posicion: "delantero",
      origen: "provisoria",
    });
  });

  it("works for a player without category or position", () => {
    const profile = buildOfficialProfile(
      { id: "beto-beta", nombreOficial: "Beto Beta" },
      "2026-11-23"
    );

    expect(profile).toMatchObject({
      categoria: undefined,
      posicion: undefined,
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

    expect(buildOfficialProfile(player, "2026-11-23").cambios).toEqual([
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
    expect(buildOfficialProfile(promoted, "2026-11-23").cambios).toEqual([
      {
        desde: "2026-09-15",
        anterior: "Tercera",
        categoria: "Segunda",
        origen: "ascenso",
      },
    ]);
  });
});
