import { describe, expect, it } from "vitest";

import type { PartidoResuelto } from "../domain/types.js";
import {
  MAX_EXPORT_DAYS,
  groupMatchesForExport,
  isExportRangeValid,
} from "./tournament-export.js";

const match = (
  id: string,
  fecha: string | undefined,
  sets: PartidoResuelto["sets"] = []
): PartidoResuelto => ({
  id,
  fecha,
  hora: "19:00",
  categoria: "Primera",
  fase: "grupo",
  a: { tipo: "label", label: "Pareja A" },
  b: { tipo: "label", label: "Pareja B" },
  sets,
});

describe("tournament export", () => {
  it("groups a range chronologically and separates results from scheduled matches", () => {
    const days = groupMatchesForExport(
      [
        match("upcoming", "2026-09-16"),
        match("monday-result", "2026-09-14", [
          [12, 8],
          [12, 9],
        ]),
        match("tuesday-result", "2026-09-15", [
          [12, 10],
          [10, 12],
          [7, 4],
        ]),
        match("outside", "2026-09-17"),
      ],
      "2026-09-14",
      "2026-09-16"
    );

    expect(days.map(day => day.date)).toEqual([
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
    ]);
    expect(days[0].results.map(partido => partido.id)).toEqual([
      "monday-result",
    ]);
    expect(days[1].results.map(partido => partido.id)).toEqual([
      "tuesday-result",
    ]);
    expect(days[2].scheduled.map(partido => partido.id)).toEqual(["upcoming"]);
  });

  it("accepts inclusive ranges of up to six days", () => {
    expect(isExportRangeValid("2026-09-14", "2026-09-19")).toBe(true);
    expect(isExportRangeValid("2026-09-14", "2026-09-20")).toBe(false);
    expect(MAX_EXPORT_DAYS).toBe(6);
  });
});
