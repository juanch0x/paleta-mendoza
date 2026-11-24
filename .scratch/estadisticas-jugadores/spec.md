# Spec: Player statistics module

Status: ready-for-agent

## Problem Statement

Tournament results are published on the site one tournament at a time, but nobody can see how a player is doing across tournaments. Players and the public cannot answer simple questions such as "how many tournaments has this player won?", "with how many different partners?", "how many finals did they reach this year?" or "how is this player standing in their category this year?". The organizer has all the raw data in the archived tournament JSONs, but it is not exposed anywhere.

The archived data also has quality problems that would make any statistic wrong: players are stored as free-text names (13 people appear under two spellings because of accents), one archived match has no score, and there is no record of each player's official federation category or position (delantero / zaguero), which is exactly what the federation uses for its annual promotions.

## Solution

A public statistics module with three pages:

- **Statistics** (`/estadisticas`): an annual table per category and position, counting only tournaments a player played in the official category they held on that date. Players who played in that category but belong to a lower one appear in the same table, greyed out, without a rank number.
- **Players** (`/jugadores`): a searchable list of all players.
- **Player profile** (`/jugadores/[id]`): titles, runner-up finishes, finals, semifinals, matches and sets won/lost, and distinct partners they won titles with, broken down by year and by category, plus official category and position in one summary card.

To support it, the site gains a **player registry**: one record per player with a stable id, an official name, a dated history of official categories, and a per-year position. Archived tournaments reference players by id instead of by free-text name. Data integrity is enforced: the freeze step and the build fail when an archived tournament is incomplete or references an unknown player, while the live tournament only surfaces warnings in the existing diagnostics page.

## User Stories

### Public visitors and players

1. As a player, I want to see how many tournaments I have won, so that I can track my achievements over time.
2. As a player, I want to see how many times I finished runner-up, so that my finals are recognised even when I did not win.
3. As a player, I want to see how many finals I reached, so that I understand how consistently I get deep in tournaments.
4. As a player, I want to see how many semifinals I reached, so that I see my progress in categories with two zones.
5. As a player, I want to see how many matches I won and lost, so that I know my overall record.
6. As a player, I want to see how many sets I won and lost, so that I have a finer-grained view of my performance.
7. As a player, I want to see with how many different partners I have won titles, so that I can see how versatile I am.
8. As a player, I want to see how many titles I won as delantero and how many as zaguero, so that my results match how the federation separates positions.
9. As a player, I want my statistics broken down by category, so that titles won in a higher category are distinguished from titles in my own.
10. As a player, I want my statistics broken down by year, so that I can compare seasons.
11. As a player, I want to see my official federation category and position on my profile, so that I know how the site classifies me.
12. As a player, I want to see when my category changed during the year (for example after a promotion), so that my history is accurate.
13. As a visitor, I want a list of all players with a search box, so that I can quickly find a specific player.
14. As a visitor, I want to open a player's profile from the player list, so that I can see their full history.
15. As a visitor, I want to open a player's profile from the annual table, so that I can explore the people at the top.
16. As a visitor, I want an annual table for each category and position, so that I can see who is leading this year.
17. As a visitor, I want the annual table ordered by titles, then finals, then matches won, so that the ordering is predictable and fair.
18. As a visitor, I want only tournaments played in the player's official category to count in the annual table, so that the table reflects the federation's promotion logic.
19. As a visitor, I want to also see in the same table players from a lower category who played in this one, greyed out and without a rank number, so that I can see their results without them affecting the ranking.
20. ~~Legend above the table~~ Dropped: the in-table markers "(categoría inferior)" and "(ascendió)" are enough.
21. As a visitor, I want greyed-out rows to show "(categoría inferior)" under the player's name, so that the reason is explicit without a hover or an icon.
22. As an older visitor on a phone, I want the tables and controls to be readable and labeled with text, so that I can use the page without hidden interactions.
23. As a visitor, I want to filter by year and by season within a year (Apertura / Clausura), so that I can look at a specific period.
24. As a visitor, I want filters to appear only when they have more than one option, so that the page is not cluttered with useless controls.
25. As a visitor, when no filter is available, I want a clear heading such as "2026 · Clausura", so that I know which period the data covers.
26. ~~Provisional-position notice~~ Dropped: the whole site is unofficial, so every figure is provisional.
27. As a visitor, I want players without an official category to still have a profile, so that their results are visible even before the federation list is loaded.
28. As a visitor, I want a "Estadísticas" entry in the main navigation, so that I can find the module.
29. As a visitor, I want statistics to include only finished, archived tournaments, so that numbers do not move while a tournament is in progress.
30. As a player who was promoted mid-year, I want my results in the old category to stay in that category and my new results to count in the new category from the promotion date, so that my annual standing is correct.

