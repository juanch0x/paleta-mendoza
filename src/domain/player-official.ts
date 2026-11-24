import { isoYear } from "./archived-tournament.js";
import type { CategoriaOficial, Player, PosicionAnual } from "./player.js";

/**
 * The official category in effect on `fecha` (ISO date): the latest entry
 * whose `desde` is on or before that date. Undefined when none applies.
 */
export function categoryOn(
  player: Partial<Player>,
  fecha: string
): CategoriaOficial | undefined {
  let current: CategoriaOficial | undefined;
  for (const entry of player.categorias ?? []) {
    if (entry.desde > fecha) continue;
    if (!current || entry.desde >= current.desde) current = entry;
  }
  return current;
}

/** The player's position for `anio`, if recorded. */
export function positionIn(
  player: Player,
  anio: number
): PosicionAnual | undefined {
  return player.posiciones?.find(entry => entry.anio === anio);
}

export type OfficialProfile = {
  /** Category in effect on the reference date. */
  categoria: CategoriaOficial | undefined;
  /** Position for the reference date's year. */
  posicion: PosicionAnual | undefined;
  /** Category changes that took effect during that year, up to `hoy`. */
  cambios: CambioDeCategoria[];
};

export type CambioDeCategoria = CategoriaOficial & { anterior: string };

/**
 * Official category and position of a player as of `hoy` (ISO date), plus
 * the category changes of that year. Pure; works for players without data.
 */
export function buildOfficialProfile(
  player: Player,
  hoy: string
): OfficialProfile {
  const anio = isoYear(hoy);
  return {
    categoria: categoryOn(player, hoy),
    posicion: positionIn(player, anio),
    cambios: categoryChangesIn(player, anio, hoy),
  };
}

function categoryChangesIn(
  player: Player,
  anio: number,
  hoy: string
): CambioDeCategoria[] {
  const history = [...(player.categorias ?? [])]
    .filter(entry => entry.desde <= hoy)
    .sort((a, b) => a.desde.localeCompare(b.desde));
  return history.flatMap((entry, index) =>
    index > 0 && isoYear(entry.desde) === anio
      ? [{ ...entry, anterior: history[index - 1].categoria }]
      : []
  );
}
