import { getCollection } from "astro:content";

import { loadRegisteredArchives } from "../archives.js";
import type {
  ArchivedTournamentRepository,
  ArchiveRecord,
  PlayerRepository,
} from "./types.js";

/** Players backed by the `jugadores` content collection (one JSON per player). */
export const jsonPlayerRepository: PlayerRepository = {
  async list() {
    const entries = await getCollection("jugadores");
    return entries
      .map(entry => entry.data)
      .sort((a, b) => a.nombreOficial.localeCompare(b.nombreOficial, "es"));
  },
};

/**
 * Archived tournaments listed in `torneos/registro.json`, in registry order,
 * each one checked by the shared archive validation.
 */
export const jsonArchivedTournamentRepository: ArchivedTournamentRepository = {
  async list() {
    return loadRegisteredArchives() as unknown as ArchiveRecord[];
  },
};