### Organizer (data maintainer)

31. As the organizer, I want each player to have a stable id and an official name, so that statistics are aggregated per person regardless of spelling.
32. As the organizer, I want one registry record per player, so that each change touches only that player and can later map to a document database.
33. As the organizer, I want to record a player's official category with a start date and an origin (federation or promotion), so that mid-year promotions are modelled without special cases.
34. As the organizer, I want to record a player's position per year with an origin (provisional or federation), so that I can enter my own best guess now and replace it with the official list later.
35. As the organizer, I want the registry validated against a schema at build time, so that a typo in a record is reported with the exact record that failed.
36. As the organizer, I want the freeze step to match each name in the sheet to a registry player ignoring accents, case and extra spaces, so that minor spelling differences do not create duplicate players.
37. As the organizer, I want the freeze step to fail and tell me the name, pair and sheet row that could not be matched, so that I can fix the source quickly.
38. As the organizer, I want archived tournaments to store player ids, so that statistics never depend on free-text names again.
39. As the organizer, I want the three existing archived tournaments migrated to player ids, with the 13 accent-variant names unified, so that historical data is consistent.
40. As the organizer, I want the build to fail if an archived tournament has a match without a score, so that incomplete data never reaches the statistics.
41. As the organizer, I want the build to fail if an archived tournament is missing a final for a category, so that champions can always be derived.
42. As the organizer, I want the build to fail if an archived tournament has a player playing in a category lower than their official one, so that impossible data is caught.
43. As the organizer, I want the same validation used by both the freeze step and the build, so that the rules cannot drift apart.
44. As the organizer, during a live tournament I want unmatched names shown as warnings in the diagnostics page instead of breaking the site, so that the live tournament keeps working while I fix the sheet.
45. As the organizer, I want the diagnostics page to warn me when a player won three consecutive tournaments in a category but no promotion is recorded, so that I do not miss an automatic promotion.
46. As the organizer, I want the diagnostics page to list players without an official category or position, so that I know what data is still pending.
47. As the organizer, I want the annual table ordering defined in one place, so that I can replace it with the federation's points table when I get it.
48. As the organizer, I want statistics computed through a thin data-access interface, so that moving the registry to a cloud database later only changes the adapter.

## Implementation Decisions

### Data model

- **Player registry**: a new content collection with one JSON file per player (document-per-player, mirroring a future document-database collection). Validated with a Zod schema.
- **Player record** fields:
  - `id`: stable slug.
  - `nombreOficial`: official display name.
  - `categorias`: ordered list of `{ desde: date, categoria, origen: "federacion" | "ascenso" }`. The category in effect on a given date is the latest entry whose `desde` is on or before that date.
  - `posiciones`: list of `{ anio, posicion: "delantero" | "zaguero", origen: "provisoria" | "federacion" }`.
- No name aliases in the registry. Matching uses normalisation (accents, case, whitespace) and the source data is fixed at the origin when matching fails.
- **Archived tournaments** gain player ids per pair member, written by the freeze step. Pair display names stay as they are for the existing tournament pages.
- The federation's yearly category/position list is unnormalised (Excel or PDF) and is preprocessed by hand. No importer in this spec.

### Rules

