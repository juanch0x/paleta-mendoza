# 11: Likely promotion warning in diagnostics

**What to build:** The organizer is warned in the diagnostics page when the data shows a player won three consecutive tournaments in a category but no promotion entry is recorded, so automatic promotions are not missed. The organizer still records the promotion by hand; nothing is computed into the registry.

**Blocked by:** 07 (Official category and position)

**Status:** ready-for-agent

- [ ] Diagnostics warns on three consecutive titles in the same category without a later promotion entry
- [ ] No warning when a promotion entry exists after the third title
- [ ] The warning names the player, category and the three tournaments
- [ ] Covered by tournament diagnostics tests
