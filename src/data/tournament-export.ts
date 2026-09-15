import type { PartidoResuelto } from "../domain/types.js";

export const MAX_EXPORT_DAYS = 6;

export type ExportDay = {
  date: string;
  results: PartidoResuelto[];
  scheduled: PartidoResuelto[];
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const isIsoDate = (value: string) => {
  if (!datePattern.test(value)) return false;

  const date = new Date(`${value}T12:00:00`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

const differenceInDays = (from: string, to: string) =>
  Math.round(
    (new Date(`${to}T12:00:00`).getTime() -
      new Date(`${from}T12:00:00`).getTime()) /
      86_400_000
  );

export const isExportRangeValid = (from: string, to: string) =>
  isIsoDate(from) &&
  isIsoDate(to) &&
  differenceInDays(from, to) >= 0 &&
  differenceInDays(from, to) < MAX_EXPORT_DAYS;

const isVisible = (partido: PartidoResuelto) =>
  Boolean(partido.fecha) || partido.sets.length > 0;

const sortMatches = (a: PartidoResuelto, b: PartidoResuelto) =>
  (a.hora ?? "23:59").localeCompare(b.hora ?? "23:59");

export function groupMatchesForExport(
  partidos: PartidoResuelto[],
  from: string,
  to: string
): ExportDay[] {
  if (!isExportRangeValid(from, to)) return [];

  const dates = new Map<string, ExportDay>();
  for (const partido of partidos) {
    if (
      !isVisible(partido) ||
      !partido.fecha ||
      partido.fecha < from ||
      partido.fecha > to
    )
      continue;

    const day = dates.get(partido.fecha) ?? {
      date: partido.fecha,
      results: [],
      scheduled: [],
    };
    if (partido.sets.length > 0) day.results.push(partido);
    else day.scheduled.push(partido);
    dates.set(partido.fecha, day);
  }

  return [...dates.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(day => ({
      ...day,
      results: day.results.sort(sortMatches),
      scheduled: day.scheduled.sort(sortMatches),
    }));
}
