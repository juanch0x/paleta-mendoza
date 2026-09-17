import {
  diagnoseTournamentSheets,
  fetchTournamentSheetGrids,
} from "../../src/data/tournament-diagnostics";

type Env = {
  GOOGLE_SHEETS_API_KEY?: string;
  GOOGLE_SHEETS_SPREADSHEET_ID?: string;
  TOURNAMENT_DIAGNOSTICS_TOKEN?: string;
};

type Context = {
  env: Env;
  request: Request;
};

export const onRequestGet = async ({ env, request }: Context): Promise<Response> => {
  const token = env.TOURNAMENT_DIAGNOSTICS_TOKEN;
  const authorization = request.headers.get("Authorization");

  // Fail closed: Pages production must explicitly configure an operator token.
  // The browser submits it in an Authorization header, never in the URL.
  if (!token || authorization !== `Bearer ${token}`) {
    return new Response("Not found", { status: 404 });
  }

  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = env.GOOGLE_SHEETS_API_KEY;

  // Do not fall back to an embedded spreadsheet id: deployment configuration is
  // the sole source of truth, and a missing value must fail safely.
  if (!spreadsheetId || !apiKey) {
    return Response.json(
      { error: "El diagnóstico del torneo no está configurado." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const grids = await fetchTournamentSheetGrids(spreadsheetId, apiKey);
    return Response.json(diagnoseTournamentSheets(grids), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "No se pudo ejecutar el diagnóstico del torneo." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
};
