import { describe, expect, it } from "vitest";
import { z } from "zod";

import { playerStatsSchema } from "./player-stats-schema.js";

describe("playerStatsSchema category filter", () => {
  it.each(["Primera", "Segunda", "Tercera", "Cuarta"])(
    "accepts the historical category %s",
    category => {
      expect(
        playerStatsSchema.parse({ playerName: "Juan Portugal", category })
      ).toEqual({ playerName: "Juan Portugal", category });
    }
  );

  it("keeps an omitted category absent instead of choosing a default", () => {
    expect(playerStatsSchema.parse({ playerName: "Juan Portugal" })).toEqual({
      playerName: "Juan Portugal",
    });
  });

  it("accepts null as an explicit all-categories selection", () => {
    expect(
      playerStatsSchema.parse({ playerName: "Juan Portugal", category: null })
    ).toEqual({ playerName: "Juan Portugal", category: null });
  });

  it.each(["Quinta", "tercera", "", 3])(
    "rejects an unsupported category: %j",
    category => {
      expect(
        playerStatsSchema.safeParse({ playerName: "Juan Portugal", category })
          .success
      ).toBe(false);
    }
  );

  it("exposes allowed values to the model without requiring the filter", () => {
    const schema = z.toJSONSchema(playerStatsSchema);
    expect(schema.properties?.category).toMatchObject({
      anyOf: [
        { type: "string", enum: ["Primera", "Segunda", "Tercera", "Cuarta"] },
        { type: "null" },
      ],
    });
    expect(schema.required).toEqual(["playerName"]);
  });
});
