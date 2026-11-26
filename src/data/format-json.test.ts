import { describe, expect, it } from "vitest";
import { check } from "prettier";
import { formatJson } from "./format-json.js";

describe("formatJson", () => {
  it("returns output that Prettier considers already formatted", async () => {
    const path = "src/data/torneos/archivos/x/torneo.json";
    const output = await formatJson(
      { a: [1, 2, 3], b: { c: "d", e: ["short", "list"] } },
      path
    );

    expect(await check(output, { filepath: path })).toBe(true);
    expect(JSON.parse(output)).toEqual({
      a: [1, 2, 3],
      b: { c: "d", e: ["short", "list"] },
    });
  });
});
