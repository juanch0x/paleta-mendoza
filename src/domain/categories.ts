/** Official categories, highest first. */
const CATEGORY_ORDER = [
  "Primera",
  "Segunda",
  "Tercera",
  "Cuarta",
  "Quinta",
  "Sexta",
  "Séptima",
];

const isKnown = (categoria: string) => CATEGORY_ORDER.includes(categoria);

/**
 * Orders categories highest first (Primera before Segunda). Unknown categories
 * go last, alphabetically.
 */
export function compareCategories(a: string, b: string): number {
  const rank = (categoria: string) =>
    isKnown(categoria)
      ? CATEGORY_ORDER.indexOf(categoria)
      : CATEGORY_ORDER.length;
  return rank(a) - rank(b) || a.localeCompare(b, "es");
}

/**
 * True when category `a` is lower than category `b` (e.g. Tercera vs
 * Segunda). False when either category is unknown.
 */
export function isLowerCategory(a: string, b: string): boolean {
  return isKnown(a) && isKnown(b) && compareCategories(a, b) > 0;
}

/** URL segment for a category: "Séptima" becomes "septima". */
export function categorySlug(categoria: string): string {
  return categoria
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
