import type { ClubId } from "../clubs.js";
import type { ArchivedTournament } from "../../domain/archived-tournament.js";
import type { Player } from "../../domain/player.js";

/** A frozen tournament as stored in the archive, with its display metadata. */
export type ArchiveRecord = ArchivedTournament & {
  fecha: string;
  edition: string;
  hostClubName: string;
  clubId: ClubId;
  alcance: string;
};

export interface PlayerRepository {
  list(): Promise<Player[]>;
}

/** Only finished tournaments listed in the archive registry; never the active one. */
export interface ArchivedTournamentRepository {
  list(): Promise<ArchiveRecord[]>;
}
