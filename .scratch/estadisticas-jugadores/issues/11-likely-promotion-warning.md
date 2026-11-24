# 11: Likely promotion warning in diagnostics

**What to build:** The organizer is warned in the diagnostics page when the data shows a player won three consecutive tournaments in a category but no promotion entry is recorded, so automatic promotions are not missed. The organizer still records the promotion by hand; nothing is computed into the registry.

**Blocked by:** 07 (Official category and position)

**Status:** resolved

- [x] Diagnostics warns on three consecutive titles in the same category without a later promotion entry
- [x] No warning when a promotion entry exists after the third title
- [x] The warning names the player, category and the three tournaments
- [x] Covered by tournament diagnostics tests

## Comments

Resolved in 0e54c9f. `diagnoseLikelyPromotions(players, tournaments)` in `src/data/tournament-diagnostics.ts`; "Posibles ascensos" section on the diagnostics page. Only an `origen: "ascenso"` entry dated on/after the third title silences it; runs reset after three.
