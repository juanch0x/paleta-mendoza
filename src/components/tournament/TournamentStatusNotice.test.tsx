import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import TournamentStatusNotice from "./TournamentStatusNotice";

describe("TournamentStatusNotice", () => {
  it("hides standalone tournament announcements", () => {
    const html = renderToStaticMarkup(
      <TournamentStatusNotice
        status={{
          importantMessage:
            "Fases finales confirmadas: repechajes el lunes, semifinales el martes y finales el jueves. Los cruces y horarios se publicarán más adelante.",
          updatedAt: "18 sept 2026, 17:21",
        }}
      />
    );

    expect(html).toBe("");
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
    expect(html).not.toContain("Información del torneo");
  });
});
