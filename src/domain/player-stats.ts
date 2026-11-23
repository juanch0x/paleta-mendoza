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
  /** Display date such as "Octubre 2026"; the year is read from it. */
  fecha: string;
  parejas: readonly ArchivedPareja[];
  partidos: readonly PartidoResuelto[];
};

export type PlayerStats = {
  player: Player;
  titulos: number;
  subcampeonatos: number;
  historial: PlayerHistorial;
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
      {
        player,
        titulos: 0,
        subcampeonatos: 0,
        historial: buildHistorial(player.id, tournaments),
      },
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

// --- Player historial (full profile record) ---

/** Figures of a player's record over a set of tournaments. */
export type RecordFigures = {
  titulos: number;
  subcampeonatos: number;
  finales: number;
  semifinales: number;
  partidosGanados: number;
  partidosPerdidos: number;
  setsGanados: number;
  setsPerdidos: number;
  /** Distinct partners the player won at least one title with. */
  companerosCampeones: number;
};

export type CategoryRecord = {
  categoria: string;
  figuras: RecordFigures;
};

export type YearRecord = {
  anio: number;
  total: RecordFigures;
  /** Categories played that year, highest category first. */
  porCategoria: CategoryRecord[];
};

/** A player's full record: overall, by year (newest first) and by category. */
export type PlayerHistorial = {
  total: RecordFigures;
  porAnio: YearRecord[];
  /** All years combined, highest category first. */
  porCategoria: CategoryRecord[];
};

const CATEGORY_ORDER = [
  "Primera",
  "Segunda",
  "Tercera",
  "Cuarta",
  "Quinta",
  "Sexta",
  "Séptima",
];

const categoryRank = (categoria: string) => {
  const index = CATEGORY_ORDER.indexOf(categoria);
  return index === -1 ? CATEGORY_ORDER.length : index;
};

const byCategory = (a: CategoryRecord, b: CategoryRecord) =>
  categoryRank(a.categoria) - categoryRank(b.categoria) ||
  a.categoria.localeCompare(b.categoria, "es");

/** Reads the year from an archive display date such as "Octubre 2026". */
export function yearOf(fecha: string): number {
  const match = /\b(\d{4})\b/.exec(fecha);
  if (!match) throw new Error(`No se pudo leer el año de la fecha "${fecha}".`);
  return Number(match[1]);
}

type Tally = Omit<RecordFigures, "companerosCampeones"> & {
  companeros: Set<string>;
};

const emptyTally = (): Tally => ({
  titulos: 0,
  subcampeonatos: 0,
  finales: 0,
  semifinales: 0,
  partidosGanados: 0,
  partidosPerdidos: 0,
  setsGanados: 0,
  setsPerdidos: 0,
  companeros: new Set(),
});

const toFigures = ({ companeros, ...rest }: Tally): RecordFigures => ({
  ...rest,
  companerosCampeones: companeros.size,
});

const mergeTallies = (tallies: readonly Tally[]): Tally => {
  const merged = emptyTally();
  for (const { companeros, ...counts } of tallies) {
    for (const key of Object.keys(counts) as (keyof typeof counts)[])
      merged[key] += counts[key];
    for (const id of companeros) merged.companeros.add(id);
  }
  return merged;
};

type Slice = { anio: number; categoria: string; tally: Tally };

const categoryRecords = (slices: readonly Slice[]): CategoryRecord[] =>
  [...new Set(slices.map(s => s.categoria))]
    .map(categoria => ({
      categoria,
      figuras: toFigures(
        mergeTallies(
          slices.filter(s => s.categoria === categoria).map(s => s.tally)
        )
      ),
    }))
    .sort(byCategory);

function buildHistorial(
  playerId: string,
  tournaments: readonly ArchivedTournament[]
): PlayerHistorial {
  const slices: Slice[] = [];
  const sliceFor = (anio: number, categoria: string) => {
    let slice = slices.find(s => s.anio === anio && s.categoria === categoria);
    if (!slice) {
      slice = { anio, categoria, tally: emptyTally() };
      slices.push(slice);
    }
    return slice.tally;
  };

  for (const tournament of tournaments) {
    const anio = yearOf(tournament.fecha);
    const own = new Map(
      tournament.parejas
        .filter(p => p.jugadores.includes(playerId))
        .map(p => [p.id, p])
    );
    // Phases the player reached in this tournament, per category tally, so a
    // final or semi counts once even if the archive repeats the phase.
    const reached = new Map<Tally, Set<string>>();
    for (const partido of tournament.partidos) {
      if (partido.a.tipo !== "pareja" || partido.b.tipo !== "pareja") continue;
      const pareja =
        own.get(partido.a.pareja.id) ?? own.get(partido.b.pareja.id);
      if (!pareja) continue;
      const isA = pareja.id === partido.a.pareja.id;
      const tally = sliceFor(anio, pareja.categoria);
      if (!reached.has(tally)) reached.set(tally, new Set());
      reached.get(tally)?.add(partido.fase);

      const setsA = partido.sets.filter(([a, b]) => a > b).length;
      const setsB = partido.sets.length - setsA;
      const [won, lost] = isA ? [setsA, setsB] : [setsB, setsA];
      tally.setsGanados += won;
      tally.setsPerdidos += lost;
      if (won > lost) tally.partidosGanados += 1;
      if (lost > won) tally.partidosPerdidos += 1;

      if (partido.fase !== "final" || won === lost) continue;
      if (won > lost) {
        tally.titulos += 1;
        const partner = pareja.jugadores.find(id => id !== playerId);
        if (partner) tally.companeros.add(partner);
      } else {
        tally.subcampeonatos += 1;
      }
    }
    for (const [tally, phases] of reached) {
      if (phases.has("final")) tally.finales += 1;
      if (phases.has("semi")) tally.semifinales += 1;
    }
  }

  const years = [...new Set(slices.map(s => s.anio))].sort((a, b) => b - a);
  return {
    total: toFigures(mergeTallies(slices.map(s => s.tally))),
    porAnio: years.map(anio => {
      const ofYear = slices.filter(s => s.anio === anio);
      return {
        anio,
        total: toFigures(mergeTallies(ofYear.map(s => s.tally))),
        porCategoria: categoryRecords(ofYear),
      };
    }),
    porCategoria: categoryRecords(slices),
  };
}

// ---------------------------------------------------------------------------
// Official category and position (ticket 07)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Annual table (ticket 09)
// ---------------------------------------------------------------------------

/** Figures the annual table shows and orders by. */
export type TableFigures = {
  titulos: number;
  finales: number;
  partidosGanados: number;
  partidosPerdidos: number;
};

export type AnnualTableRow = TableFigures & {
  player: Player;
  /** Rank among regular rows (ties share it); undefined for lower-category rows. */
  puesto: number | undefined;
  /** True when the player's official category is lower than the table's. */
  categoriaInferior: boolean;
  posicionProvisoria: boolean;
};

export type AnnualTable = {
  categoria: string;
  posicion: Posicion;
  filas: AnnualTableRow[];
  /** True when any row uses a provisional position. */
  posicionesProvisorias: boolean;
};

/**
 * The single ordering criterion of the annual table: titles, then finals,
 * then matches won. Replace it here when the federation's points table arrives.
 */
export function compareTableFigures(a: TableFigures, b: TableFigures): number {
  return (
    b.titulos - a.titulos ||
    b.finales - a.finales ||
    b.partidosGanados - a.partidosGanados
  );
}

/** True when category `a` is lower than category `b` (e.g. Tercera vs Segunda). */
export function isLowerCategory(a: string, b: string): boolean {
  const rankA = CATEGORY_ORDER.indexOf(a);
  const rankB = CATEGORY_ORDER.indexOf(b);
  return rankA !== -1 && rankB !== -1 && rankA > rankB;
}

const POSITION_ORDER: readonly Posicion[] = ["delantero", "zaguero"];

const emptyTableFigures = (): TableFigures => ({
  titulos: 0,
  finales: 0,
  partidosGanados: 0,
  partidosPerdidos: 0,
});

const addTableFigures = (into: TableFigures, from: TableFigures) => {
  into.titulos += from.titulos;
  into.finales += from.finales;
  into.partidosGanados += from.partidosGanados;
  into.partidosPerdidos += from.partidosPerdidos;
};

/**
 * Annual tables per category and position over the given tournaments. The
 * caller picks the set (a year, an edition, a single tournament).
 *
 * A tournament counts for a player only in the official category held on the
 * tournament date (`tournamentDate`), under the position of that year. A
 * player whose official category is lower than the one played appears in
 * that table unranked, unless they also have results counting there (after a
 * promotion), in which case only those count. Players without an official
 * category or a position for the year are left out.
 */
export function buildAnnualTables(
  players: readonly Player[],
  tournaments: readonly ArchivedTournament[]
): AnnualTable[] {
  type Entry = {
    player: Player;
    categoria: string;
    posicion: Posicion;
    provisoria: boolean;
    oficial: TableFigures | undefined;
    inferior: TableFigures;
  };
  const entries = new Map<string, Entry>();
  const byId = new Map(players.map(p => [p.id, p]));

  for (const tournament of tournaments) {
    const fecha = tournamentDate(tournament);
    if (!fecha) continue;
    for (const pareja of tournament.parejas) {
      for (const id of pareja.jugadores) {
        const player = byId.get(id);
        const official = player && categoryOn(player, fecha)?.categoria;
        const posicion = player && positionIn(player, isoYear(fecha));
        if (!player || !official || !posicion) continue;
        const counts = official === pareja.categoria;
        if (!counts && !isLowerCategory(official, pareja.categoria)) continue;

        const key = `${pareja.categoria}|${posicion.posicion}|${id}`;
        const entry = entries.get(key) ?? {
          player,
          categoria: pareja.categoria,
          posicion: posicion.posicion,
          provisoria: false,
          oficial: undefined,
          inferior: emptyTableFigures(),
        };
        entries.set(key, entry);
        if (posicion.origen === "provisoria") entry.provisoria = true;
        if (counts) entry.oficial ??= emptyTableFigures();
        addTableFigures(
          entry.oficial ?? entry.inferior,
          tournamentFigures(id, tournament, pareja.categoria)
        );
      }
    }
  }

  const tables = new Map<string, AnnualTable>();
  for (const entry of entries.values()) {
    const key = `${entry.categoria}|${entry.posicion}`;
    const table = tables.get(key) ?? {
      categoria: entry.categoria,
      posicion: entry.posicion,
      filas: [],
      posicionesProvisorias: false,
    };
    tables.set(key, table);
    table.filas.push({
      player: entry.player,
      ...(entry.oficial ?? entry.inferior),
      puesto: undefined,
      categoriaInferior: !entry.oficial,
      posicionProvisoria: entry.provisoria,
    });
    if (entry.provisoria) table.posicionesProvisorias = true;
  }

  for (const table of tables.values()) rankRows(table.filas);

  return [...tables.values()].sort(
    (a, b) =>
      categoryRank(a.categoria) - categoryRank(b.categoria) ||
      a.categoria.localeCompare(b.categoria, "es") ||
      POSITION_ORDER.indexOf(a.posicion) - POSITION_ORDER.indexOf(b.posicion)
  );
}

/** Sorts rows by the table criterion and ranks regular rows; ties share a rank. */
function rankRows(filas: AnnualTableRow[]): void {
  filas.sort(
    (a, b) =>
      compareTableFigures(a, b) ||
      a.player.nombreOficial.localeCompare(b.player.nombreOficial, "es")
  );
  let ranked = 0;
  let previous: AnnualTableRow | undefined;
  for (const fila of filas) {
    if (fila.categoriaInferior) continue;
    ranked += 1;
    fila.puesto =
      previous && compareTableFigures(previous, fila) === 0
        ? previous.puesto
        : ranked;
    previous = fila;
  }
}

/** A player's table figures in one category of one tournament. */
function tournamentFigures(
  playerId: string,
  tournament: ArchivedTournament,
  categoria: string
): TableFigures {
  const figuras = buildHistorial(playerId, [tournament]).porCategoria.find(
    record => record.categoria === categoria
  )?.figuras;
  if (!figuras) return emptyTableFigures();
  return {
    titulos: figuras.titulos,
    finales: figuras.finales,
    partidosGanados: figuras.partidosGanados,
    partidosPerdidos: figuras.partidosPerdidos,
  };
}
