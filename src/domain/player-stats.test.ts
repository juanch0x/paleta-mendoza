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
  partidos: PartidoResuelto[],
  fecha = "Octubre 2026"
): ArchivedTournament => ({ slug, nombre: slug, fecha, parejas, partidos });

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

  describe("historial", () => {
    const ef = pareja("3A-3", ["eli-epsilon", "fede-fi"]);
    const registry = [
      ...players,
      player("eli-epsilon", "Eli Epsilon"),
      player("fede-fi", "Fede Fi"),
    ];
    const historialOf = (id: string, tournaments: ArchivedTournament[]) =>
      statsOf(id, tournaments, registry)?.historial;

    it("counts finals and semifinals reached", () => {
      const torneo = tournament(
        "torneo-uno",
        [ab, cd, ef],
        [
          partido("1", "semi", ab, ef, [
            [12, 5],
            [12, 6],
          ]),
          partido("2", "final", cd, ab, [
            [12, 5],
            [12, 6],
          ]),
        ]
      );

      expect(historialOf("ana-alfa", [torneo])?.total).toMatchObject({
        finales: 1,
        semifinales: 1,
      });
      expect(historialOf("eli-epsilon", [torneo])?.total).toMatchObject({
        finales: 0,
        semifinales: 1,
      });
    });

    it("counts matches and sets won and lost, with a possible walkover as a regular win", () => {
      const torneo = tournament(
        "torneo-uno",
        [ab, cd, ef],
        [
          partido("1", "grupo", ab, cd, [
            [12, 0],
            [12, 0],
          ]),
          partido("2", "grupo", ef, ab, [
            [12, 8],
            [6, 12],
            [7, 5],
          ]),
          partido("3", "grupo", cd, ef, []),
        ]
      );

      expect(historialOf("ana-alfa", [torneo])?.total).toMatchObject({
        partidosGanados: 1,
        partidosPerdidos: 1,
        setsGanados: 3,
        setsPerdidos: 2,
      });
      expect(historialOf("caro-gama", [torneo])?.total).toMatchObject({
        partidosGanados: 0,
        partidosPerdidos: 1,
        setsGanados: 0,
        setsPerdidos: 2,
      });
    });

    it("counts titles, runner-ups and distinct partners the player won titles with", () => {
      const ae = pareja("3A-4", ["ana-alfa", "eli-epsilon"]);
      const final = (slug: string, winner: ArchivedPareja) =>
        tournament(
          slug,
          [winner, cd],
          [
            partido("1", "final", winner, cd, [
              [12, 5],
              [12, 6],
            ]),
          ]
        );
      const lost = tournament(
        "torneo-cuatro",
        [ab, cd],
        [
          partido("1", "final", cd, ab, [
            [12, 5],
            [12, 6],
          ]),
        ]
      );
      const tournaments = [
        final("torneo-uno", ab),
        final("torneo-dos", ab),
        final("torneo-tres", ae),
        lost,
      ];

      expect(historialOf("ana-alfa", tournaments)?.total).toMatchObject({
        titulos: 3,
        subcampeonatos: 1,
        finales: 4,
        companerosCampeones: 2,
      });
      expect(historialOf("caro-gama", tournaments)?.total).toMatchObject({
        titulos: 1,
        subcampeonatos: 3,
        companerosCampeones: 1,
      });
    });

    it("does not create a semifinal in a category played without semis", () => {
      const torneo = tournament(
        "torneo-uno",
        [ab, cd],
        [
          partido("1", "grupo", ab, cd, [
            [12, 5],
            [12, 6],
          ]),
          partido("2", "final", ab, cd, [
            [12, 5],
            [12, 6],
          ]),
        ]
      );

      expect(historialOf("ana-alfa", [torneo])?.total).toMatchObject({
        finales: 1,
        semifinales: 0,
      });
    });

    it("breaks the record down by year, newest first, and by category", () => {
      const primeraAc = pareja("1A-1", ["ana-alfa", "caro-gama"], "Primera");
      const primeraEf = pareja("1A-2", ["eli-epsilon", "fede-fi"], "Primera");
      const win = [
        [12, 5],
        [12, 6],
      ] as SetScore[];
      const tercera2025 = tournament(
        "apertura-2025",
        [ab, cd],
        [partido("1", "final", ab, cd, win)],
        "Abril 2025"
      );
      const tercera2026 = tournament(
        "apertura-2026",
        [ab, cd],
        [partido("1", "final", cd, ab, win)],
        "Mayo 2026"
      );
      const primera2026 = tournament(
        "clausura-2026",
        [primeraAc, primeraEf],
        [partido("1", "final", primeraAc, primeraEf, win)],
        "Octubre 2026"
      );

      const historial = historialOf("ana-alfa", [
        tercera2025,
        tercera2026,
        primera2026,
      ]);

      expect(historial?.total).toMatchObject({
        titulos: 2,
        subcampeonatos: 1,
      });
      expect(
        historial?.porCategoria.map(c => [
          c.categoria,
          c.figuras.titulos,
          c.figuras.subcampeonatos,
        ])
      ).toEqual([
        ["Primera", 1, 0],
        ["Tercera", 1, 1],
      ]);
      expect(
        historial?.porAnio.map(y => ({
          anio: y.anio,
          titulos: y.total.titulos,
          categorias: y.porCategoria.map(c => [
            c.categoria,
            c.figuras.titulos,
            c.figuras.subcampeonatos,
          ]),
        }))
      ).toEqual([
        {
          anio: 2026,
          titulos: 1,
          categorias: [
            ["Primera", 1, 0],
            ["Tercera", 0, 1],
          ],
        },
        { anio: 2025, titulos: 1, categorias: [["Tercera", 1, 0]] },
      ]);
    });

    it("leaves the breakdowns empty for a player with no archived matches", () => {
      expect(historialOf("eli-epsilon", [])).toEqual({
        total: {
          titulos: 0,
          subcampeonatos: 0,
          finales: 0,
          semifinales: 0,
          partidosGanados: 0,
          partidosPerdidos: 0,
          setsGanados: 0,
          setsPerdidos: 0,
          companerosCampeones: 0,
        },
        porAnio: [],
        porCategoria: [],
      });
    });
  });
});
