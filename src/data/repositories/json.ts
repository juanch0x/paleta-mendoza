import { getCollection } from "astro:content";

import registry from "../torneos/registro.json";
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

const archives = import.meta.glob<ArchiveRecord>(
  ["../torneos/archivos/*.json", "../torneos/archivos/*/torneo.json"],
  { eager: true, import: "default" }
);

/** Archived tournaments listed in `torneos/registro.json`, in registry order. */
export const jsonArchivedTournamentRepository: ArchivedTournamentRepository = {
  async list() {
    return registry.map(entry => {
      const tournament =
        archives[`../torneos/archivos/${entry.slug}/torneo.json`] ??
        archives[`../torneos/archivos/${entry.slug}.json`];
      if (!tournament)
        throw new Error(`No se encontró el histórico ${entry.slug}.`);
      return tournament;
    });
  },
};