- Only tournaments in the archive registry count. The active tournament is never included.
- Champion and runner-up are derived from the `final` match of each category. Semifinals are matches with phase `semi`; reaching a final counts as winning a semifinal where semis exist.
- A tournament counts toward a player's annual table entry only when the tournament category equals the player's official category on the tournament date.
- After a mid-year promotion, results before the promotion date count in the old category; results from that date count in the new one.
- Players who played in a category above their official one are shown in that category's table, greyed out, unranked, with "(categoría inferior)". Playing below the official category is a data error.
- Players promoted out of a category (their official category at the end of the viewed period, i.e. its last match date, is higher than the table's) stay in that table greyed out, unranked, with "(ascendió)"; the next player takes their rank. If the period ends before the promotion date they show normally.
- Players with no official category for the tournament date are excluded from the annual table but still have a profile.
- Statistics by position use the player's position for that year. No notice is shown for provisional positions (the site is unofficial); the `origen` field is kept for when the federation list arrives.
- Annual table ordering: titles, then finals, then matches won. Defined in a single place.
- Page layout: one page per category (`/estadisticas/<categoria>[/<periodo>]`, `/estadisticas` shows the highest category), selected with category tabs; one table per category with a titled row separating Delanteros and Zagueros.
- Filters: year, and season (Apertura / Clausura) within a year. The season comes from the archive `edition` when it is Apertura or Clausura, otherwise from the tournament name or slug; the build fails when neither says. Each filter renders only when it has more than one option. The player profile also offers a single tournament of the season, and shows its filters in a panel opened from one labelled "Filtrar · <período>" button.

### Modules

- **Player statistics (new, pure domain)**: takes archived tournaments and the player registry, returns player profiles and annual tables. No I/O.
- **Archive validation (new, shared)**: one function used by both the freeze step and the build. Fails on missing scores, missing finals, unknown players, and players below their official category. Error messages name the tournament, match or pair and the offending value.
- **Freeze step (modified)**: resolves sheet names to player ids through the registry and runs archive validation before writing.
- **Tournament diagnostics (modified)**: non-blocking warnings for unmatched live names, likely unrecorded promotions (three consecutive titles in a category) and players missing category or position.
- **Data access (new, thin)**: repository interfaces for players and archived tournaments with a JSON-backed implementation. Only the methods the module needs.
- **Pages (new)**: statistics, player list, player profile; statically generated like the existing tournament archive pages. New main-navigation entry.

### Data fixes

- The Regatas archive has one group-stage match with no score. The validation will fail the build until the real score is recovered; this is accepted and intentional.
- Possible walkovers (12-0 12-0) are counted as regular wins for now.

## Testing Decisions

- Good tests exercise external behaviour through the module's public function with in-memory fixtures (small synthetic tournaments and player records), not internal helpers. Fixtures use invented names and ids, never real player data.
- **Seam 1 (main, new): player statistics function.** Covers titles, runner-ups, finals, semis, match/set counts, distinct title partners, category in effect on a date, mid-year promotion split, lower-category players marked and unranked, players without category excluded from the table, and table ordering. Prior art: the existing standings, resolver and set-parsing domain tests.
- **Seam 2 (existing, extended): archive validation via the freeze tests.** Covers missing score, missing final, unmatched name (with name/pair/row in the error), normalised matching (accents, case, spaces), and playing below official category. The build calls the same function, so it needs no separate test.
- **Seam 3 (existing): tournament diagnostics tests.** Covers unmatched live names as warnings, three-consecutive-titles promotion warning, and missing category/position listing.
- Pages are not tested directly; they only render data produced by seam 1.

## Out of Scope

- Official federation points table and a points-based ranking.
- Enforcing the "at most two tournaments per year in the immediately higher category" rule.
- An importer for the federation's yearly list.
- Migrating the registry to Firebase or any cloud database.
- Hiding a player's profile (privacy opt-out flag).
- Free date-range filtering.
- Explicit walkover flag on matches.
- Statistics for the live, in-progress tournament.

## Further Notes

- Only three archived tournaments exist today (Clausura 2026 at Regatas, Gimnasia y Esgrima and Club Social Maipú), all with the same four categories. Filters will therefore be hidden at launch.
- The initial registry has roughly 20–30 players; positions will be loaded as provisional by the organizer until the federation list arrives.
- Audience is mostly older adults on mobile: explicit text labels, no hover-only or icon-only information.
- Several families share surnames, so matching must always use the full name, never the surname alone.
