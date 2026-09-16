import type { TournamentStatus } from "@/data/csv";
import { formatDelayDuration } from "@/utils/tournament-time";

export default function TournamentStatusNotice({
  status,
}: {
  status?: TournamentStatus;
}) {
  if (!status) return null;

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
