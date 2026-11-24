import { describe, expect, it } from "vitest";

import { headerRows } from "./table-headers.js";

const cell = (label: string, colspan = 1, rowspan = 1) => ({
  label,
  colspan,
  rowspan,
});

describe("headerRows", () => {
  it("groups the categories of a year under it, with a total spanning both rows", () => {
    expect(
      headerRows([["Total"], ["2026", "Segunda"], ["2026", "Tercera"]])
    ).toEqual([
      [cell("Total", 1, 2), cell("2026", 2)],
      [cell("Segunda"), cell("Tercera")],
    ]);
  });

  it("keeps the year row for a single year and category", () => {
    expect(headerRows([["2026", "Cuarta"]])).toEqual([
      [cell("2026")],
      [cell("Cuarta")],
    ]);
  });

  it("starts a new group whenever the year changes", () => {
    expect(
      headerRows([
        ["Total"],
        ["2026", "Total"],
        ["2026", "Segunda"],
        ["2025", "Tercera"],
        ["Todos los años", "Segunda"],
      ])
    ).toEqual([
      [
        cell("Total", 1, 2),
        cell("2026", 2),
        cell("2025"),
        cell("Todos los años"),
      ],
      [cell("Total"), cell("Segunda"), cell("Tercera"), cell("Segunda")],
    ]);
  });

  it("takes a middle level, such as a season, without other changes", () => {
    expect(
      headerRows([
        ["Total"],
        ["2026", "Clausura", "Segunda"],
        ["2026", "Clausura", "Tercera"],
        ["2026", "Apertura", "Segunda"],
      ])
    ).toEqual([
      [cell("Total", 1, 3), cell("2026", 3)],
      [cell("Clausura", 2), cell("Apertura")],
      [cell("Segunda"), cell("Tercera"), cell("Segunda")],
    ]);
  });
});
