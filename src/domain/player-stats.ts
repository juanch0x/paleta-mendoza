import type { Pareja, PartidoResuelto } from "./types.js";

export type Player = {
  id: string;
  nombreOficial: string;
  /** Official category history; see `categoryOn`. */
  categorias?: readonly CategoriaOficial[];
  /** One position per year. */
  posiciones?: readonly PosicionAnual[];
};

/** An official category starting on `desde` (ISO date, YYYY-MM-DD). */
export type CategoriaOficial = {
  desde: string;
  categoria: string;
  origen: "federacion" | "ascenso";
};

export type Posicion = "delantero" | "zaguero";

export type PosicionAnual = {
  anio: number;
  posicion: Posicion;
  origen: "provisoria" | "federacion";
};

/** A pair in an archived tournament, with the registry ids of both members. */
export type ArchivedPareja = Pareja & {
  jugadores: readonly [string, string];
};

export type ArchivedTournament = {
  slug: string;
  nombre: string;
  parejas: readonly ArchivedPareja[];
  partidos: readonly PartidoResuelto[];
};

export type PlayerStats = {
  player: Player;
  titulos: number;
  subcampeonatos: number;
};

/**
 * Pure player statistics over archived tournaments. Returns one entry per
 * registry player, in registry order.
 */
export function buildPlayerStats(
  players: readonly Player[],
  tournaments: readonly ArchivedTournament[]
): PlayerStats[] {
  const stats = new Map<string, PlayerStats>(
    players.map(player => [
      player.id,
      { player, titulos: 0, subcampeonatos: 0 },
    ])
  );

  for (const tournament of tournaments) {
    const parejas = new Map(tournament.parejas.map(p => [p.id, p]));
    for (const partido of tournament.partidos) {
      if (partido.fase !== "final") continue;
      if (partido.a.tipo !== "pareja" || partido.b.tipo !== "pareja") continue;
      const setsA = partido.sets.filter(([a, b]) => a > b).length;
      const setsB = partido.sets.length - setsA;
      if (setsA === setsB) continue;
      const [winner, loser] =
        setsA > setsB
          ? [partido.a.pareja, partido.b.pareja]
          : [partido.b.pareja, partido.a.pareja];
      for (const id of parejas.get(winner.id)?.jugadores ?? []) {
        const entry = stats.get(id);
        if (entry) entry.titulos += 1;
      }
      for (const id of parejas.get(loser.id)?.jugadores ?? []) {
        const entry = stats.get(id);
        if (entry) entry.subcampeonatos += 1;
      }
    }
  }

  return [...stats.values()];
}

// ---------------------------------------------------------------------------
// Official category and position (ticket 07)
// ---------------------------------------------------------------------------

/**
 * The official category in effect on `fecha` (ISO date): the latest entry
 * whose `desde` is on or before that date. Undefined when none applies.
 */
export function categoryOn(
  player: Player,
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
  const anio = yearOf(hoy);
  const posicion = positionIn(player, anio);
  return {
    categoria: categoryOn(player, hoy),
    posicion,
    posicionProvisoria: posicion?.origen === "provisoria",
    cambios: categoryChangesIn(player, anio, hoy),
    titulosPorPosicion: titlesByPosition(player, tournaments),
  };
}

/**
 * The date a tournament is played on, for category and year lookups: the
 * earliest match date (ISO). Undefined when no match has a date.
 */
export function tournamentDate(
  tournament: ArchivedTournament
): string | undefined {
  let earliest: string | undefined;
  for (const partido of tournament.partidos) {
    if (partido.fecha && (!earliest || partido.fecha < earliest))
      earliest = partido.fecha;
  }
  return earliest;
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
    const anio = yearOf(fecha);
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
    index > 0 && yearOf(entry.desde) === anio
      ? [{ ...entry, anterior: history[index - 1].categoria }]
      : []
  );
}

function yearOf(fecha: string): number {
  return Number(fecha.slice(0, 4));
}
