/**
 * Shared integrity check for archived (frozen) tournaments.
 *
 * Used by both the freeze step (before writing an archive) and the site build
 * (when loading archives). The live, in-progress tournament is never validated
 * here. New rules are added to `archiveRules`.
 */

import {
  categoryOn,
  isLowerCategory,
  tournamentDate,
  type Player,
} from "../domain/player-stats.js";

export type ArchiveMatch = {
  id: string;
  categoria: string;
  fase: string;
  /** ISO match date; the earliest one is the tournament date. */
  fecha?: string;
  sets: readonly unknown[];
};

export type ArchivePareja = {
  id: string;
  categoria: string;
  jugadores?: readonly string[];
};

export type ArchiveToValidate = {
  slug: string;
  nombre: string;
  parejas?: readonly ArchivePareja[];
  partidos: readonly ArchiveMatch[];
};

/** Registry data the rules check archives against. */
export type ArchiveValidationContext = {
  players: readonly Pick<Player, "id" | "categorias">[];
};

/** A rule returns one human-readable problem per violation, without the tournament prefix. */
export type ArchiveRule = (
  tournament: ArchiveToValidate,
  context: ArchiveValidationContext
) => string[];

const matchesHaveScore: ArchiveRule = tournament =>
  tournament.partidos
    .filter(partido => partido.sets.length === 0)
    .map(
      partido =>
        `el partido ${partido.id} (${partido.categoria}, ${partido.fase}) está sin resultado.`
    );

const categoriesHaveFinal: ArchiveRule = tournament => {
  const categorias = new Set([
    ...(tournament.parejas ?? []).map(pareja => pareja.categoria),
    ...tournament.partidos.map(partido => partido.categoria),
  ]);
  const conFinal = new Set(
    tournament.partidos
      .filter(partido => partido.fase === "final")
      .map(partido => partido.categoria)
  );
  return [...categorias]
    .filter(categoria => !conFinal.has(categoria))
    .map(categoria => `la categoría ${categoria} no tiene final.`);
};

const pairsReferenceKnownPlayers: ArchiveRule = (tournament, context) => {
  const known = new Set(context.players.map(player => player.id));
  return (tournament.parejas ?? []).flatMap(pareja => {
    if (pareja.jugadores?.length !== 2)
      return [`la pareja ${pareja.id} está sin jugadores registrados.`];
    return pareja.jugadores
      .filter(id => !known.has(id))
      .map(
        id => `la pareja ${pareja.id} referencia al jugador desconocido ${id}.`
      );
  });
};

const playersNotBelowOfficialCategory: ArchiveRule = (tournament, context) => {
  const fecha = tournamentDate(tournament);
  if (!fecha) return [];
  const byId = new Map(context.players.map(player => [player.id, player]));
  return (tournament.parejas ?? []).flatMap(pareja =>
    (pareja.jugadores ?? []).flatMap(id => {
      const player = byId.get(id);
      const official = player && categoryOn(player, fecha)?.categoria;
      if (!official || !isLowerCategory(pareja.categoria, official)) return [];
      return [
        `la pareja ${pareja.id} tiene a ${id} jugando en ${pareja.categoria}, por debajo de su categoría oficial ${official} al ${fecha}.`,
      ];
    })
  );
};

export const archiveRules: readonly ArchiveRule[] = [
  matchesHaveScore,
  categoriesHaveFinal,
  pairsReferenceKnownPlayers,
  playersNotBelowOfficialCategory,
];

export class ArchiveValidationError extends Error {
  constructor(
    readonly slug: string,
    readonly problems: readonly string[]
  ) {
    super(`Histórico ${slug} inválido: ${problems.join(" ")}`);
    this.name = "ArchiveValidationError";
  }
}

/** Returns every problem found by the archive rules; empty when the archive is valid. */
export function findArchiveProblems(
  tournament: ArchiveToValidate,
  context: ArchiveValidationContext
): string[] {
  return archiveRules.flatMap(rule => rule(tournament, context));
}

/** Throws an ArchiveValidationError naming the tournament and every offending match, category or pair. */
export function validateArchive(
  tournament: ArchiveToValidate,
  context: ArchiveValidationContext
): void {
  const problems = findArchiveProblems(tournament, context);
  if (problems.length > 0) {
    throw new ArchiveValidationError(
      `${tournament.slug} (${tournament.nombre})`,
      problems
    );
  }
}
