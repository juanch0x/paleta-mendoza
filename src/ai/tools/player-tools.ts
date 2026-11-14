import { z } from "zod";

import {
  queryHistoricalPlayerStats,
  searchHistoricalPlayers,
} from "../../application/stats/historical-player-queries.js";
import { playerSearchSchema } from "../../application/stats/player-search-schema.js";
import { playerStatsSchema } from "../../application/stats/player-stats-schema.js";

type ToolRegistration = {
  description: string;
  schema: z.ZodType;
  execute: (input: unknown) => Promise<unknown>;
};

/** One catalog supplies both the model's definitions and local execution. */
const playerTools: Record<string, ToolRegistration> = {
  findPlayers: {
    description:
      "Find a player by full name before requesting statistics. Preserve the user's spelling. Returns matched, suggestions requiring user confirmation, or not_found. Never automatically select a suggestion.",
    schema: playerSearchSchema,
    execute: searchHistoricalPlayers,
  },
  getPlayerStats: {
    description:
      "Get historical wins, losses and win percentage for an exactly identified player. Use the matched name from findPlayers. Optional category and dates filter whole tournaments by inclusive overlap; omit filters for overall statistics. If suggestions or not_found are returned, do not calculate or guess statistics.",
    schema: playerStatsSchema,
    execute: queryHistoricalPlayerStats,
  },
};

export const playerToolDefinitions = Object.entries(playerTools).map(
  ([name, tool]) => ({
    type: "function" as const,
    function: {
      name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.schema),
    },
  })
);

export type ToolDefinition = (typeof playerToolDefinitions)[number];

/** Arguments remain unknown until the application validates its own contract. */
export async function executeTool(
  name: string,
  input: unknown
): Promise<unknown> {
  if (!Object.prototype.hasOwnProperty.call(playerTools, name))
    throw new Error(`Unknown tool: ${name}`);
  return playerTools[name].execute(input);
}
