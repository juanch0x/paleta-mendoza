import { clubs } from "./clubs";

export const activeTournamentConfig = {
  name: "Torneo Abierto · Villa Emilia",
  edition: "Abierto",
  hostClubName: "Villa Emilia",
  description: "Fixture, resultados y posiciones actualizadas.",
  clubId: "villa-emilia",
  clubLogo: clubs["villa-emilia"].logo,
} as const;
