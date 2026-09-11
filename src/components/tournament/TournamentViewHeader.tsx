import { activeTournamentConfig } from "@/data/active-tournament-config";

type Props = {
  activeView: "general" | "agenda";
};

export default function TournamentViewHeader({ activeView }: Props) {
  return (
    <header className="mt-8">
      <div>
        <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase">
          Torneo activo
        </p>
        <div className="mt-3 flex items-center gap-4">
          <img
            src={activeTournamentConfig.clubLogo}
            alt=""
            aria-hidden="true"
            className="size-16 object-contain"
          />
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">
              {activeTournamentConfig.edition}
            </h2>
            <p className="text-foreground/75 mt-0.5 text-base font-medium">
              {activeTournamentConfig.hostClubName}
            </p>
          </div>
        </div>
      </div>
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
