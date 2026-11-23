# 07: Official category and position

**What to build:** The registry records each player's official category history (each entry with a start date and an origin: federation or promotion) and a position per year (delantero or zaguero, with an origin: provisional or federation). A player's profile shows their current official category and position, any category change during the year, and titles split by position for that year. When positions are provisional, a visible notice says so. The diagnostics page lists players missing an official category or a position.

**Blocked by:** 03 (Player registry and minimal player profile)

**Status:** ready-for-agent

- [ ] Registry schema supports dated category entries and per-year positions, both with origin
- [ ] The category in effect on a date is the latest entry starting on or before that date
- [ ] Profile shows official category, position, mid-year category changes and titles by position
- [ ] Provisional positions show a notice that they are not yet official
- [ ] Players without category or position still have a working profile
- [ ] Diagnostics lists players missing category or position
- [ ] Covered by player statistics tests and diagnostics tests
