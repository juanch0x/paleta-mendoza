import { clubs } from "./clubs";

export const activeTournamentConfig = {
  name: "Clausura · Gimnasia y Esgrima",
  edition: "Clausura",
  hostClubName: "Gimnasia y Esgrima",
  description: "Fixture, resultados y posiciones actualizadas.",
  clubId: "gimnasia-y-esgrima",
  clubLogo: clubs["gimnasia-y-esgrima"].logo,
} as const;
