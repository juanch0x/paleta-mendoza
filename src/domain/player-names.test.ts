import { describe, expect, it } from "vitest";
import { createPlayerMatcher } from "./player-names.js";

describe("createPlayerMatcher", () => {
  it("finds a player by an alias, ignoring accents and case", () => {
    const match = createPlayerMatcher([
      {
        id: "pepe-prueba",
        nombreOficial: "Pepe Prueba",
        alias: ["José Prueba"],
      },
    ]);

    expect(match("jose  PRUEBA")?.id).toBe("pepe-prueba");
  });
});
