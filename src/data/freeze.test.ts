import { describe, expect, it } from "vitest";

import { validateArchive } from "./archive-validation.js";
import { loadRegisteredArchives } from "./archives.js";
import { freezeTournament } from "./freeze.js";

const parejasCsv = `id,categoria,zona,jugador_1,jugador_2
1A-1,Primera,A,Ana Prueba,Uno Ficticio
1A-2,Primera,A,Beto Prueba,Dos Ficticio`;

const players = [
  { id: "ana-prueba", nombreOficial: "Ana Prueba" },
  { id: "uno-ficticio", nombreOficial: "Uno Ficticio" },
  { id: "beto-prueba", nombreOficial: "Beto Prueba" },
  { id: "dos-ficticio", nombreOficial: "Dos Ficticio" },
  { id: "jose-maria-inventado", nombreOficial: "José María Inventado" },
  { id: "lucia-inventada", nombreOficial: "Lucía Inventada" },
];

const completedPartidosCsv = `id,fecha,hora,categoria,fase,zona,pareja_a,pareja_b,sets,nota
1,2026-09-01,20:00,Primera,grupo,A,1A-1,1A-2,12-8 12-9,
2,2026-09-02,20:00,Primera,final,,1A-1,1A-2,12-10 12-11,`;

const metadata = {
  slug: "prueba-2026",
  nombre: "Prueba",
  fecha: "Septiembre 2026",
  edition: "Prueba",
  hostClubName: "Regatas",
  clubId: "regatas",
  clubLogo: "/images/clubs/regatas.png",
} as const;

