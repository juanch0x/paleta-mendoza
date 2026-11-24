import { describe, expect, it } from "vitest";

import {
  buildPlayerStats,
  type ArchivedPareja,
  type ArchivedTournament,
  type Player,
} from "./player-stats.js";
import type { PartidoResuelto, SetScore } from "./types.js";

const player = (id: string, nombreOficial: string): Player => ({
  id,
  nombreOficial,
});

const players: Player[] = [
  player("ana-alfa", "Ana Alfa"),
  player("beto-beta", "Beto Beta"),
  player("caro-gama", "Caro Gama"),
  player("dani-delta", "Dani Delta"),
];

const pareja = (
  id: string,
  jugadores: readonly [string, string],
  categoria = "Tercera"
): ArchivedPareja => ({
  id,
  categoria,
  nombre: jugadores.join(" / "),
  jugadores,
});

const partido = (
  id: string,
  fase: string,
  a: ArchivedPareja,
  b: ArchivedPareja,
  sets: SetScore[]
): PartidoResuelto => ({
  id,
  categoria: a.categoria,
  fase,
  a: { tipo: "pareja", pareja: a },
  b: { tipo: "pareja", pareja: b },
  sets,
});

const tournament = (
  slug: string,
  parejas: ArchivedPareja[],
  partidos: PartidoResuelto[]
): ArchivedTournament => ({ slug, nombre: slug, parejas, partidos });

const statsOf = (
  id: string,
  tournaments: ArchivedTournament[],
  registry = players
) => buildPlayerStats(registry, tournaments).find(s => s.player.id === id);

describe("buildPlayerStats", () => {
  const ab = pareja("3A-1", ["ana-alfa", "beto-beta"]);
  const cd = pareja("3A-2", ["caro-gama", "dani-delta"]);

  it("gives a title to both members of the pair that wins the final", () => {
    const torneo = tournament(
      "torneo-uno",
      [ab, cd],
      [
        partido("1", "final", ab, cd, [
          [12, 8],
          [12, 10],
        ]),
      ]
    );

    expect(statsOf("ana-alfa", [torneo])?.titulos).toBe(1);
    expect(statsOf("beto-beta", [torneo])?.titulos).toBe(1);
  });

  it("gives a runner-up finish to both members of the pair that loses the final, decided by sets", () => {
    const torneo = tournament(
      "torneo-uno",
      [ab, cd],
      [
        partido("1", "final", ab, cd, [
          [12, 8],
          [9, 12],
          [5, 7],
        ]),
      ]
    );

    expect(statsOf("ana-alfa", [torneo])).toMatchObject({
      titulos: 0,
      subcampeonatos: 1,
    });
    expect(statsOf("caro-gama", [torneo])).toMatchObject({
      titulos: 1,
      subcampeonatos: 0,
    });
  });

  it("awards nothing for a final without a score", () => {
    const torneo = tournament(
      "torneo-uno",
      [ab, cd],
      [partido("1", "final", ab, cd, [])]
    );

    for (const id of ["ana-alfa", "caro-gama"]) {
      expect(statsOf(id, [torneo])).toMatchObject({
        titulos: 0,
        subcampeonatos: 0,
      });
    }
  });

  it("adds up finals across archived tournaments and ignores other phases", () => {
    const ac = pareja("1A-1", ["ana-alfa", "caro-gama"], "Primera");
    const bd = pareja("1A-2", ["beto-beta", "dani-delta"], "Primera");
    const uno = tournament(
      "torneo-uno",
      [ab, cd],
      [
        partido("1", "semi", cd, ab, [
          [12, 3],
          [12, 4],
        ]),
        partido("2", "final", ab, cd, [
          [12, 3],
          [12, 4],
        ]),
      ]
    );
    const dos = tournament(
      "torneo-dos",
      [ac, bd],
      [
        partido("1", "final", bd, ac, [
          [12, 3],
          [12, 4],
        ]),
      ]
    );

    expect(statsOf("ana-alfa", [uno, dos])).toMatchObject({
      titulos: 1,
      subcampeonatos: 1,
    });
    expect(statsOf("beto-beta", [uno, dos])).toMatchObject({
      titulos: 2,
      subcampeonatos: 0,
    });
    expect(statsOf("caro-gama", [uno, dos])).toMatchObject({
      titulos: 0,
      subcampeonatos: 2,
    });
  });

  it("returns every registry player, with zeroes for those who never reached a final", () => {
    const registry = [...players, player("eli-epsilon", "Eli Epsilon")];

    expect(
      buildPlayerStats(registry, []).map(s => [
        s.player.id,
        s.titulos,
        s.subcampeonatos,
      ])
    ).toEqual([
      ["ana-alfa", 0, 0],
      ["beto-beta", 0, 0],
      ["caro-gama", 0, 0],
      ["dani-delta", 0, 0],
      ["eli-epsilon", 0, 0],
    ]);
  });
});
