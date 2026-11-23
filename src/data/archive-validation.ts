/**
 * Shared integrity check for archived (frozen) tournaments.
 *
 * Used by both the freeze step (before writing an archive) and the site build
 * (when loading archives). The live, in-progress tournament is never validated
 * here. New rules are added to `archiveRules`.
 */

export type ArchiveMatch = {
  id: string;
  categoria: string;
  fase: string;
  sets: readonly unknown[];
};

export type ArchiveToValidate = {
  slug: string;
  nombre: string;
  parejas?: readonly { categoria: string }[];
  partidos: readonly ArchiveMatch[];
};

/** A rule returns one human-readable problem per violation, without the tournament prefix. */
export type ArchiveRule = (tournament: ArchiveToValidate) => string[];

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

export const archiveRules: readonly ArchiveRule[] = [
  matchesHaveScore,
  categoriesHaveFinal,
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
export function findArchiveProblems(tournament: ArchiveToValidate): string[] {
  return archiveRules.flatMap(rule => rule(tournament));
}

/** Throws an ArchiveValidationError naming the tournament and every offending match or category. */
export function validateArchive(tournament: ArchiveToValidate): void {
  const problems = findArchiveProblems(tournament);
  if (problems.length > 0) {
    throw new ArchiveValidationError(
      `${tournament.slug} (${tournament.nombre})`,
      problems
    );
  }
}
