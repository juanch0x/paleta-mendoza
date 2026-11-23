# 09: Annual table

**What to build:** A visitor opens the statistics page and sees, per category and position, an annual table counting only tournaments each player played in the official category they held on that date. Results before a mid-year promotion stay in the old category; from the promotion date they count in the new one. Players from a lower category who played in this one appear in the same table, greyed out, with "–" instead of a rank and "(categoría inferior)" in a small line under the name; a legend above the table explains it. Players without an official category are not in the table. Ordering is titles, then finals, then matches won, defined in a single place. The shared archive validation now also fails when a player played below their official category. A "Estadísticas" entry is added to the main navigation.

**Blocked by:** 05 (Full player profile statistics), 07 (Official category and position). Can be built in parallel with 08, but must not be published before 08 is done.

**Status:** ready-for-agent

- [ ] Table per category and position counts only tournaments in the player's official category on that date
- [ ] Mid-year promotion splits results at the promotion date
- [ ] Lower-category players are greyed, unranked ("–"), labeled "(categoría inferior)", with a legend; ranks skip them
- [ ] Players without official category are excluded
- [ ] Ordering criterion is defined in one place
- [ ] Provisional positions show the notice
- [ ] Archive validation fails when a player played below their official category
- [ ] Each row links to the player's profile
- [ ] The statistics page and its navigation entry are not published until ticket 08 is done
- [ ] Covered by player statistics tests with synthetic fixtures and by freeze tests for the new validation rule
