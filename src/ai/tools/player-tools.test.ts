import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  queryHistoricalPlayerStats,
  searchHistoricalPlayers,
} from "../../application/stats/historical-player-queries.js";
import { executeTool, playerToolDefinitions } from "./player-tools.js";

vi.mock("../../application/stats/historical-player-queries.js", () => ({
  searchHistoricalPlayers: vi.fn(),
  queryHistoricalPlayerStats: vi.fn(),
}));

describe("player tool catalog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("describes both operations from their input schemas", () => {
    expect(playerToolDefinitions.map(tool => tool.function.name)).toEqual([
      "findPlayers",
      "getPlayerStats",
    ]);
    const stats = playerToolDefinitions[1].function.parameters;
    expect(stats.required).toEqual(["playerName"]);
    expect(stats.additionalProperties).toBe(false);
    expect(stats.properties).toHaveProperty("dateFrom");
  });

  it("dispatches raw arguments to the matching application operation", async () => {
    const input = { name: "Juan Portugal" };
    vi.mocked(searchHistoricalPlayers).mockResolvedValue({
      status: "matched",
      player: "Juan Portugal",
    });
    expect(await executeTool("findPlayers", input)).toEqual({
      status: "matched",
      player: "Juan Portugal",
    });
    expect(searchHistoricalPlayers).toHaveBeenCalledWith(input);
    await executeTool("getPlayerStats", {
      playerName: "Juan Portugal",
      category: "Cuarta",
    });
    expect(queryHistoricalPlayerStats).toHaveBeenCalledWith({
      playerName: "Juan Portugal",
      category: "Cuarta",
    });
  });

  it.each(["unknown", "constructor", "toString", "__proto__"])(
    "rejects unregistered tool %s",
    async name => {
      await expect(executeTool(name, {})).rejects.toThrow("Unknown tool");
      expect(searchHistoricalPlayers).not.toHaveBeenCalled();
      expect(queryHistoricalPlayerStats).not.toHaveBeenCalled();
    }
  );
});
