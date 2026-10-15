import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { clubs, type ClubId } from "./clubs";

describe("clubs", () => {
  it("registers Club Social Maipú using the existing club mark convention", () => {
    const clubId: ClubId = "club-social-maipu";

    expect(clubs[clubId]).toEqual({
      name: "Club Social Maipú",
      logo: "/images/clubs/club-social-maipu.png",
      markClassName: clubs.regatas.markClassName,
    });
  });

  it.each(Object.values(clubs))("provides a public logo for $name", club => {
    const asset = new URL(`../../public${club.logo}`, import.meta.url);

    expect(existsSync(asset)).toBe(true);
  });
});
