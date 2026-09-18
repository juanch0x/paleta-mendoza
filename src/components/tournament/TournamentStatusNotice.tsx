import type { TournamentStatus } from "../../data/csv";
import { formatDelayDuration } from "../../utils/tournament-time";

export default function TournamentStatusNotice({
  status,
}: {
  status?: TournamentStatus;
}) {
  if (!status) return null;

  const isAnnouncement = Boolean(
    status.importantMessage && !status.delayMinutes
  );

  if (isAnnouncement) {
    return (
      <section
        className="border-border bg-muted/55 mt-8 rounded-xl border px-4 py-4 text-sm sm:px-5"
        aria-labelledby="tournament-announcement-title"
      >
        <div className="flex items-start gap-3">
          <span
            className="border-border bg-background text-foreground/70 flex size-9 shrink-0 items-center justify-center rounded-lg border"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-5"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
          </span>
          <div>
            <h2
              id="tournament-announcement-title"
              className="text-base font-bold"
            >
              Información del torneo
            </h2>
            <p className="text-foreground/75 mt-1 leading-relaxed">
              {status.importantMessage}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <aside
      className="border-accent bg-accent/5 mt-8 rounded-r-xl border-l-4 px-4 py-3 text-sm sm:px-5"
      role="status"
      aria-live="polite"
    >
      {status.delayMinutes && (
        <>
          <p className="text-accent text-xs font-bold tracking-wide uppercase">
            Demora estimada: {formatDelayDuration(status.delayMinutes)}
          </p>
          <p className="text-foreground/80 mt-1">
            Las parejas deben presentarse a su horario programado.
          </p>
          <p className="text-foreground/55 mt-2 text-xs">
            Se sugiere presentarse 15 min antes del horario programado.
          </p>
        </>
      )}
      {status.importantMessage && (
        <p
          className={
            status.delayMinutes ? "text-foreground/80 mt-2" : "font-semibold"
          }
        >
          {status.importantMessage}
        </p>
      )}
      {status.updatedAt && (
        <p className="text-foreground/65 mt-3 text-xs">
          Actualizado: {status.updatedAt}
        </p>
      )}
    </aside>
  );
}
