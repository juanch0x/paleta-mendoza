# 05: Full player profile statistics

**What to build:** A player's profile shows their complete record, broken down by year and by category: titles, runner-ups, finals reached, semifinals reached, matches won and lost, sets won and lost, and the number of distinct partners they won titles with.

**Blocked by:** 03 (Player registry and minimal player profile)

**Status:** resolved

- [x] Profile shows finals, semifinals, matches W/L, sets W/L and distinct title partners
- [x] All figures are broken down by year and by category
- [x] Categories without semis (single zone) do not create phantom semifinals
- [x] Possible walkovers (12-0 12-0) count as regular wins
- [x] Covered by the player statistics function tests with synthetic fixtures
- [x] Readable on mobile with text labels (older audience)

## Comments

Resolved in fb11b8a, e819d27. `PlayerStats.historial` (`buildHistorial`, `yearOf`) in `src/domain/player-stats.ts`; profile section "Historial completo" via `src/components/players/RecordFiguresList.astro`. Note: tournament `fecha` is a month label ("Octubre 2026"); category-on-date logic must use real ISO match dates (`partidos[].fecha`).
