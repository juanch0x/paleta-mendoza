import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("diagnostic route authentication UI", () => {
  it("renders the production credential form and sends its value in an Authorization header", async () => {
    const page = await readFile(
      new URL("../pages/torneo/diagnostico.astro", import.meta.url),
      "utf8"
    );

    expect(page).toContain('id="diagnostic-auth"');
    expect(page).toContain('id="diagnostic-token"');
    expect(page).toContain("Authorization: `Bearer ${token}`");
    expect(page).not.toContain("new URLSearchParams(window.location.search)");
    expect(page).toContain("GOOGLE_SHEETS_SPREADSHEET_ID");
    expect(page).not.toContain("ACTIVE_TOURNAMENT_SHEET_ID");
  });
});
