import { validateArchive } from "./archive-validation.js";
import type { FrozenTournament } from "./freeze.js";
import registry from "./torneos/registro.json";

const archiveFiles = import.meta.glob<FrozenTournament>(
  ["./torneos/archivos/*.json", "./torneos/archivos/*/torneo.json"],
  { eager: true, import: "default" }
);

/**
 * Loads every tournament in the archive registry and runs the shared archive
 * validation on each, so the build fails on an incomplete archive.
 */
export function loadRegisteredArchives(): FrozenTournament[] {
  return registry.map(entry => {
    const tournament =
      archiveFiles[`./torneos/archivos/${entry.slug}/torneo.json`] ??
      archiveFiles[`./torneos/archivos/${entry.slug}.json`];
    if (!tournament)
      throw new Error(`No se encontró el histórico ${entry.slug}.`);
    validateArchive(tournament);
    return tournament;
  });
}
