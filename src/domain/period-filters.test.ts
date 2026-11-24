import { describe, expect, it } from "vitest";

import { buildPeriodViews, type PeriodSource } from "./period-filters.js";

const torneo = (
  slug: string,
  /** Archive edition; a season name unless a test says otherwise. */
  edition: string,
  fecha: string
): PeriodSource => ({
  slug,
  nombre: `${edition} · ${slug}`,
  edition,
  partidos: [{ fecha }],
});

describe("buildPeriodViews", () => {
  it("shows no filters and states year and season when there is one tournament", () => {
    const views = buildPeriodViews([torneo("a", "Clausura", "2026-08-10")]);

    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      path: "",
      titulo: "2026 · Clausura",
      filtros: [],
    });
    expect(views[0].torneos.map(t => t.slug)).toEqual(["a"]);
  });

  it("offers a year filter when tournaments span two years, defaulting to the latest", () => {
    const views = buildPeriodViews([
      torneo("viejo", "Clausura", "2025-09-01"),
      torneo("nuevo", "Clausura", "2026-08-10"),
    ]);

    const anioFiltro = {
      etiqueta: "Año",
      opciones: [
        { etiqueta: "2026", path: "", actual: true },
        { etiqueta: "2025", path: "2025", actual: false },
      ],
    };
    expect(views.map(v => [v.path, v.titulo])).toEqual([
      ["", "2026 · Clausura"],
      ["2025", "2025 · Clausura"],
    ]);
    expect(views[0].filtros).toEqual([anioFiltro]);
    expect(views[0].torneos.map(t => t.slug)).toEqual(["nuevo"]);
    expect(views[1].torneos.map(t => t.slug)).toEqual(["viejo"]);
    expect(views[1].filtros[0].opciones.map(o => o.actual)).toEqual([
      false,
      true,
    ]);
  });

  it("offers a season filter scoped to the year that has both seasons", () => {
    const views = buildPeriodViews([
      torneo("clausura-26", "Clausura", "2026-09-05"),
      torneo("apertura-26", "Apertura", "2026-04-11"),
      torneo("clausura-25", "Clausura", "2025-09-01"),
    ]);

    expect(views.map(v => [v.path, v.titulo])).toEqual([
      ["", "2026 · Apertura y Clausura"],
      ["2026/apertura", "2026 · Apertura"],
      ["2026/clausura", "2026 · Clausura"],
      ["2025", "2025 · Clausura"],
    ]);
    const edicion2026 = (actual: string) => ({
      etiqueta: "Temporada",
      opciones: [
        { etiqueta: "Todo 2026", path: "", actual: actual === "" },
        {
          etiqueta: "Apertura",
          path: "2026/apertura",
          actual: actual === "2026/apertura",
        },
        {
          etiqueta: "Clausura",
          path: "2026/clausura",
          actual: actual === "2026/clausura",
        },
      ],
    });
    const [todo, apertura] = views;
    expect(todo.filtros.map(f => f.etiqueta)).toEqual(["Año", "Temporada"]);
    expect(todo.filtros[1]).toEqual(edicion2026(""));
    expect(apertura.filtros[1]).toEqual(edicion2026("2026/apertura"));
    expect(apertura.filtros[0].opciones[0].actual).toBe(true);
    expect(apertura.torneos.map(t => t.slug)).toEqual(["apertura-26"]);
    expect(views[3].filtros.map(f => f.etiqueta)).toEqual(["Año"]);
  });

  it("groups every tournament of a season, without a per-tournament filter", () => {
    const views = buildPeriodViews([
      torneo("c2", "Clausura", "2026-10-03"),
      torneo("c1", "Clausura", "2026-08-10"),
      torneo("ap", "Apertura", "2026-04-11"),
    ]);
    const byPath = new Map(views.map(v => [v.path, v]));

    expect(views.map(v => v.path)).toEqual([
      "",
      "2026/apertura",
      "2026/clausura",
    ]);
    expect(byPath.get("2026/clausura")?.torneos.map(t => t.slug)).toEqual([
      "c2",
      "c1",
    ]);
    expect(byPath.get("2026/clausura")?.filtros.map(f => f.etiqueta)).toEqual([
      "Temporada",
    ]);
  });

  it("shows no filter for a single season with several tournaments", () => {
    const views = buildPeriodViews([
      torneo("c2", "Clausura", "2026-10-03"),
      torneo("c1", "Clausura", "2026-08-10"),
    ]);

    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({ path: "", titulo: "2026 · Clausura" });
    expect(views[0].filtros).toEqual([]);
    expect(views[0].torneos.map(t => t.slug)).toEqual(["c2", "c1"]);
  });

  it("derives the season from the tournament name when the edition is not one", () => {
    const views = buildPeriodViews([
      {
        ...torneo("apertura-regatas-2026", "Abierto", "2026-04-11"),
        nombre: "Apertura Regatas",
      },
      torneo("c1", "Clausura", "2026-08-10"),
    ]);

    expect(views.map(v => [v.path, v.titulo])).toEqual([
      ["", "2026 · Apertura y Clausura"],
      ["2026/apertura", "2026 · Apertura"],
      ["2026/clausura", "2026 · Clausura"],
    ]);
  });

  it("fails loudly when a tournament has no Apertura or Clausura season", () => {
    expect(() =>
      buildPeriodViews([
        { ...torneo("maipu-2026", "Abierto", "2026-04-11"), nombre: "Maipú" },
      ])
    ).toThrow(/Apertura o Clausura.*maipu-2026/);
  });

  it("can default to every year, with each year as a filter option", () => {
    const views = buildPeriodViews(
      [
        torneo("viejo", "Clausura", "2025-09-01"),
        torneo("nuevo", "Apertura", "2026-04-10"),
      ],
      { todosLosAnios: true }
    );

    expect(views.map(v => [v.path, v.titulo])).toEqual([
      ["", "Todos los años (2025 a 2026)"],
      ["2026", "2026 · Apertura"],
      ["2025", "2025 · Clausura"],
    ]);
    expect(views[0].torneos.map(t => t.slug)).toEqual(["nuevo", "viejo"]);
    expect(views[0].filtros).toEqual([
      {
        etiqueta: "Año",
        opciones: [
          { etiqueta: "Todos los años", path: "", actual: true },
          { etiqueta: "2026", path: "2026", actual: false },
          { etiqueta: "2025", path: "2025", actual: false },
        ],
      },
    ]);
  });

  it("skips the every-year view when there is a single year", () => {
    const views = buildPeriodViews([torneo("a", "Clausura", "2026-08-10")], {
      todosLosAnios: true,
    });

    expect(views.map(v => [v.path, v.titulo])).toEqual([
      ["", "2026 · Clausura"],
    ]);
  });

  it("returns one empty view when no tournament has a match date", () => {
    const sinFecha = { ...torneo("a", "Clausura", ""), partidos: [{}] };

    expect(buildPeriodViews([sinFecha])).toEqual([
      { path: "", titulo: "", torneos: [], filtros: [] },
    ]);
  });
});
