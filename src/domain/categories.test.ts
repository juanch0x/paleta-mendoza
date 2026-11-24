import { describe, expect, it } from "vitest";

import { categorySlug } from "./categories.js";

describe("categorySlug", () => {
  it("turns a category into its URL segment", () => {
    expect(categorySlug("Primera")).toBe("primera");
    expect(categorySlug("Séptima")).toBe("septima");
  });
});
