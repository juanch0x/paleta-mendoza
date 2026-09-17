import { describe, expect, it } from "vitest";

import { onRequestGet } from "./torneo-diagnostico";

describe("torneo diagnostics endpoint", () => {
  it("fails closed when no production diagnostic token is configured", async () => {
    const response = await onRequestGet({
      env: {},
      request: new Request("https://example.test/api/torneo-diagnostico"),
    });

    expect(response.status).toBe(404);
  });

  it("fails closed when the Authorization header does not match the token", async () => {
    const response = await onRequestGet({
      env: { TOURNAMENT_DIAGNOSTICS_TOKEN: "operator-token" },
      request: new Request("https://example.test/api/torneo-diagnostico", {
        headers: { Authorization: "Bearer wrong-token" },
      }),
    });

    expect(response.status).toBe(404);
  });

  it("returns a safe configuration error when the spreadsheet id is missing", async () => {
    const response = await onRequestGet({
      env: { TOURNAMENT_DIAGNOSTICS_TOKEN: "operator-token" },
      request: new Request("https://example.test/api/torneo-diagnostico", {
        headers: { Authorization: "Bearer operator-token" },
      }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "El diagnóstico del torneo no está configurado.",
    });
  });
});
