import { describe, expect, it } from "vitest";

import { extractPlayers, findPlayers } from "./players.js";

describe("extractPlayers", () => {
  it("extracts unique names while preserving first spelling and encounter order", () => {
    const pairs = Object.freeze([
      Object.freeze({ nombre: "  Hernán   Fontana / Juan Portugal " }),
      Object.freeze({ nombre: "JUAN PORTUGAL / hernan fontana" }),
      Object.freeze({ nombre: "Juan Portugal / Tomás Molteno" }),
    ]);

    expect(extractPlayers(pairs)).toEqual([
      "Hernán Fontana",
      "Juan Portugal",
      "Tomás Molteno",
    ]);
    expect(pairs[0].nombre).toBe("  Hernán   Fontana / Juan Portugal ");
  });

  it("ignores malformed pairs instead of interpreting labels as players", () => {
    expect(
      extractPlayers([
        { nombre: "Ganador semifinal" },
        { nombre: "Juan Portugal / " },
        { nombre: " / Tomás Molteno" },
        { nombre: "A / B / C" },
      ])
    ).toEqual([]);
    expect(extractPlayers([])).toEqual([]);
  });
});

describe("findPlayers", () => {
  const players = Object.freeze(["Juan Portugal", "Hernán Fontana"]);

  it("matches full names regardless of case, accents, or whitespace", () => {
    expect(findPlayers(players, "  JUAN   portugal ")).toEqual({
      status: "matched",
      player: "Juan Portugal",
    });
    expect(findPlayers(players, "hernan fontana")).toEqual({
      status: "matched",
      player: "Hernán Fontana",
    });
    expect(findPlayers(players, "Herna\u0301n Fontana")).toEqual({
      status: "matched",
      player: "Hernán Fontana",
    });
    expect(players).toEqual(["Juan Portugal", "Hernán Fontana"]);
  });

  it("suggests a player for a single insertion, deletion, or substitution", () => {
    for (const query of [
      "Juan Portugaal",
      "Juan Portugl",
      "Juan Portugol",
      "Juan Portugall",
      "Juan Portuga",
    ]) {
      expect(findPlayers(players, query)).toEqual({
        status: "suggestions",
        players: ["Juan Portugal"],
      });
    }
  });

  it("returns all suggestions in encounter order without selecting one", () => {
    expect(
      findPlayers(["Juan Portugal", "Juana Portugal"], "Juann Portugal")
    ).toEqual({
      status: "suggestions",
      players: ["Juan Portugal", "Juana Portugal"],
    });
  });

  it("prefers an exact normalized match over similar names", () => {
    expect(
      findPlayers(["Juana Portugal", "Juan Portugal"], "JUAN PORTUGAL")
    ).toEqual({
      status: "matched",
      player: "Juan Portugal",
    });
  });

  it("returns not_found for empty, partial, unknown, or more distant names", () => {
    for (const query of [
      "",
      "   ",
      "Juan",
      "Juan Prtugl",
      "Juan Protugal",
      "Tomás Molteno",
    ]) {
      expect(findPlayers(players, query)).toEqual({ status: "not_found" });
    }
    expect(findPlayers([], "Juan Portugal")).toEqual({ status: "not_found" });
  });
});
