import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const tournamentRoutes = [
  "src/pages/torneo.astro",
  "src/pages/torneo/agenda.astro",
  "src/pages/torneo/export.astro",
];

const tournamentComponents = [
  "src/components/tournament/ActiveTournament.tsx",
  "src/components/tournament/TournamentAgenda.tsx",
  "src/components/tournament/TournamentExport.tsx",
];

describe("tournament live data sources", () => {
  it("uses the configured CSVs in development too, without a mock-data escape hatch", async () => {
    const sources = await Promise.all(
      [...tournamentRoutes, ...tournamentComponents, ".env.example"].map(path =>
        readFile(path, "utf8")
      )
    );

    expect(sources.join("\n")).not.toContain("mock-active-tournament");
    expect(sources.join("\n")).not.toContain("PUBLIC_TOURNAMENT_MOCK");
    expect(sources.join("\n")).not.toContain("PUBLIC_TOURNAMENT_STATUS_MOCK");
    expect(await readFile("src/pages/torneo.astro", "utf8")).not.toContain(
      "import.meta.env.DEV"
    );
    expect(
      await readFile("src/pages/torneo/agenda.astro", "utf8")
    ).not.toContain("import.meta.env.DEV");
    expect(
      await readFile("src/pages/torneo/export.astro", "utf8")
    ).not.toContain("import.meta.env.DEV");
  });

  it("keeps test files outside Astro's page routes", async () => {
    const entries = await readdir("src/pages/torneo", { withFileTypes: true });

    expect(
      entries.filter(entry => entry.isFile()).map(entry => entry.name)
    ).not.toContain("diagnostico.test.ts");
  });
});
