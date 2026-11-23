# 10: Filters that appear only with more than one option

**What to build:** On the statistics page and the player profile, visitors can filter by year, by edition within a year (Apertura / Clausura), and by a single tournament. Each filter only appears when it has more than one option; when none apply, a clear heading such as "2026 · Clausura" states the period shown. Today no filter is visible.

**Blocked by:** 09 (Annual table)

**Status:** resolved

- [x] Year, edition-within-year and tournament filters, each with a visible text label
- [x] A filter renders only when it has more than one option
- [x] Without filters, a heading states the year and edition covered
- [x] Edition filter is always scoped to a year
- [x] Verified with fixtures containing two years and both editions

## Comments

Resolved in 10920c9, 668cb9a. `buildPeriodViews` in `src/domain/period-filters.ts`; pre-rendered period routes; profile moved to `src/pages/jugadores/[id]/[...periodo].astro`. Edition read from each archive `edition` field. Note: with the three Clausura 2026 archives, the tournament filter has 3 options and is shown, following the "more than one option" rule (the "today no filter is visible" note was inaccurate).
