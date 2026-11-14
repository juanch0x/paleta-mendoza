import { parseArgs } from "node:util";

import { queryHistoricalPlayerStats } from "../src/application/stats/historical-player-queries.js";

const usage = `Usage: pnpm exec tsx scripts/query-player-stats.ts "Player Name" [--category "Cuarta"] [--date-from YYYY-MM-DD] [--date-to YYYY-MM-DD]\n`;
async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      category: { type: "string" },
      "date-from": { type: "string" },
      "date-to": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    process.stdout.write(usage);
    return;
  }
  if (positionals.length !== 1 || !positionals[0].trim())
    throw new Error("Provide exactly one quoted player name.");
  if (values.category !== undefined && !values.category.trim())
    throw new Error("Category must not be empty.");

  const filters = {
    ...(values.category !== undefined ? { category: values.category } : {}),
    ...(values["date-from"] !== undefined
      ? { dateFrom: values["date-from"] }
      : {}),
    ...(values["date-to"] !== undefined ? { dateTo: values["date-to"] } : {}),
  };
  const output = await queryHistoricalPlayerStats({
    ...filters,
    playerName: positionals[0],
  });
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n${usage}`
  );
  process.exitCode = 1;
});
