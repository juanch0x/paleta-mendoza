import { useEffect, useMemo, useState } from "react";

import {
  loadActiveTournament,
  type ActiveTournament,
} from "@/data/active-tournament";
import {
  cacheActiveTournament,
  getCachedActiveTournament,
  wasPageReloaded,
} from "@/data/active-tournament-cache";
import {
  MAX_EXPORT_DAYS,
  groupMatchesForExport,
  isExportRangeValid,
} from "@/data/tournament-export";
import { activeTournamentConfig } from "@/data/active-tournament-config";
import type { Participante, PartidoResuelto } from "@/domain/types";
import { SITE } from "@/config";

type Props = { parejasUrl?: string; partidosUrl?: string };

type TournamentState =
  | { status: "missing-source" }
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      tournament: ActiveTournament;
      updatedAt: Date;
    };

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

const participantName = (participante: Participante) =>
  participante.tipo === "pareja"
    ? participante.pareja.nombre
    : participante.label;

const scoreBySet = (partido: PartidoResuelto) =>
  partido.sets.map(([a, b]) => `${a}–${b}`).join(" · ");

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Mendoza",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));

const formatUpdatedAt = (date: Date) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

function Match({
  partido,
  status,
}: {
  partido: PartidoResuelto;
  status: "Finalizado" | "Programado";
}) {
  const phase =
    partido.fase === "grupo" ? `Zona ${partido.zona ?? "única"}` : partido.fase;

  return (
    <article className="export-match">
      <div className="export-match-meta">
        <span>{partido.hora ?? "A confirmar"}</span>
        <span>
          {partido.categoria} · {phase}
        </span>
        <span
          className={
            status === "Finalizado"
              ? "export-status export-status--complete"
              : "export-status"
          }
        >
          {status}
        </span>
      </div>
      <div className="export-match-body">
        <p>{participantName(partido.a)}</p>
        <strong className="export-versus">vs.</strong>
        <p>{participantName(partido.b)}</p>
      </div>
      {status === "Finalizado" && (
        <p className="export-result">
          <span>Resultado</span>
          {scoreBySet(partido)}
        </p>
      )}
      {partido.nota && <p className="export-note">{partido.nota}</p>}
    </article>
  );
}

