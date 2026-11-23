import { validateArchive } from "./archive-validation.js";
import type { FrozenTournament } from "./freeze.js";
import registry from "./torneos/registro.json";
import type { Player } from "../domain/player-stats.js";

const archiveFiles = import.meta.glob<FrozenTournament>(
  ["./torneos/archivos/*.json", "./torneos/archivos/*/torneo.json"],
  { eager: true, import: "default" }
);

// Raw registry records; their schema is enforced by the `jugadores` collection.
const playerFiles = import.meta.glob<Player>("./jugadores/*.json", {
  eager: true,
  import: "default",
});

/**
 * Loads every tournament in the archive registry and runs the shared archive
 * validation on each, so the build fails on an incomplete archive or on a
 * pair that references a player missing from the registry.
 */
export function loadRegisteredArchives(): FrozenTournament[] {
  const players = Object.values(playerFiles);
  return registry.map(entry => {
    const tournament =
      archiveFiles[`./torneos/archivos/${entry.slug}/torneo.json`] ??
      archiveFiles[`./torneos/archivos/${entry.slug}.json`];
    if (!tournament)
      throw new Error(`No se encontró el histórico ${entry.slug}.`);
    validateArchive(tournament, { players });
    return tournament;
  });
}
