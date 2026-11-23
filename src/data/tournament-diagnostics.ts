import {
  TOURNAMENT_REQUIRED_FIELDS,
  TOURNAMENT_SHEET_HEADERS,
  validateTournamentDataRow,
  validateTournamentStatusRow,
  type TournamentSheetName,
} from "./csv.js";
import { parseSets } from "../domain/parse-sets.js";
import { createPlayerMatcher } from "../domain/player-names.js";
import {
  categoryOn,
  positionIn,
  tournamentDate,
  type ArchivedTournament,
  type Player,
} from "../domain/player-stats.js";

export const DIAGNOSTIC_SHEETS = [
  "parejas",
  "partidos",
  "estado",
] as const satisfies readonly TournamentSheetName[];

type SheetName = (typeof DIAGNOSTIC_SHEETS)[number];
type CellValue = string | number | boolean | null | undefined;

export type SheetGrid = {
  name: SheetName;
  /** Rows are zero-indexed, matching the requested A1 range. */
  values: CellValue[][];
};

export type TournamentDiagnosticIssue = {
  sheet: SheetName;
  cell: string;
  rule: string;
  message: string;
};

export type TournamentDiagnostics = {
  valid: boolean;
  checkedAt: string;
  scannedRanges: Record<SheetName, string>;
  issues: TournamentDiagnosticIssue[];
  /** Non-blocking findings: they never make the sheet invalid. */
  warnings: TournamentDiagnosticIssue[];
};

/** Registry data the live sheet is compared against; omitted checks are skipped. */
export type TournamentDiagnosticsContext = {
  players?: readonly Player[];
};

export type GoogleSheetsFetch = typeof fetch;

const RANGE_END_COLUMN = "Z";
const RANGE_END_ROW = 1000;

type Headers = Map<string, number>;

export function diagnosticRanges(): Record<SheetName, string> {
  return Object.fromEntries(
    DIAGNOSTIC_SHEETS.map(sheet => [
      sheet,
      `${sheet}!A1:${RANGE_END_COLUMN}${RANGE_END_ROW}`,
    ])
  ) as Record<SheetName, string>;
}

/**
 * Reads a fixed physical range instead of a CSV export. This retains coordinates
 * for values such as partidos!M354 even when the row has no match id.
 */