describe("freezeTournament", () => {
  it("creates a validated historical snapshot from completed CSV data", () => {
    const tournament = freezeTournament(
      {
        slug: "prueba-2026",
        nombre: "Prueba",
        fecha: "Septiembre 2026",
        edition: "Prueba",
        hostClubName: "Regatas",
        clubId: "regatas",
        clubLogo: "/images/clubs/regatas.png",
      },
      parejasCsv,
      completedPartidosCsv,
      players
    );

    expect(tournament.alcance).toBe("Fase de grupos y playoffs");
    expect(tournament.partidos).toHaveLength(2);
    expect(tournament).toMatchObject({
      edition: "Prueba",
      hostClubName: "Regatas",
      clubId: "regatas",
      clubLogo: "/images/clubs/regatas.png",
    });
  });

  it("accepts Club Social Maipú metadata", () => {
    const tournament = freezeTournament(
      {
        slug: "maipu-2026",
        nombre: "Torneo Club Social Maipú",
        fecha: "Septiembre 2026",
        edition: "Maipú 2026",
        hostClubName: "Club Social Maipú",
        clubId: "club-social-maipu",
        clubLogo: "/images/clubs/club-social-maipu.png",
      },
      parejasCsv,
      completedPartidosCsv,
      players
    );

    expect(tournament).toMatchObject({
      hostClubName: "Club Social Maipú",
      clubId: "club-social-maipu",
      clubLogo: "/images/clubs/club-social-maipu.png",
    });
  });

  it("refuses to freeze a tournament with pending matches", () => {
    const partidosCsv = `id,fecha,hora,categoria,fase,zona,pareja_a,pareja_b,sets,nota
1,2026-09-01,20:00,Primera,grupo,A,1A-1,1A-2,12-8 12-9,
2,2026-09-02,20:00,Primera,final,,1A-1,1A-2,,`;

    expect(() =>
      freezeTournament(
        {
          slug: "prueba-2026",
          nombre: "Prueba",
          fecha: "Septiembre 2026",
          edition: "Prueba",
          hostClubName: "Regatas",
          clubId: "regatas",
          clubLogo: "/images/clubs/regatas.png",
        },
        parejasCsv,
        partidosCsv,
        players
      )
    ).toThrow(/prueba-2026.*partido 2.*sin resultado/);
  });

  it("refuses to freeze a category without a final, naming tournament and category", () => {
    const partidosCsv = `id,fecha,hora,categoria,fase,zona,pareja_a,pareja_b,sets,nota
1,2026-09-01,20:00,Primera,grupo,A,1A-1,1A-2,12-8 12-9,`;

    expect(() =>
      freezeTournament(metadata, parejasCsv, partidosCsv, players)
    ).toThrow(/prueba-2026.*categoría Primera.*final/);
  });

  it("stores the registry ids of both members, matching names regardless of accents, case and spacing", () => {
    const csv = `id,categoria,zona,jugador_1,jugador_2
1A-1,Primera,A,  jose   maria INVENTADO ,Lucia Inventada
1A-2,Primera,A,Beto Prueba,Dos Ficticio`;

    const tournament = freezeTournament(
      metadata,
      csv,
      completedPartidosCsv,
      players
    );

    expect(tournament.parejas.map(pareja => pareja.jugadores)).toEqual([
      ["jose-maria-inventado", "lucia-inventada"],
      ["beto-prueba", "dos-ficticio"],
    ]);
  });

  it("refuses to freeze an unmatched name, naming the name, pair and sheet row", () => {
    const csv = `id,categoria,zona,jugador_1,jugador_2
1A-1,Primera,A,Ana Prueba,Uno Ficticio
1A-2,Primera,A,Carla Prueba,Dos Ficticio`;

    expect(() =>
      freezeTournament(metadata, csv, completedPartidosCsv, players)
    ).toThrow(/"Carla Prueba" \(pareja 1A-2, parejas fila 3\)/);
  });

  it("rejects an archive whose pairs reference unknown or missing player ids", () => {
    const tournament = freezeTournament(
      metadata,
      parejasCsv,
      completedPartidosCsv,
      players
    );
    const [first, second] = tournament.parejas;
    const tampered = {
      ...tournament,
      parejas: [
        { ...first, jugadores: ["ana-prueba", "nadie-inventado"] as const },
        { ...second, jugadores: undefined },
      ],
    };

    expect(() => validateArchive(tampered, { players })).toThrow(
      /prueba-2026.*pareja 1A-1.*nadie-inventado.*pareja 1A-2.*sin jugadores/
    );
    expect(() => validateArchive(tournament, { players })).not.toThrow();
  });

  it("refuses to freeze a player playing below their official category on the tournament date", () => {
    const withCategories = players.map(player =>
      player.id === "uno-ficticio"
        ? {
            ...player,
            categorias: [
              {
                desde: "2026-01-01",
                categoria: "Primera",
                origen: "federacion",
              },
            ] as const,
          }
        : player
    );
    const segundaParejas = parejasCsv.replaceAll("Primera", "Segunda");
    const segundaPartidos = completedPartidosCsv.replaceAll(
      "Primera",
      "Segunda"
    );

    expect(() =>
      freezeTournament(
        metadata,
        segundaParejas,
        segundaPartidos,
        withCategories
      )
    ).toThrow(
      /prueba-2026.*pareja 1A-1.*uno-ficticio.*Segunda.*categoría oficial Primera/
    );
    expect(() =>
      freezeTournament(
        metadata,
        parejasCsv,
        completedPartidosCsv,
        withCategories
      )
    ).not.toThrow();
  });

  it("accepts a player promoted after the tournament date", () => {
    const promotedLater = players.map(player =>
      player.id === "uno-ficticio"
        ? {
            ...player,
            categorias: [
              {
                desde: "2026-01-01",
                categoria: "Segunda",
                origen: "federacion",
              },
              { desde: "2026-09-10", categoria: "Primera", origen: "ascenso" },
            ] as const,
          }
        : player
    );
    const segunda = (csv: string) => csv.replaceAll("Primera", "Segunda");

    expect(() =>
      freezeTournament(
        metadata,
        segunda(parejasCsv),
        segunda(completedPartidosCsv),
        promotedLater
      )
    ).not.toThrow();
  });

  it("loads every registered archive, all of which pass the shared validation", () => {
    const archives = loadRegisteredArchives();

    expect(archives.map(archive => archive.slug).sort()).toEqual([
      "clausura-club-social-maipu-2026",
      "clausura-gimnasia-y-esgrima-2026",
      "clausura-regatas-2026",
      "clausura-villa-emilia-2026",
    ]);
  });
});
