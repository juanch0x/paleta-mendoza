import type { Pareja, PartidoResuelto } from "./types.js";

export type Player = {
  id: string;
  nombreOficial: string;
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
