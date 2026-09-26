import { describe, expect, it } from "vitest";

import { hasActiveTournament } from "./tournament-availability.js";

const configuredTournament = {
  PUBLIC_ACTIVE_TOURNAMENT_PAREJAS_CSV_URL: "https://example.test/parejas.csv",
  PUBLIC_ACTIVE_TOURNAMENT_PARTIDOS_CSV_URL:
    "https://example.test/partidos.csv",
};

describe("hasActiveTournament", () => {
  it("keeps the site between tournaments unless the explicit flag is true", () => {
    expect(hasActiveTournament(configuredTournament)).toBe(false);
    expect(
      hasActiveTournament({
        ...configuredTournament,
        PUBLIC_TOURNAMENT_ACTIVE: "false",
      })
    ).toBe(false);
  });

  it("accepts an explicitly active and fully configured tournament", () => {
    expect(
      hasActiveTournament({
        ...configuredTournament,
        PUBLIC_TOURNAMENT_ACTIVE: "true",
      })
    ).toBe(true);
  });

  it("rejects an active flag without both required CSV URLs", () => {
    expect(() =>
      hasActiveTournament({ PUBLIC_TOURNAMENT_ACTIVE: "true" })
    ).toThrow("requiere las URLs CSV");
  });
});
