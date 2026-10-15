import calendar from "./2026.json";

export const mundial = calendar;
export type MundialEvent = (typeof calendar.events)[number];
export type AgendaSelection = {
  date: string;
  modality: string;
  argentinaOnly: boolean;
};

export const dates = [
  ...new Set(calendar.events.map(event => event.date)),
].sort();
export const modalities = [
  ...new Set(
    calendar.events.flatMap(event => (event.modality ? [event.modality] : []))
  ),
].sort((a, b) => a.localeCompare(b, "es"));
export const courtLabels: Record<string, string> = {
  "fronton-30m": "Frontón 30 m",
  "fronton-36m": "Frontón 36 m",
  "fronton-54m": "Frontón 54 m",
  trinquete: "Trinquete",
  frontball: "Frontball",
};

export function localDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: calendar.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map(type => parts.find(part => part.type === type)!.value)
    .join("-");
}

export function defaultDate(now: Date): string {
  const today = localDate(now);
  return today < calendar.startDate
    ? calendar.startDate
    : today > calendar.endDate
      ? calendar.endDate
      : today;
}

export function readSelection(search: string, now: Date): AgendaSelection {
  const params = new URLSearchParams(search);
  const date = params.get("fecha") ?? "";
  const modality = params.get("modalidad") ?? "";
  return {
    date: dates.includes(date) ? date : defaultDate(now),
    modality: modalities.includes(modality) ? modality : "",
    argentinaOnly: params.get("argentina") === "1",
  };
}

export function selectionUrl(url: URL, selection: AgendaSelection): string {
  const params = new URLSearchParams(url.search);
  params.set("fecha", selection.date);
  if (selection.modality) params.set("modalidad", selection.modality);
  else params.delete("modalidad");
  if (selection.argentinaOnly) params.set("argentina", "1");
  else params.delete("argentina");
  return `${url.pathname}?${params}${url.hash}`;
}

export function precedingCeremony(
  event: MundialEvent
): MundialEvent | undefined {
  if (!event.startNote || event.startTime) return;
  return calendar.events
    .filter(
      candidate =>
        candidate.date === event.date &&
        candidate.sourceBand === event.sourceBand &&
        candidate.kind === "ceremony" &&
        candidate.sourceOrder < event.sourceOrder
    )
    .sort((a, b) => b.sourceOrder - a.sourceOrder)[0];
}

export function isArgentinaEvent(event: MundialEvent): boolean {
  return (
    event.participantA === "Argentina" || event.participantB === "Argentina"
  );
}

export function argentinaCount(selection: AgendaSelection): number {
  return dailyEvents({ ...selection, argentinaOnly: false }).filter(
    isArgentinaEvent
  ).length;
}

export type DayShortcut = {
  label: "Ayer" | "Hoy" | "Mañana";
  date: string | null;
};

export function dayNavigation(selected: string, today: string) {
  const inRange = (date: string) => (dates.includes(date) ? date : null);
  const clampedToday =
    today < calendar.startDate
      ? calendar.startDate
      : today > calendar.endDate
        ? calendar.endDate
        : today;
  const shortcuts: DayShortcut[] = [
    { label: "Ayer", date: inRange(addDays(today, -1)) },
    { label: "Hoy", date: clampedToday },
    { label: "Mañana", date: inRange(addDays(today, 1)) },
  ];
  return {
    previous: dates.filter(date => date < selected).pop() ?? null,
    next: dates.find(date => date > selected) ?? null,
    shortcuts,
  };
}

function addDays(date: string, days: number): string {
  const ONE_DAY_MS = 86_400_000;
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * ONE_DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function dailyEvents(selection: AgendaSelection): MundialEvent[] {
  const anchorTime = (event: MundialEvent) =>
    event.startTime ?? precedingCeremony(event)?.startTime ?? "99:99";
  return calendar.events
    .filter(
      event =>
        event.date === selection.date &&
        (!selection.modality || event.modality === selection.modality) &&
        (!selection.argentinaOnly || isArgentinaEvent(event))
    )
    .sort(
      (a, b) =>
        anchorTime(a).localeCompare(anchorTime(b)) ||
        a.sourceBand.localeCompare(b.sourceBand) ||
        a.sourceOrder - b.sourceOrder
    );
}

export function formatDate(date: string, short = false): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: short ? "short" : "long",
    day: "numeric",
    month: short ? "short" : "long",
  }).format(new Date(`${date}T12:00:00Z`));
}
