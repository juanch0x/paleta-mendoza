import type { Pareja, PartidoResuelto } from "./types.js";

/** A pair in an archived tournament, with the registry ids of both members. */
export type ArchivedPareja = Pareja & {
  jugadores: readonly [string, string];
};

export type ArchivedTournament = {
  slug: string;
  nombre: string;
  /** Display date such as "Octubre 2026"; never read for years (see `tournamentYear`). */
  fecha: string;
  parejas: readonly ArchivedPareja[];
  partidos: readonly PartidoResuelto[];
};

/**
 * The date a tournament is played on, for category and year lookups: the
 * earliest match date (ISO). Undefined when no match has a date.
 */
export function tournamentDate(tournament: {
  partidos: readonly { fecha?: string }[];
}): string | undefined {
  let earliest: string | undefined;
  for (const partido of tournament.partidos) {
    if (partido.fecha && (!earliest || partido.fecha < earliest))
      earliest = partido.fecha;
  }
  return earliest;
}

/** Year of an ISO date (YYYY-MM-DD). */
export function isoYear(fecha: string): number {
  return Number(fecha.slice(0, 4));
}

/**
 * The year a tournament counts for: the year of `tournamentDate`. Undefined
 * when no match has a date.
 */
export function tournamentYear(tournament: {
  partidos: readonly { fecha?: string }[];
}): number | undefined {
  const fecha = tournamentDate(tournament);
  return fecha ? isoYear(fecha) : undefined;
}
