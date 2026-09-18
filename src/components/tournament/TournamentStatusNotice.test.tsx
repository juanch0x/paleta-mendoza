import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import TournamentStatusNotice from "./TournamentStatusNotice";

describe("TournamentStatusNotice", () => {
  it("renders a message without a delay as a neutral tournament announcement", () => {
    const html = renderToStaticMarkup(
      <TournamentStatusNotice
        status={{
          importantMessage:
            "Fases finales confirmadas: repechajes el lunes, semifinales el martes y finales el jueves. Los cruces y horarios se publicarán más adelante.",
          updatedAt: "18 sept 2026, 17:21",
        }}
      />
    );

    expect(html).toContain("Información del torneo");
    expect(html).toContain("tournament-announcement-title");
    expect(html).toContain("bg-muted/55");
    expect(html).toContain("rounded-xl");
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain("leading-relaxed");
    expect(html).not.toContain("Actualizado:");
    expect(html).not.toContain("Demora estimada");
    expect(html).not.toContain("border-l-4");
    expect(html).not.toContain("border-accent");
    expect(html).not.toContain("bg-accent");
  });

  it("keeps delay notices and their messages in the operational notice", () => {
    const html = renderToStaticMarkup(
      <TournamentStatusNotice
        status={{
          delayMinutes: 30,
          importantMessage: "Llegar con anticipación",
        }}
      />
    );

    expect(html).toContain("Demora estimada: 30 min");
    expect(html).toContain("Llegar con anticipación");
    expect(html).toContain("border-l-4");
    expect(html).not.toContain("tournament-announcement-title");
  });
});
