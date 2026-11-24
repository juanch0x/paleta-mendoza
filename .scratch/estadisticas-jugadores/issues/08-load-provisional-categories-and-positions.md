# 08: Load provisional categories and positions

**What to build:** The organizer enters the real official category and a provisional position for every player in the registry (about 20–30 today), so the annual table has data to show.

**Blocked by:** 07 (Official category and position)

**Status:** resolved

- [x] Every registry player has an official category entry for 2026
- [x] Every registry player has a 2026 position marked as provisional
- [x] Any mid-year promotions known for 2026 are recorded with their date
- [x] Diagnostics no longer lists players missing category or position

## Comments

Resolved on branch `stats/11-load-categories`. All 77 registry players have a 2026 `federacion` category (from `2026-01-01`) and a `provisoria` 2026 position, loaded from the organizer's reviewed sheet. Three duplicate players were merged first (`lucas-vives` into `luca-vives`, `armando-masetto` and `manolo-masetoo` into `manolo-masetto`, `mario-cuevas` into `pipino-cuevas`); the old sheet names stay resolvable through the new optional `alias` field on registry players, which `createPlayerMatcher` also matches. Known 2026 promotion: Gabriel Fernández, Cuarta to Tercera (`origen: "ascenso"`, `desde: "2026-10-30"`, the date of the Club Social Maipú Cuarta final), which silences the likely-promotion warning. Diagnostics list no players missing category or position. `STATISTICS_PAGE_PUBLISHED` is now `true`.
