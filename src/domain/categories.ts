const CATEGORY_ORDER = [
  "Primera",
  "Segunda",
  "Tercera",
  "Cuarta",
  "Quinta",
  "Sexta",
  "Séptima",
];

export const categoryRank = (categoria: string) => {
  const index = CATEGORY_ORDER.indexOf(categoria);
  return index === -1 ? CATEGORY_ORDER.length : index;
};

/** True when category `a` is lower than category `b` (e.g. Tercera vs Segunda). */
export function isLowerCategory(a: string, b: string): boolean {
  const rankA = CATEGORY_ORDER.indexOf(a);
  const rankB = CATEGORY_ORDER.indexOf(b);
  return rankA !== -1 && rankB !== -1 && rankA > rankB;
}
