import { activeTournamentConfig } from "@/data/active-tournament-config";
import TournamentIdentity from "./TournamentIdentity";

type Props = {
  activeView: "general" | "agenda";
};

export default function TournamentViewHeader({ activeView }: Props) {
  return (
    <header className="mt-8">
      <TournamentIdentity
        eyebrow="Torneo activo"
        edition={activeTournamentConfig.edition}
        hostClubName={activeTournamentConfig.hostClubName}
        clubId={activeTournamentConfig.clubId}
      />
      <nav
        className="border-border relative mt-5 flex items-center gap-5 border-b pb-3 text-sm"
        aria-label="Vista del torneo"
      >
        {activeView === "general" ? (
          <span className="border-accent text-accent -mb-3 border-b-2 pb-3 font-semibold">
            Vista general
          </span>
        ) : (
          <a
            href="/torneo/"
            className="text-foreground/65 hover:text-foreground transition"
          >
            Vista general
          </a>
        )}
        {activeView === "agenda" ? (
          <span className="border-accent text-accent -mb-3 border-b-2 pb-3 font-semibold">
            Agenda por día
          </span>
        ) : (
          <a
            href="/torneo/agenda/"
            className="text-foreground/65 hover:text-foreground transition"
          >
            Agenda por día
          </a>
        )}
      </nav>
    </header>
  );
}
