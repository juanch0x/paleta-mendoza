import { useEffect, useMemo, useState } from "react";

import {
  loadActiveTournament,
  type ActiveTournament,
} from "@/data/active-tournament";
import { mockActiveTournament } from "@/data/mock-active-tournament";
import type { Participante, PartidoResuelto } from "@/domain/types";

type Props = { parejasUrl?: string; partidosUrl?: string; showMock?: boolean };

type TournamentState =
  | { status: "missing-source" }
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      tournament: ActiveTournament;
      updatedAt: Date;
      source: "live" | "mock";
    };

const DATE_SHORTCUTS = [
  [-1, "Ayer"],
  [0, "Hoy"],
  [1, "Mañana"],
  [2, "Pasado mañana"],
] as const;

const PHASE_LABELS: Record<string, string> = {
  grupo: "Fase de grupos",
  repechaje: "Repechaje",
  octavos: "Octavos de final",
  cuartos: "Cuartos de final",
  semi: "Semifinales",
  final: "Final",
};

const visible = (partido: PartidoResuelto) =>
  Boolean(partido.fecha) || partido.sets.length > 0;
const participantName = (participante: Participante) =>
  participante.tipo === "pareja"
    ? participante.pareja.nombre
    : participante.label;
const scoreFor = (partido: PartidoResuelto, side: 0 | 1) =>
  partido.sets.map(set => set[side]).join(" · ");

const localDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Mendoza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return [value("year"), value("month"), value("day")].join("-");
};

const shiftDate = (date: string, days: number) => {
  const next = new Date(date + "T12:00:00");
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Mendoza",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(date + "T12:00:00"));
const formatUpdatedAt = (date: Date) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

function AgendaMatchCard({ partido }: { partido: PartidoResuelto }) {
  const hasScore = partido.sets.length > 0;
  const phase =
    partido.fase === "grupo"
      ? "Zona " + (partido.zona ?? "única")
      : (PHASE_LABELS[partido.fase] ?? partido.fase);

  return (
    <article className="border-border bg-background rounded-xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-accent text-xs font-semibold tracking-wide uppercase">
            {partido.categoria}
          </p>
          <p className="text-foreground/70 mt-1 text-sm">{phase}</p>
        </div>
        <span
          className={
            hasScore
              ? "bg-accent/15 text-accent rounded-full px-2.5 py-1 text-xs font-semibold"
              : "bg-muted rounded-full px-2.5 py-1 text-xs font-semibold"
          }
        >
          {hasScore ? "Finalizado" : (partido.hora ?? "A confirmar")}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 text-sm sm:text-base">
        <span className="min-w-0 font-medium">
          {participantName(partido.a)}
        </span>
        <span className="text-right tabular-nums">
          {scoreFor(partido, 0) || "—"}
        </span>
        <span className="min-w-0 font-medium">
          {participantName(partido.b)}
        </span>
        <span className="text-right tabular-nums">
          {scoreFor(partido, 1) || "—"}
        </span>
      </div>
      {partido.nota && (
        <p className="border-border text-foreground/70 mt-4 border-t pt-3 text-sm">
          {partido.nota}
        </p>
      )}
    </article>
  );
}

export default function TournamentAgenda({
  parejasUrl,
  partidosUrl,
  showMock = false,
}: Props) {
  const today = useMemo(() => localDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [state, setState] = useState<TournamentState>(() => {
    if (parejasUrl && partidosUrl) return { status: "loading" };
    if (showMock)
      return {
        status: "ready",
        tournament: mockActiveTournament,
        updatedAt: new Date(),
        source: "mock",
      };
    return { status: "missing-source" };
  });

  useEffect(() => {
    if (!parejasUrl || !partidosUrl) return;
    let cancelled = false;
    loadActiveTournament({ parejasUrl, partidosUrl })
      .then(tournament => {
        if (!cancelled)
          setState({
            status: "ready",
            tournament,
            updatedAt: new Date(),
            source: "live",
          });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [parejasUrl, partidosUrl]);

  const matches = useMemo(
    () =>
      state.status !== "ready"
        ? []
        : state.tournament.partidos
            .filter(visible)
            .filter(partido => partido.fecha === selectedDate)
            .sort((a, b) =>
              (a.hora ?? "23:59").localeCompare(b.hora ?? "23:59")
            ),
    [selectedDate, state]
  );

  if (state.status === "missing-source")
    return (
      <p className="border-border rounded-lg border border-dashed p-5">
        El torneo activo todavía no está configurado.
      </p>
    );
  if (state.status === "loading")
    return (
      <p className="border-border rounded-lg border p-5">Cargando agenda…</p>
    );
  if (state.status === "error")
    return (
      <p className="border-border rounded-lg border p-5">
        No pudimos cargar la agenda. Probá de nuevo en unos minutos.
      </p>
    );

  return (
    <>
      <nav
        className="border-border mt-8 flex items-center gap-5 border-b pb-3 text-sm"
        aria-label="Vista del torneo"
      >
        <a
          href="/torneo/"
          className="text-foreground/65 hover:text-foreground transition"
        >
          Vista general
        </a>
        <span className="border-accent text-accent -mb-3 border-b-2 pb-3 font-semibold">
          Agenda por día
        </span>
      </nav>
      <section
        className="border-border bg-muted/25 mt-8 rounded-2xl border p-5 sm:p-6"
        aria-labelledby="agenda-title"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase">
              Torneo activo
            </p>
            <h2
              id="agenda-title"
              className="mt-2 text-2xl font-bold sm:text-3xl"
            >
              Agenda por día
            </h2>
          </div>
          <p className="text-foreground/70 text-sm">
            Actualizado: {formatUpdatedAt(state.updatedAt)}
          </p>
        </div>
        {state.source === "mock" && (
          <p className="border-accent bg-background mt-5 rounded-xl border border-dashed p-4 text-sm">
            Vista de demostración: estos resultados no corresponden a un torneo
            real.
          </p>
        )}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {DATE_SHORTCUTS.map(([offset, label]) => {
            const date = shiftDate(today, offset);
            const selected = date === selectedDate;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={
                  selected
                    ? "bg-accent text-background shrink-0 rounded-full px-4 py-2 text-sm font-semibold"
                    : "border-border bg-background hover:border-accent shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition"
                }
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="border-border mt-6 flex items-center justify-between gap-4 border-y py-4">
          <button
            type="button"
            onClick={() => setSelectedDate(current => shiftDate(current, -1))}
            className="border-border bg-background hover:border-accent rounded-lg border px-3 py-2 text-sm font-semibold transition"
            aria-label="Ver día anterior"
          >
            ←
          </button>
          <p className="text-center text-base font-bold capitalize sm:text-lg">
            {formatDate(selectedDate)}
          </p>
          <button
            type="button"
            onClick={() => setSelectedDate(current => shiftDate(current, 1))}
            className="border-border bg-background hover:border-accent rounded-lg border px-3 py-2 text-sm font-semibold transition"
            aria-label="Ver día siguiente"
          >
            →
          </button>
        </div>
        <div className="mt-6">
          {matches.length > 0 ? (
            <div className="space-y-3">
              <p className="text-foreground/70 text-sm">
                {matches.length}{" "}
                {matches.length === 1
                  ? "partido publicado"
                  : "partidos publicados"}
              </p>
              {matches.map(partido => (
                <AgendaMatchCard key={partido.id} partido={partido} />
              ))}
            </div>
          ) : (
            <p className="border-border bg-background text-foreground/70 rounded-xl border border-dashed p-5 text-sm">
              No hay partidos publicados para esta fecha.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
