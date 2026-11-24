/** One header cell of a table with grouped column headers. */
export type HeaderCell = { label: string; colspan: number; rowspan: number };

/**
 * Header rows for columns described by their label paths, outermost first
 * (["2026", "Segunda"], or ["Total"]). Adjacent columns sharing a label at a
 * level are grouped under one cell; a path shorter than the deepest one ends
 * in a cell spanning the remaining rows. A level can be added later (say,
 * ["2026", "Clausura", "Segunda"]) without changing callers.
 */
export function headerRows(
  paths: readonly (readonly string[])[]
): HeaderCell[][] {
  const depth = Math.max(0, ...paths.map(path => path.length));
  const sharesGroup = (
    a: readonly string[],
    b: readonly string[],
    level: number
  ) =>
    b.length - 1 > level &&
    a.slice(0, level + 1).every((label, i) => label === b[i]);

  return Array.from({ length: depth }, (_, level) => {
    const row: HeaderCell[] = [];
    for (let i = 0; i < paths.length; ) {
      const path = paths[i];
      if (path.length <= level) {
        i += 1;
        continue;
      }
      if (path.length - 1 === level) {
        row.push({ label: path[level], colspan: 1, rowspan: depth - level });
        i += 1;
        continue;
      }
      let end = i + 1;
      while (end < paths.length && sharesGroup(path, paths[end], level))
        end += 1;
      row.push({ label: path[level], colspan: end - i, rowspan: 1 });
      i = end;
    }
    return row;
  });
}
