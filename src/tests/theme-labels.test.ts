import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

describe("theme accessibility labels", () => {
  it.each([
    ["light", "Activar tema oscuro", "dark", "Activar tema claro"],
    ["dark", "Activar tema claro", "light", "Activar tema oscuro"],
  ])(
    "keeps %s technical values while translating the action",
    async (initial, label, next, nextLabel) => {
      const attributes: Record<string, string> = {};
      const stored: Record<string, string> = { theme: initial };
      let click: (() => void) | undefined;
      let systemChange: ((event: { matches: boolean }) => void) | undefined;
      const button = {
        setAttribute: (key: string, value: string) => {
          attributes[key] = value;
        },
        addEventListener: (_: string, callback: () => void) => {
          click = callback;
        },
      };
      const window = {
        onload: () => {},
        matchMedia: () => ({
          matches: false,
          addEventListener: (_: string, callback: typeof systemChange) => {
            systemChange = callback;
          },
        }),
      };
      runInNewContext(await readFile("public/toggle-theme.js", "utf8"), {
        localStorage: {
          getItem: (key: string) => stored[key],
          setItem: (key: string, value: string) => {
            stored[key] = value;
          },
        },
        document: {
          firstElementChild: { setAttribute: button.setAttribute },
          querySelector: () => button,
          body: null,
          addEventListener: () => {},
        },
        window,
      });
      window.onload();
      expect(attributes["aria-label"]).toBe(label);
      expect(attributes["data-theme"]).toBe(initial);
      click?.();
      expect(attributes["aria-label"]).toBe(nextLabel);
      expect(attributes["data-theme"]).toBe(next);
      expect(stored.theme).toBe(next);
      systemChange?.({ matches: true });
      expect(attributes["aria-label"]).toBe("Activar tema claro");
      expect(attributes["data-theme"]).toBe("dark");
    }
  );
});
