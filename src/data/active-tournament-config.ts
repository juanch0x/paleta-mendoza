import { clubs } from "./clubs";

export const activeTournamentConfig = {
  name: "Clausura · Club Social Maipú",
  edition: "Clausura",
  hostClubName: "Club Social Maipú",
  description: "Fixture, resultados y posiciones actualizadas.",
  clubId: "club-social-maipu",
  clubLogo: clubs["club-social-maipu"].logo,
} as const;
