import { describe, expect, it } from "vitest";
import { getBreadcrumbLabel } from "./getBreadcrumbLabel";

describe("breadcrumb labels", () => {
  it.each([
    ["about", "Acerca de"],
    ["archives", "Archivo"],
    ["posts", "Noticias"],
    ["search", "Buscar"],
    ["tags", "Tags"],
  ])("labels %s without changing the route segment", (segment, label) => {
    expect(getBreadcrumbLabel(segment)).toBe(label);
    expect(segment).not.toBe(label);
  });

  it("preserves unknown segments and tag names", () => {
    expect(getBreadcrumbLabel("paleta")).toBe("paleta");
    expect(getBreadcrumbLabel("torneos")).toBe("torneos");
  });
});
