import { describe, expect, it } from "vitest";

import { loadRegisteredArchives } from "./archives.js";
import { freezeTournament } from "./freeze.js";

const parejasCsv = `id,categoria,zona,jugador_1,jugador_2
1A-1,Primera,A,Ana,Uno
1A-2,Primera,A,Beto,Dos`;

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
      completedPartidosCsv
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
      completedPartidosCsv
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
        partidosCsv
      )
    ).toThrow(/prueba-2026.*partido 2.*sin resultado/);
  });

  it("refuses to freeze a category without a final, naming tournament and category", () => {
    const partidosCsv = `id,fecha,hora,categoria,fase,zona,pareja_a,pareja_b,sets,nota
1,2026-09-01,20:00,Primera,grupo,A,1A-1,1A-2,12-8 12-9,`;

    expect(() => freezeTournament(metadata, parejasCsv, partidosCsv)).toThrow(
      /prueba-2026.*categoría Primera.*final/
    );
  });

  it("loads every registered archive, all of which pass the shared validation", () => {
    const archives = loadRegisteredArchives();

    expect(archives.map(archive => archive.slug).sort()).toEqual([
      "clausura-club-social-maipu-2026",
      "clausura-gimnasia-y-esgrima-2026",
      "clausura-regatas-2026",
    ]);
  });
});