export async function fetchTournamentSheetGrids(
  spreadsheetId: string,
  apiKey: string,
  fetcher: GoogleSheetsFetch = fetch
): Promise<SheetGrid[]> {
  if (!spreadsheetId || !apiKey)
    throw new Error("Google Sheets no está configurado");

  const ranges = diagnosticRanges();
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet`
  );
  for (const range of Object.values(ranges))
    url.searchParams.append("ranges", range);
  url.searchParams.set("majorDimension", "ROWS");
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");
  url.searchParams.set("key", apiKey);

  let response: Response;
  try {
    response = await fetcher(url);
  } catch {
    throw new Error("No se pudo consultar Google Sheets");
  }

  if (!response.ok)
    throw new Error(`Google Sheets respondió ${response.status}`);

  const body = (await response.json()) as {
    valueRanges?: Array<{ range?: string; values?: CellValue[][] }>;
  };
  return DIAGNOSTIC_SHEETS.map((name, index) => ({
    name,
    // Google preserves the requested range order. Relying on its echoed range
    // string would be brittle because it may add or remove sheet-name quotes.
    values: body.valueRanges?.[index]?.values ?? [],
  }));
}

export function diagnoseTournamentSheets(
  grids: readonly SheetGrid[],
  checkedAt = new Date().toISOString(),
  context: TournamentDiagnosticsContext = {}
): TournamentDiagnostics {
  const issues: TournamentDiagnosticIssue[] = [];
  const warnings: TournamentDiagnosticIssue[] = [];
  const gridByName = new Map(grids.map(grid => [grid.name, grid]));
  const headersBySheet = new Map<SheetName, Headers>();

  for (const sheet of DIAGNOSTIC_SHEETS) {
    const grid = gridByName.get(sheet) ?? { name: sheet, values: [] };
    headersBySheet.set(sheet, readHeaders(grid, issues));
  }

  validateDataSheet(
    gridByName.get("parejas"),
    headersBySheet.get("parejas")!,
    issues
  );
  validateDataSheet(
    gridByName.get("partidos"),
    headersBySheet.get("partidos")!,
    issues
  );
  validateStatus(
    gridByName.get("estado"),
    headersBySheet.get("estado")!,
    issues
  );

  if (context.players) {
    warnUnknownPlayers(
      gridByName.get("parejas"),
      headersBySheet.get("parejas")!,
      context.players,
      warnings
    );
  }

  return {
    valid: issues.length === 0,
    checkedAt,
    scannedRanges: diagnosticRanges(),
    issues,
    warnings,
  };
}

/**
 * The live tournament keeps working with unregistered names; they are only
 * surfaced so the organizer can fix them before the freeze step rejects them.
 */
function warnUnknownPlayers(
  grid: SheetGrid | undefined,
  headers: Headers,
  players: readonly Player[],
  warnings: TournamentDiagnosticIssue[]
) {
  if (!grid) return;
  const match = createPlayerMatcher(players);

  forEachPhysicalDataRow(grid, (row, values) => {
    const parejaId = valueAt(values, headers, "id");
    if (!parejaId) return;
    for (const field of ["jugador_1", "jugador_2"]) {
      const nombre = valueAt(values, headers, field);
      if (!nombre || match(nombre)) continue;
      addIssue(
        warnings,
        "parejas",
        row,
        columnFor("parejas", field, headers),
        "unknown-player",
        `"${nombre}" (pareja ${parejaId}) no está en el registro de jugadores.`
      );
    }
  });
}

function readHeaders(
  grid: SheetGrid,
  issues: TournamentDiagnosticIssue[]
): Headers {
  const headers = new Map<string, number>();
  const firstRow = grid.values[0] ?? [];

  firstRow.forEach((value, index) => {
    const header = text(value);
    if (!header) return;
    if (headers.has(header)) {
      addIssue(
        issues,
        grid.name,
        1,
        index,
        "duplicate-header",
        `La columna "${header}" está repetida.`
      );
      return;
    }
    headers.set(header, index);
  });

  return headers;
}

function validateDataSheet(
  grid: SheetGrid | undefined,
  headers: Headers,
  issues: TournamentDiagnosticIssue[]
) {
  if (!grid) return;
  const idColumn = headers.get("id");

  forEachPhysicalDataRow(grid, (row, values) => {
    const id = idColumn === undefined ? "" : text(values[idColumn]);
    if (!id) {
      reportOrphanValues(grid.name, row, values, issues);
      return;
    }

    const sheet = grid.name as "parejas" | "partidos";
    const record = toContractRecord(sheet, values, headers);
    for (const issue of validateTournamentDataRow(sheet, record)) {
      addIssue(
        issues,
        sheet,
        row,
        columnFor(sheet, issue.field, headers),
        diagnosticRule(sheet, issue.field),
        issue.message
      );
    }

    // Score semantics are already used by the runtime parser. Keep the error
    // accumulated here so an operator sees every bad cell in one pass.
    if (sheet === "partidos" && record.sets) {
      try {
        parseSets(record.sets);
      } catch (error) {
        addIssue(
          issues,
          sheet,
          row,
          columnFor(sheet, "sets", headers),
          "invalid-sets",
          error instanceof Error ? error.message : "Marcador inválido."
        );
      }
    }

    reportValuesOutsideHeaders(grid.name, row, values, headers, issues);
  });

  validateDuplicateIds(grid, headers, issues);
}

function validateDuplicateIds(
  grid: SheetGrid,
  headers: Headers,
  issues: TournamentDiagnosticIssue[]
) {
  const idColumn = headers.get("id");
  if (idColumn === undefined) return;

  const ids = new Map<string, number>();
  forEachPhysicalDataRow(grid, (row, values) => {
    const id = text(values[idColumn]);
    if (!id) return;
    const firstRow = ids.get(id);
    if (firstRow !== undefined) {
      addIssue(
        issues,
        grid.name,
        row,
        idColumn,
        "duplicate-id",
        `El id "${id}" ya aparece en la fila ${firstRow}.`
      );
      return;
    }
    ids.set(id, row);
  });
}

function validateStatus(
  grid: SheetGrid | undefined,
  headers: Headers,
  issues: TournamentDiagnosticIssue[]
) {
  if (!grid) return;
  const statusRows: number[] = [];

  forEachPhysicalDataRow(grid, (row, values) => {
    const extraValues = values.some(
      (value, index) =>
        hasValue(value) && ![...headers.values()].includes(index)
    );
    if (extraValues)
      reportValuesOutsideHeaders(grid.name, row, values, headers, issues);

    const record = toContractRecord("estado", values, headers);
    for (const issue of validateTournamentStatusRow(record)) {
      addIssue(
        issues,
        grid.name,
        row,
        columnFor("estado", issue.field, headers),
        "invalid-delay",
        issue.message
      );
    }
    statusRows.push(row);
  });

  if (statusRows.length > 1) {
    addIssue(
      issues,
      grid.name,
      statusRows[1],
      columnFor("estado", "demora_minutos", headers),
      "multiple-status-rows",
      "estado debe tener una sola fila con datos."
    );
  }
}

function toContractRecord(
  sheet: SheetName,
  values: CellValue[],
  headers: Headers
): Record<string, string> {
  return Object.fromEntries(
    TOURNAMENT_SHEET_HEADERS[sheet].map(field => [
      field,
      valueAt(values, headers, field),
    ])
  );
}

function diagnosticRule(sheet: "parejas" | "partidos", field: string): string {
  if (TOURNAMENT_REQUIRED_FIELDS[sheet].includes(field as never))
    return "required-value";
  if (field === "fecha") return "invalid-date";
  if (field === "hora") return "invalid-time";
  return "invalid-value";
}

function columnFor(sheet: SheetName, field: string, headers: Headers): number {
  return (
    headers.get(field) ??
    TOURNAMENT_SHEET_HEADERS[sheet].indexOf(field as never)
  );
}

function forEachPhysicalDataRow(
  grid: SheetGrid,
  callback: (row: number, values: CellValue[]) => void
) {
  for (let index = 1; index < grid.values.length; index += 1) {
    const values = grid.values[index] ?? [];
    if (!values.some(hasValue)) continue;
    callback(index + 1, values);
  }
}

/**
 * This is intentionally diagnostic-only. CSV parsing cannot retain a physical
 * coordinate for a stray value beyond the table, but Sheets can report M354.
 */
function reportOrphanValues(
  sheet: SheetName,
  row: number,
  values: CellValue[],
  issues: TournamentDiagnosticIssue[]
) {
  values.forEach((value, column) => {
    if (hasValue(value)) {
      addIssue(
        issues,
        sheet,
        row,
        column,
        "orphan-data",
        "Hay un valor en una fila sin id; probablemente es un dato sobrante."
      );
    }
  });
}

function reportValuesOutsideHeaders(
  sheet: SheetName,
  row: number,
  values: CellValue[],
  headers: Headers,
  issues: TournamentDiagnosticIssue[]
) {
  const headerColumns = new Set(headers.values());
  values.forEach((value, column) => {
    if (hasValue(value) && !headerColumns.has(column)) {
      addIssue(
        issues,
        sheet,
        row,
        column,
        "orphan-data",
        "Hay un valor fuera de las columnas de la tabla; probablemente es un dato sobrante."
      );
    }
  });
}

function valueAt(
  values: CellValue[],
  headers: Headers,
  header: string
): string {
  const index = headers.get(header);
  return index === undefined ? "" : text(values[index]);
}

function text(value: CellValue): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function hasValue(value: CellValue) {
  return text(value) !== "";
}

function addIssue(
  issues: TournamentDiagnosticIssue[],
  sheet: SheetName,
  row: number,
  column: number,
  rule: string,
  message: string
) {
  issues.push({
    sheet,
    cell: `${columnToLetter(column + 1)}${row}`,
    rule,
    message,
  });
}

function columnToLetter(column: number): string {
  let result = "";
  let current = column;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Player registry: pending official data (ticket 07)
// ---------------------------------------------------------------------------

export type PlayerMissingOfficialData = {
  id: string;
  nombreOficial: string;
  faltaCategoria: boolean;
  faltaPosicion: boolean;
};

/**
 * Players with no official category in effect on `fecha` (ISO date) or no
 * position for its year, in registry order. Non-blocking: these players
 * still have a profile.
 */
export function diagnosePlayerRegistry(
  players: readonly Player[],
  fecha: string
): PlayerMissingOfficialData[] {
  const anio = Number(fecha.slice(0, 4));
  return players.flatMap(player => {
    const faltaCategoria = !categoryOn(player, fecha);
    const faltaPosicion = !positionIn(player, anio);
    if (!faltaCategoria && !faltaPosicion) return [];
    return [
      {
        id: player.id,
        nombreOficial: player.nombreOficial,
        faltaCategoria,
        faltaPosicion,
      },
    ];
  });
}

// ---------------------------------------------------------------------------
// Likely unrecorded promotions (ticket 11)
// ---------------------------------------------------------------------------

const TITLES_FOR_PROMOTION = 3;

export type LikelyPromotion = {
  id: string;
  nombreOficial: string;
  categoria: string;
  /** The consecutive tournaments the player won, oldest first. */
  torneos: { slug: string; nombre: string }[];
};

/**
 * Players who won three consecutive archived tournaments of a category with
 * no promotion (`origen: "ascenso"`) recorded on or after the last of those
 * tournaments. Consecutive means consecutive among the archived tournaments
 * that decided that category's final, ordered by their earliest match date
 * (ties broken by slug). Results are in registry order, then category, then
 * chronological order. Non-blocking: the organizer records the promotion by
 * hand.
 */
export function diagnoseLikelyPromotions(
  players: readonly Player[],
  tournaments: readonly ArchivedTournament[]
): LikelyPromotion[] {
  const chronological = tournaments
    .map(tournament => ({ tournament, date: tournamentDate(tournament) }))
    .sort(
      (a, b) =>
        compareOptionalDates(a.date, b.date) ||
        compareOptionalDates(a.tournament.slug, b.tournament.slug)
    );

  const finalsByCategory = new Map<string, CategoryFinal[]>();
  for (const { tournament, date } of chronological) {
    for (const final of decidedFinals(tournament)) {
      const list = finalsByCategory.get(final.categoria) ?? [];
      list.push({ ...final, tournament, date });
      finalsByCategory.set(final.categoria, list);
    }
  }
  const categories = [...finalsByCategory.keys()].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  return players.flatMap(player =>
    categories.flatMap(categoria => {
      const found: LikelyPromotion[] = [];
      let streak: CategoryFinal[] = [];
      for (const final of finalsByCategory.get(categoria) ?? []) {
        if (!final.campeones.includes(player.id)) {
          streak = [];
          continue;
        }
        streak.push(final);
        if (streak.length < TITLES_FOR_PROMOTION) continue;
        if (!hasPromotionSince(player, final.date)) {
          found.push({
            id: player.id,
            nombreOficial: player.nombreOficial,
            categoria,
            torneos: streak.map(({ tournament }) => ({
              slug: tournament.slug,
              nombre: tournament.nombre,
            })),
          });
        }
        streak = [];
      }
      return found;
    })
  );
}

type CategoryFinal = {
  categoria: string;
  campeones: readonly string[];
  tournament: ArchivedTournament;
  date: string | undefined;
};

/** The champions of each category whose final was decided, one per category. */
function decidedFinals(
  tournament: ArchivedTournament
): Pick<CategoryFinal, "categoria" | "campeones">[] {
  const parejas = new Map(tournament.parejas.map(p => [p.id, p]));
  const finals = new Map<string, readonly string[]>();
  for (const partido of tournament.partidos) {
    if (partido.fase !== "final" || finals.has(partido.categoria)) continue;
    if (partido.a.tipo !== "pareja" || partido.b.tipo !== "pareja") continue;
    const setsA = partido.sets.filter(([a, b]) => a > b).length;
    const setsB = partido.sets.length - setsA;
    if (setsA === setsB) continue;
    const winner = setsA > setsB ? partido.a.pareja : partido.b.pareja;
    finals.set(partido.categoria, parejas.get(winner.id)?.jugadores ?? []);
  }
  return [...finals].map(([categoria, campeones]) => ({
    categoria,
    campeones,
  }));
}

function hasPromotionSince(player: Player, date: string | undefined) {
  return (player.categorias ?? []).some(
    entry => entry.origen === "ascenso" && (!date || entry.desde >= date)
  );
}

/** Code-unit order (locale-independent); undefined sorts last. */
function compareOptionalDates(a: string | undefined, b: string | undefined) {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a < b ? -1 : 1;
}
