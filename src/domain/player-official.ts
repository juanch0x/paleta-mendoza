import {
  isoYear,
  tournamentYear,
  type ArchivedTournament,
} from "./archived-tournament.js";
import { compareCategories } from "./categories.js";
import { matchResult } from "./match-result.js";
import type {
  CategoriaOficial,
  Player,
  Posicion,
  PosicionAnual,
} from "./player.js";

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
  /** True when that position is the organizer's provisional guess. */
  posicionProvisoria: boolean;
  /** Category changes that took effect during that year, up to `hoy`. */
  cambios: CambioDeCategoria[];
  /** Every year with titles, most recent first. */
  titulosPorPosicion: TitulosPorPosicion[];
};

export type CambioDeCategoria = CategoriaOficial & { anterior: string };

/** Titles won in one year, under the position recorded for that year. */
export type TitulosPorPosicion = {
  anio: number;
  posicion: Posicion | undefined;
  provisoria: boolean;
  titulos: number;
  /** That year's titles per category, highest category first. */
  porCategoria: { categoria: string; titulos: number }[];
};

/**
 * Official category and position of a player as of `hoy` (ISO date), plus
 * what happened during that year. Pure; works for players without data.
 */
export function buildOfficialProfile(
  player: Player,
  tournaments: readonly ArchivedTournament[],
  hoy: string
): OfficialProfile {
  const anio = isoYear(hoy);
  const posicion = positionIn(player, anio);
  return {
    categoria: categoryOn(player, hoy),
    posicion,
    posicionProvisoria: posicion?.origen === "provisoria",
    cambios: categoryChangesIn(player, anio, hoy),
    titulosPorPosicion: titlesByPosition(player, tournaments),
  };
}

function titlesByPosition(
  player: Player,
  tournaments: readonly ArchivedTournament[]
): TitulosPorPosicion[] {
  const titlesByYear = new Map<number, Map<string, number>>();
  for (const tournament of tournaments) {
    const anio = tournamentYear(tournament);
    if (anio === undefined) continue;
    for (const categoria of categoriesWonIn(tournament, player.id)) {
      const ofYear = titlesByYear.get(anio) ?? new Map<string, number>();
      ofYear.set(categoria, (ofYear.get(categoria) ?? 0) + 1);
      titlesByYear.set(anio, ofYear);
    }
  }
  return [...titlesByYear]
    .sort(([a], [b]) => b - a)
    .map(([anio, byCategory]) => {
      const posicion = positionIn(player, anio);
      const porCategoria = [...byCategory]
        .map(([categoria, titulos]) => ({ categoria, titulos }))
        .sort((a, b) => compareCategories(a.categoria, b.categoria));
      return {
        anio,
        posicion: posicion?.posicion,
        provisoria: posicion?.origen === "provisoria",
        titulos: porCategoria.reduce((sum, c) => sum + c.titulos, 0),
        porCategoria,
      };
    });
}

/** Category of each final of `tournament` won by a pair with `playerId`. */
function categoriesWonIn(
  tournament: ArchivedTournament,
  playerId: string
): string[] {
  const parejas = new Map(tournament.parejas.map(p => [p.id, p]));
  return tournament.partidos.flatMap(partido => {
    if (partido.fase !== "final") return [];
    const winner = matchResult(partido)?.ganador;
    const pareja = winner && parejas.get(winner.id);
    return pareja?.jugadores.includes(playerId) ? [pareja.categoria] : [];
  });
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
