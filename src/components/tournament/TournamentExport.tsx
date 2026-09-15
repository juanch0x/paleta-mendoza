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
import { mockActiveTournament } from "@/data/mock-active-tournament";
import { activeTournamentConfig } from "@/data/active-tournament-config";
import type { Participante, PartidoResuelto } from "@/domain/types";
import { SITE } from "@/config";

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

export default function TournamentExport({
  parejasUrl,
  partidosUrl,
  showMock = false,
}: Props) {
  const today = useMemo(() => localDate(new Date()), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [state, setState] = useState<TournamentState>(() => {
    if (parejasUrl && partidosUrl) {
      const cached = getCachedActiveTournament({ parejasUrl, partidosUrl });
      if (cached)
        return {
          status: "ready",
          tournament: cached.tournament,
          updatedAt: cached.updatedAt,
          source: "live",
        };
      return { status: "loading" };
    }
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
    const source = { parejasUrl, partidosUrl };
    const cached = getCachedActiveTournament(source);
    if (cached?.isFresh && !wasPageReloaded()) return;

    let cancelled = false;
    loadActiveTournament(source)
      .then(tournament => {
        if (cancelled) return;
        const updatedAt = new Date();
        cacheActiveTournament(source, tournament, updatedAt);
        setState({ status: "ready", tournament, updatedAt, source: "live" });
      })
      .catch(() => {
        if (!cancelled && !cached) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [parejasUrl, partidosUrl]);

  const rangeIsValid = isExportRangeValid(from, to);
  const days = useMemo(
    () =>
      state.status === "ready"
        ? groupMatchesForExport(state.tournament.partidos, from, to)
        : [],
    [from, state, to]
  );

  const printExport = () => {
    window.print();
  };

  const createPdfFile = async () => {
    const report = document.querySelector<HTMLElement>(".export-report");
    if (!report) throw new Error("Export report is not available");

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(report, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      onclone: clonedDocument => {
        const styles = clonedDocument.createElement("style");
        styles.textContent = `
          .export-report, .export-report * {
            color: #282728 !important;
            outline-color: #006cac !important;
            box-shadow: none !important;
          }
          .export-report { background: #ffffff !important; border-color: #ece9e9 !important; }
          .export-report .export-day { background: rgba(230, 230, 230, .25) !important; border-color: #ece9e9 !important; }
          .export-report .export-match { background: #ffffff !important; border-color: #ece9e9 !important; }
          .export-report .export-result { background: rgba(230, 230, 230, .5) !important; }
          .export-report .export-status { background: #e6e6e6 !important; }
          .export-report .export-status--complete { background: rgba(0, 108, 172, .15) !important; color: #006cac !important; }
          .export-report .export-report-header > div > p,
          .export-report .export-section h4,
          .export-report .export-versus,
          .export-report .export-report-footer a { color: #006cac !important; }
          .export-report .export-day-header p,
          .export-report .export-match-meta,
          .export-report .export-result span,
          .export-report .export-note,
          .export-report .export-report-footer { color: #666666 !important; }
        `;
        clonedDocument.head.append(styles);
      },
    });
    const width = 210;
    const height = (canvas.height * width) / canvas.width;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [width, height],
    });
    pdf.addImage(canvas, "JPEG", 0, 0, width, height, undefined, "FAST");

    return new File([pdf.output("blob")], "parte-diario.pdf", {
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

  const preparePdf = async (action: "share" | "download") => {
    setIsPreparingPdf(true);
    setPdfError(false);
    try {
      const file = await createPdfFile();
      if (
        action === "share" &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({ files: [file] });
      } else {
        downloadPdf(file);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setPdfError(true);
      }
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
              onClick={() => preparePdf("share")}
              disabled={!rangeIsValid || days.length === 0 || isPreparingPdf}
              aria-busy={isPreparingPdf}
            >
              {isPreparingPdf ? "Preparando PDF…" : "Compartir PDF"}
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
                  onClick={() => preparePdf("download")}
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

          {state.source === "mock" && (
            <p className="export-message">
              Vista de demostración: estos datos no corresponden a un torneo
              real.
            </p>
          )}
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
