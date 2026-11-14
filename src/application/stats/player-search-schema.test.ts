import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  playerSearchSchema,
  type PlayerSearchInput,
} from "./player-search-schema.js";

describe("playerSearchSchema", () => {
  it("preserves the original spelling and spacing for the search", () => {
    const input: PlayerSearchInput = { name: "  Juán Portugl  " };
    expect(playerSearchSchema.parse(input)).toEqual(input);
  });

  it("describes the same required, nonblank, strict input to the model", () => {
    const schema = z.toJSONSchema(playerSearchSchema);
    expect(schema).toMatchObject({
      type: "object",
      required: ["name"],
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          pattern: "\\S",
          description: "Player name as written by the user",
        },
      },
    });
  });
});
