import type { ArchivedTournament } from "./archived-tournament.js";
import { compareCategories } from "./categories.js";
import { matchResult, setsWon } from "./match-result.js";
import type { Player } from "./player.js";

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
      const result = matchResult(partido);
      if (!result) continue;
      for (const id of parejas.get(result.ganador.id)?.jugadores ?? []) {
        const entry = stats.get(id);
        if (entry) entry.titulos += 1;
      }
      for (const id of parejas.get(result.perdedor.id)?.jugadores ?? []) {
        const entry = stats.get(id);
        if (entry) entry.subcampeonatos += 1;
      }
    }
  }

  return [...stats.values()];
}

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

const byCategory = (a: CategoryRecord, b: CategoryRecord) =>
  compareCategories(a.categoria, b.categoria);

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

      const [setsA, setsB] = setsWon(partido.sets);
      tally.setsGanados += isA ? setsA : setsB;
      tally.setsPerdidos += isA ? setsB : setsA;
      const result = matchResult(partido);
      if (!result) continue;
      const won = result.ganador.id === pareja.id;
      if (won) tally.partidosGanados += 1;
      else tally.partidosPerdidos += 1;

      if (partido.fase !== "final") continue;
      if (won) {
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
