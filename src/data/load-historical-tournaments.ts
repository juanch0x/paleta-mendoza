import { readFile } from "node:fs/promises";
import type { FrozenTournament } from "./freeze.js";

const dataDirectory = new URL("./torneos/", import.meta.url);

async function loadArchive(slug: string): Promise<FrozenTournament> {
  const current = new URL(`archivos/${slug}/torneo.json`, dataDirectory);
  let source: string;
  try {
    source = await readFile(current, "utf8");
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    )
      throw error;
    // Older snapshots predate the per-tournament directory layout.
    source = await readFile(
      new URL(`archivos/${slug}.json`, dataDirectory),
      "utf8"
    );
  }
  return JSON.parse(source) as FrozenTournament;
}

export async function loadHistoricalTournaments(): Promise<FrozenTournament[]> {
  const registry = JSON.parse(
    await readFile(new URL("registro.json", dataDirectory), "utf8")
  ) as { slug: string }[];
  return Promise.all(registry.map(({ slug }) => loadArchive(slug)));
}