export default function TournamentExport({ parejasUrl, partidosUrl }: Props) {
  const today = useMemo(() => localDate(new Date()), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [state, setState] = useState<TournamentState>(() => {
    if (parejasUrl && partidosUrl) {
      const cached = getCachedActiveTournament({ parejasUrl, partidosUrl });
      if (cached)
        return {
          status: "ready",
          tournament: cached.tournament,
          updatedAt: cached.updatedAt,
        };
      return { status: "loading" };
    }
    return { status: "missing-source" };
  });

  useEffect(() => {
    if (!parejasUrl || !partidosUrl) return;
    const source = { parejasUrl, partidosUrl };
    const cached = getCachedActiveTournament(source);
    if (cached?.isFresh && !wasPageReloaded()) return;

    let cancelled = false;
    loadActiveTournament(source)
      .then(tournament => {
        if (cancelled) return;
        const updatedAt = new Date();
        cacheActiveTournament(source, tournament, updatedAt);
        setState({ status: "ready", tournament, updatedAt });
      })
      .catch(() => {
        if (!cancelled && !cached) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [parejasUrl, partidosUrl]);

  const rangeIsValid = isExportRangeValid(from, to);
  const generatedAt = state.status === "ready" ? state.updatedAt : new Date();
  const days = useMemo(
    () =>
      state.status === "ready"
        ? groupMatchesForExport(state.tournament.partidos, from, to)
        : [],
    [from, state, to]
  );

  useEffect(() => {
    setPdfFile(null);
    setPdfError(false);
  }, [from, to]);

  const printExport = () => {
    window.print();
  };

  const createPdfFile = async () => {
    const [{ pdf }, { default: TournamentExportPdf }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./TournamentExportPdf"),
    ]);
    const blob = await pdf(
      <TournamentExportPdf
        days={days}
        generatedAt={formatUpdatedAt(generatedAt)}
      />
    ).toBlob();

    return new File([blob], "parte-diario.pdf", {
      type: "application/pdf",
    });
  };

  const downloadPdf = (file: File) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const preparePdf = async () => {
    setIsPreparingPdf(true);
    setPdfError(false);
    try {
      const file = await createPdfFile();
      setPdfFile(file);
    } catch {
      setPdfError(true);
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const sharePdf = () => {
    if (!pdfFile) {
      void preparePdf();
      return;
    }
    if (!navigator.share || !navigator.canShare?.({ files: [pdfFile] })) {
      downloadPdf(pdfFile);
      return;
    }
    navigator.share({ files: [pdfFile] }).catch(error => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setPdfError(true);
      }
    });
  };

  const savePdf = async () => {
    if (pdfFile) {
      downloadPdf(pdfFile);
      return;
    }
    setIsPreparingPdf(true);
    setPdfError(false);
    try {
      const file = await createPdfFile();
      setPdfFile(file);
      downloadPdf(file);
    } catch {
      setPdfError(true);
    } finally {
      setIsPreparingPdf(false);
    }
  };

  if (state.status === "missing-source")
    return (
      <p className="export-message">
        El torneo activo todavía no está configurado.
      </p>
    );
  if (state.status === "loading")
    return <p className="export-message">Cargando parte del torneo…</p>;
  if (state.status === "error")
    return (
      <p className="export-message">
        No pudimos cargar el torneo. Probá de nuevo en unos minutos.
      </p>
    );

  return (
    <section className="export-shell" aria-labelledby="export-title">
      <div className="export-controls">
        <div>
          <p className="text-accent text-xs font-semibold tracking-[0.16em] uppercase">
            Herramienta operativa
          </p>
          <h1 id="export-title" className="mt-1 text-2xl font-bold">
            Parte diario
          </h1>
        </div>
        <div className="export-controls-actions">
          <label>
            Desde
            <input
              type="date"
              value={from}
              onChange={event => setFrom(event.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={to}
              onChange={event => setTo(event.target.value)}
            />
          </label>
        </div>
        <div className="export-output-actions">
          <div className="export-split-button">
            <button
              type="button"
              onClick={sharePdf}
              disabled={!rangeIsValid || days.length === 0 || isPreparingPdf}
              aria-busy={isPreparingPdf}
            >
              {isPreparingPdf
                ? "Preparando PDF…"
                : pdfFile
                  ? "Compartir PDF"
                  : "Preparar PDF"}
            </button>
            <details>
              <summary aria-label="Ver más opciones de exportación">
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
                  <path
                    d="m4 6 4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <div className="export-print-menu">
                <button
                  type="button"
                  onClick={savePdf}
                  disabled={
                    !rangeIsValid || days.length === 0 || isPreparingPdf
                  }
                >
                  Guardar PDF
                </button>
                <button
                  type="button"
                  aria-label="Imprimir en A4"
                  onClick={printExport}
                  disabled={
                    !rangeIsValid || days.length === 0 || isPreparingPdf
                  }
                >
                  Imprimir en A4
                </button>
              </div>
            </details>
          </div>
        </div>
        <p className="export-range-help">
          Podés incluir hasta {MAX_EXPORT_DAYS} días. Los resultados y partidos
          programados se ordenan automáticamente.
        </p>
        {pdfFile && (
          <p className="export-range-help">
            PDF listo. Tocá <strong>Compartir PDF</strong> para elegir WhatsApp.
          </p>
        )}
        {pdfError && (
          <p className="export-range-help" role="alert">
            No pudimos generar el PDF. Probá de nuevo.
          </p>
        )}
      </div>

      {!rangeIsValid ? (
        <p className="export-message">
          Elegí un rango válido de hasta {MAX_EXPORT_DAYS} días.
        </p>
      ) : (
        <div className="export-report">
          <header className="export-report-header">
            <div>
              <p>Parte del torneo</p>
              <h2>{activeTournamentConfig.name}</h2>
            </div>
          </header>
          {days.length === 0 ? (
            <p className="export-message">
              No hay partidos publicados en este rango.
            </p>
          ) : (
            days.map(day => (
              <section className="export-day" key={day.date}>
                <div className="export-day-header">
                  <h3>{formatDate(day.date)}</h3>
                  <p>
                    {day.results.length + day.scheduled.length}{" "}
                    {day.results.length + day.scheduled.length === 1
                      ? "partido publicado"
                      : "partidos publicados"}
                  </p>
                </div>
                {day.results.length > 0 && (
                  <div className="export-section">
                    <h4>Resultados</h4>
                    {day.results.map(partido => (
                      <Match
                        key={partido.id}
                        partido={partido}
                        status="Finalizado"
                      />
                    ))}
                  </div>
                )}
                {day.scheduled.length > 0 && (
                  <div className="export-section">
                    <h4>Partidos programados</h4>
                    {day.scheduled.map(partido => (
                      <Match
                        key={partido.id}
                        partido={partido}
                        status="Programado"
                      />
                    ))}
                  </div>
                )}
              </section>
            ))
          )}

          <footer className="export-report-footer">
            <p>Generado: {formatUpdatedAt(state.updatedAt)}</p>
            <p>
              Generado desde{" "}
              <a href={SITE.website}>
                {SITE.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </p>
            <p>
              Información orientativa. Confirmá horarios, cambios y resultados
              en los canales oficiales de la Federación y la organización.
            </p>
          </footer>
        </div>
      )}
    </section>
  );
}
