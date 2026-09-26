type TournamentEnvironment = {
  PUBLIC_TOURNAMENT_ACTIVE?: string;
  PUBLIC_ACTIVE_TOURNAMENT_PAREJAS_CSV_URL?: string;
  PUBLIC_ACTIVE_TOURNAMENT_PARTIDOS_CSV_URL?: string;
};

const configuredEnvironment = (): TournamentEnvironment => ({
  PUBLIC_TOURNAMENT_ACTIVE: import.meta.env.PUBLIC_TOURNAMENT_ACTIVE,
  PUBLIC_ACTIVE_TOURNAMENT_PAREJAS_CSV_URL: import.meta.env
    .PUBLIC_ACTIVE_TOURNAMENT_PAREJAS_CSV_URL,
  PUBLIC_ACTIVE_TOURNAMENT_PARTIDOS_CSV_URL: import.meta.env
    .PUBLIC_ACTIVE_TOURNAMENT_PARTIDOS_CSV_URL,
});

export function hasActiveTournament(
  environment: TournamentEnvironment = configuredEnvironment()
): boolean {
  if (environment.PUBLIC_TOURNAMENT_ACTIVE !== "true") return false;

  if (
    !environment.PUBLIC_ACTIVE_TOURNAMENT_PAREJAS_CSV_URL ||
    !environment.PUBLIC_ACTIVE_TOURNAMENT_PARTIDOS_CSV_URL
  ) {
    throw new Error(
      "PUBLIC_TOURNAMENT_ACTIVE=true requiere las URLs CSV de parejas y partidos."
    );
  }

  return true;
}
