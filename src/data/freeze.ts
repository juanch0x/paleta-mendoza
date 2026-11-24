import { z } from "zod";

import { validateArchive } from "./archive-validation.js";
import type { ClubId } from "./clubs.js";
import { construirPartidos } from "../domain/resolver.js";
import { createPlayerMatcher } from "../domain/player-names.js";
import type { ArchivedPareja } from "../domain/archived-tournament.js";
import type { Player } from "../domain/player.js";
import type { Pareja, PartidoResuelto } from "../domain/types.js";
import {
  parseParejaMembersCsv,
  parseParejasCsv,
  parsePartidosCsv,
} from "./csv.js";

export type TournamentMetadata = {
  slug: string;
  nombre: string;
  fecha: string;
  edition: string;
  hostClubName: string;
  clubId: ClubId;
  clubLogo: string;
};

export type FrozenTournament = TournamentMetadata & {
  alcance: string;
  parejas: ArchivedPareja[];
  partidos: PartidoResuelto[];
};

const frozenTournamentSchema = z.object({
  slug: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
  fecha: z.string().trim().min(1),
  edition: z.string().trim().min(1),
  hostClubName: z.string().trim().min(1),
  clubId: z.enum([
    "gimnasia-y-esgrima",
    "regatas",
    "club-social-maipu",
    "villa-emilia",
  ]),
  clubLogo: z.string().trim().min(1),
  alcance: z.string().trim().min(1),
  parejas: z.array(
    z.object({
      id: z.string(),
      categoria: z.string(),
      zona: z.string().optional(),
      nombre: z.string(),
      jugadores: z.tuple([z.string().min(1), z.string().min(1)]),
    })
  ),
  partidos: z.array(
    z.object({
      id: z.string(),
      categoria: z.string(),
      fase: z.string(),
      zona: z.string().optional(),
      fecha: z.string().optional(),
      hora: z.string().optional(),
      nota: z.string().optional(),
      sets: z.array(z.tuple([z.number(), z.number()])),
      a: z.discriminatedUnion("tipo", [
        z.object({
          tipo: z.literal("pareja"),
          pareja: z.object({
            id: z.string(),
            categoria: z.string(),
            zona: z.string().optional(),
            nombre: z.string(),
          }),
        }),
        z.object({ tipo: z.literal("label"), label: z.string() }),
      ]),
      b: z.discriminatedUnion("tipo", [
        z.object({
          tipo: z.literal("pareja"),
          pareja: z.object({
            id: z.string(),
            categoria: z.string(),
            zona: z.string().optional(),
            nombre: z.string(),
          }),
        }),
        z.object({ tipo: z.literal("label"), label: z.string() }),
      ]),
    })
  ),
});

export function freezeTournament(
  metadata: TournamentMetadata,
  parejasCsv: string,
  partidosCsv: string,
  players: readonly Player[]
): FrozenTournament {
  const parejas = withPlayerIds(
    parseParejasCsv(parejasCsv),
    parejasCsv,
    players
  );
  const partidos = construirPartidos(
    parsePartidosCsv(partidosCsv),
    new Map(parejas.map(pareja => [pareja.id, pareja]))
  );

  validateArchive({ ...metadata, parejas, partidos }, { players });

  const unresolved = partidos.filter(
    partido => partido.a.tipo !== "pareja" || partido.b.tipo !== "pareja"
  );
  if (unresolved.length > 0) {
    throw new Error(
      `No se puede congelar: quedan referencias sin resolver (${unresolved.map(partido => partido.id).join(", ")}).`
    );
  }

  const alcance = partidos.some(partido => partido.fase !== "grupo")
    ? "Fase de grupos y playoffs"
    : "Fase de grupos";

  return frozenTournamentSchema.parse({
    ...metadata,
    alcance,
    parejas,
    partidos,
  }) as FrozenTournament;
}

/**
 * Resolves both sheet names of every pair to registry ids. Fails listing every
 * unmatched name with its pair and sheet row, so it can be fixed at the source.
 */
function withPlayerIds(
  parejas: readonly Pareja[],
  parejasCsv: string,
  players: readonly Player[]
): ArchivedPareja[] {
  const match = createPlayerMatcher(players);
  const members = new Map(
    parseParejaMembersCsv(parejasCsv).map(row => [row.parejaId, row])
  );
  const unmatched: string[] = [];

  const resolved = parejas.map(pareja => {
    const row = members.get(pareja.id)!;
    const [first, second] = row.nombres.map(nombre => {
      const player = match(nombre);
      if (!player)
        unmatched.push(
          `"${nombre}" (pareja ${pareja.id}, parejas fila ${row.fila})`
        );
      return player?.id ?? "";
    });
    return { ...pareja, jugadores: [first, second] as const };
  });

  if (unmatched.length > 0) {
    throw new Error(
      `No se puede congelar: jugadores que no están en el registro: ${unmatched.join("; ")}.`
    );
  }
  return resolved;
}
