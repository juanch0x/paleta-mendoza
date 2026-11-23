import {
  tournamentDate,
  type ArchivedTournament,
} from "./archived-tournament.js";
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
  const titlesByYear = new Map<number, number>();
  for (const tournament of tournaments) {
    const fecha = tournamentDate(tournament);
    if (!fecha) continue;
    const titles = titlesWonIn(tournament, player.id);
    if (titles === 0) continue;
    const anio = isoYear(fecha);
    titlesByYear.set(anio, (titlesByYear.get(anio) ?? 0) + titles);
  }
  return [...titlesByYear]
    .sort(([a], [b]) => b - a)
    .map(([anio, titulos]) => {
      const posicion = positionIn(player, anio);
      return {
        anio,
        posicion: posicion?.posicion,
        provisoria: posicion?.origen === "provisoria",
        titulos,
      };
    });
}

/** Finals of `tournament` won by a pair that includes `playerId`. */
function titlesWonIn(tournament: ArchivedTournament, playerId: string): number {
  const parejas = new Map(tournament.parejas.map(p => [p.id, p]));
  let titles = 0;
  for (const partido of tournament.partidos) {
    if (partido.fase !== "final") continue;
    if (partido.a.tipo !== "pareja" || partido.b.tipo !== "pareja") continue;
    const setsA = partido.sets.filter(([a, b]) => a > b).length;
    const setsB = partido.sets.length - setsA;
    if (setsA === setsB) continue;
    const winner = setsA > setsB ? partido.a.pareja : partido.b.pareja;
    if (parejas.get(winner.id)?.jugadores.includes(playerId)) titles += 1;
  }
  return titles;
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

/** Year of an ISO date (YYYY-MM-DD). */
function isoYear(fecha: string): number {
  return Number(fecha.slice(0, 4));
}
