import { useEffect, useRef, useState } from "react";
import {
  courtLabels,
  dailyEvents,
  dates,
  formatDate,
  localDate,
  modalities,
  mundial,
  precedingCeremony,
  readSelection,
  selectionUrl,
  type AgendaSelection,
  type MundialEvent,
} from "../../data/mundial/agenda";

export function EventCard({ event }: { event: MundialEvent }) {
  const ceremony = precedingCeremony(event);
  const kind =
    event.kind === "ceremony"
      ? "Ceremonia"
      : event.kind === "session"
        ? "Sesión"
        : "Partido";
  return (
    <article className="border-border bg-background rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-accent text-xs font-semibold tracking-wide uppercase">
            {event.modality ?? "Inauguración"}
          </p>
          <p className="text-foreground/75 mt-1 text-xs">
            {kind}
            {event.gender
              ? ` · ${event.gender === "female" ? "Femenino" : "Masculino"}`
              : ""}
          </p>
        </div>
        <span className="bg-muted rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums">
          {event.startTime ? (
            <time dateTime={`${event.date}T${event.startTime}`}>
              {event.startTime}
            </time>
          ) : event.startNote ? (
            "A continuación"
          ) : (
            "Horario a confirmar"
          )}
        </span>
      </div>
      {event.kind === "ceremony" ? (
        <h3 className="mt-4 font-medium">Inauguración</h3>
      ) : (
        <h3 className="mt-4 text-sm font-medium sm:text-base">
          {event.participantA || event.participantB
            ? `${event.participantA ?? "Por definir"} vs. ${event.participantB ?? "Por definir"}`
            : event.kind === "session"
              ? "Sesión programada · participantes por definir"
              : "Participantes por definir"}
        </h3>
      )}
      {event.kind !== "ceremony" && event.phaseLabel && (
        <p className="text-foreground/75 mt-1 text-sm">{event.phaseLabel}</p>
      )}
      {ceremony && (
        <p className="text-foreground/75 mt-2 text-xs leading-5">
          Después de la inauguración de las {ceremony.startTime}, en{" "}
          {ceremony.venue ?? "sede por confirmar"}. Sin hora exacta.
        </p>
      )}
      <p className="text-foreground/75 mt-3 text-xs leading-5">
        {courtLabels[event.courtType] ?? event.courtType} ·{" "}
        {event.venue ?? "Sede no indicada en el programa"}
      </p>
    </article>
  );
}

export default function MundialAgenda() {
  const [selection, setSelection] = useState<AgendaSelection>();
  const [today, setToday] = useState("");
  const dayList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => {
      const now = new Date();
      setToday(localDate(now));
      setSelection(readSelection(window.location.search, now));
    };
    sync();
    window.addEventListener("popstate", sync);
    const timer = window.setInterval(
      () => setToday(localDate(new Date())),
      60_000
    );
    return () => {
      window.removeEventListener("popstate", sync);
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const button = dayList.current?.querySelector<HTMLButtonElement>(
      '[aria-pressed="true"]'
    );
    if (button && dayList.current)
      dayList.current.scrollLeft =
        button.offsetLeft - dayList.current.offsetLeft;
  }, [selection?.date]);
  if (!selection)
    return (
      <p role="status" className="mt-8 text-sm">
        Cargando agenda…
      </p>
    );
  const change = (next: AgendaSelection) => {
    window.history.pushState(
      {},
      "",
      selectionUrl(new URL(window.location.href), next)
    );
    setSelection(next);
  };
  const clear = () =>
    change({ ...selection, modality: "", argentinaOnly: false });
  const events = dailyEvents(selection);
  const filtered = Boolean(selection.modality || selection.argentinaOnly);
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">Agenda por día</h2>
        {dates.includes(today) && (
          <button
            type="button"
            className="border-border hover:bg-muted rounded-lg border px-3 py-2 text-sm"
            onClick={() => change({ ...selection, date: today })}
          >
            Hoy
          </button>
        )}
      </div>
      <div
        ref={dayList}
        role="group"
        aria-label="Día de la agenda"
        className="relative mt-4 flex gap-2 overflow-x-auto p-1 pb-3"
      >
        {dates.map(date => (
          <button
            key={date}
            type="button"
            aria-pressed={selection.date === date}
            onClick={() => change({ ...selection, date })}
            className={`shrink-0 rounded-lg border px-3 py-3 text-sm ${selection.date === date ? "border-accent bg-accent/10 text-accent font-semibold" : "border-border hover:bg-muted"}`}
          >
            {formatDate(date, true)}
          </button>
        ))}
      </div>
      <div className="border-border mt-4 flex flex-wrap items-end gap-4 border-b pb-5">
        <label
          className="flex min-w-0 flex-col gap-2 text-xs font-semibold"
          htmlFor="mundial-modality"
        >
          Modalidad
          <select
            id="mundial-modality"
            className="border-border bg-background max-w-full rounded-lg border px-3 py-2.5 text-sm font-normal"
            value={selection.modality}
            onChange={event =>
              change({ ...selection, modality: event.target.value })
            }
          >
            <option value="">Todas las modalidades</option>
            {modalities.map(modality => (
              <option key={modality}>{modality}</option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            role="switch"
            className="accent-accent size-4"
            checked={selection.argentinaOnly}
            aria-describedby={
              selection.argentinaOnly ? "argentina-help" : undefined
            }
            onChange={event =>
              change({ ...selection, argentinaOnly: event.target.checked })
            }
          />
          Solo Argentina
        </label>
        {filtered && (
          <button
            type="button"
            className="text-accent min-h-11 text-sm underline underline-offset-4"
            onClick={clear}
          >
            Limpiar filtros
          </button>
        )}
      </div>
      {selection.argentinaOnly && (
        <p
          id="argentina-help"
          className="text-foreground/75 mt-3 text-xs leading-5"
        >
          Solo participaciones confirmadas de Argentina. Los cruces con
          participantes por definir no se incluyen.
        </p>
      )}
      <div className="mt-6" aria-live="polite" aria-atomic="true">
        <h3 className="font-semibold capitalize">
          {formatDate(selection.date)}
        </h3>
        <p className="text-foreground/75 mt-1 text-xs">
          {events.length} {events.length === 1 ? "actividad" : "actividades"}
          {filtered ? " con estos filtros" : " programadas"}
        </p>
      </div>
      {events.length ? (
        <div className="mt-4 grid gap-3">
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="border-border mt-4 rounded-xl border border-dashed p-5">
          <p className="text-sm">
            No hay actividad para este día con los filtros seleccionados.
          </p>
          <button
            type="button"
            className="text-accent mt-3 min-h-11 text-sm underline underline-offset-4"
            onClick={clear}
          >
            Limpiar filtros
          </button>
        </div>
      )}
      <div className="border-border text-foreground/75 mt-8 border-t pt-4 text-xs leading-5">
        <a
          className="text-accent underline underline-offset-4"
          href={mundial.source.url}
        >
          Programa original (PDF)
        </a>
        <p className="mt-2">
          Transcripción:{" "}
          <time dateTime={mundial.transcribedAt}>15 de octubre de 2026</time>.
          Revisión del PDF: {mundial.source.revisionLabel}.
        </p>
        <p className="mt-2">
          Programa orientativo, sujeto a cambios. Confirmá la información con la
          organización. Las sesiones agrupadas no representan partidos
          individuales; se conservan los participantes y horarios pendientes del
          programa.
        </p>
      </div>
    </div>
  );
}
