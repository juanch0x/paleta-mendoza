import {
  isoYear,
  tournamentDate,
  tournamentEndDate,
  type ArchivedPareja,
  type ArchivedTournament,
} from "./archived-tournament.js";
import { compareCategories, isLowerCategory } from "./categories.js";
import { matchResult } from "./match-result.js";
import type { Player, Posicion } from "./player.js";
import { categoryOn, positionIn } from "./player-official.js";

/** Figures the annual table shows and orders by. */
export type TableFigures = {
  titulos: number;
  finales: number;
  partidosGanados: number;
  partidosPerdidos: number;
};

export type AnnualTableRow = TableFigures & {
  player: Player;
  /**
   * Rank among regular rows (ties share it); undefined for lower-category
   * and promoted rows.
   */
  puesto: number | undefined;
  /** True when the player's official category is lower than the table's. */
  categoriaInferior: boolean;
  /**
   * True when the player was promoted out of the table's category: their
   * official category at the end of the period is higher than the table's.
   */
  ascendio: boolean;
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
 * promotion), in which case only those count. A player whose official
 * category at the end of the period (the last match date) is higher than the
 * table's was promoted out of it: their row stays, unranked. Players without
 * an official category or a position for the year are left out.
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
  const periodEnd = latestEndDate(tournaments);

  for (const tournament of tournaments) {
    const fecha = tournamentDate(tournament);
    if (!fecha) continue;
    for (const pareja of tournament.parejas) {
      const figures = pairFigures(tournament, pareja);
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
        addTableFigures(entry.oficial ?? entry.inferior, figures);
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
    const finalCategory =
      periodEnd && categoryOn(entry.player, periodEnd)?.categoria;
    table.filas.push({
      player: entry.player,
      ...(entry.oficial ?? entry.inferior),
      puesto: undefined,
      categoriaInferior: !entry.oficial,
      ascendio:
        !!entry.oficial &&
        !!finalCategory &&
        isLowerCategory(entry.categoria, finalCategory),
      posicionProvisoria: entry.provisoria,
    });
    if (entry.provisoria) table.posicionesProvisorias = true;
  }

  for (const table of tables.values()) rankRows(table.filas);

  return [...tables.values()].sort(
    (a, b) =>
      compareCategories(a.categoria, b.categoria) ||
      POSITION_ORDER.indexOf(a.posicion) - POSITION_ORDER.indexOf(b.posicion)
  );
}

/**
 * Sorts rows by the table criterion and ranks regular rows; ties share a rank.
 * Lower-category and promoted rows keep their place but take no rank.
 */
function rankRows(filas: AnnualTableRow[]): void {
  filas.sort(
    (a, b) =>
      compareTableFigures(a, b) ||
      a.player.nombreOficial.localeCompare(b.player.nombreOficial, "es")
  );
  let ranked = 0;
  let previous: AnnualTableRow | undefined;
  for (const fila of filas) {
    if (fila.categoriaInferior || fila.ascendio) continue;
    ranked += 1;
    fila.puesto =
      previous && compareTableFigures(previous, fila) === 0
        ? previous.puesto
        : ranked;
    previous = fila;
  }
}

/** The last match date over every tournament; undefined when none is dated. */
function latestEndDate(
  tournaments: readonly ArchivedTournament[]
): string | undefined {
  let latest: string | undefined;
  for (const tournament of tournaments) {
    const end = tournamentEndDate(tournament);
    if (end && (!latest || end > latest)) latest = end;
  }
  return latest;
}

/** A pair's table figures in one tournament: matches, final reached, title. */
function pairFigures(
  tournament: ArchivedTournament,
  pareja: ArchivedPareja
): TableFigures {
  const figures = emptyTableFigures();
  for (const partido of tournament.partidos) {
    if (partido.a.tipo !== "pareja" || partido.b.tipo !== "pareja") continue;
    const isA = partido.a.pareja.id === pareja.id;
    if (!isA && partido.b.pareja.id !== pareja.id) continue;
    if (partido.fase === "final") figures.finales = 1;
    const result = matchResult(partido);
    if (!result) continue;
    const won = result.ganador.id === pareja.id;
    if (won) figures.partidosGanados += 1;
    else figures.partidosPerdidos += 1;
    if (won && partido.fase === "final") figures.titulos += 1;
  }
  return figures;
}
