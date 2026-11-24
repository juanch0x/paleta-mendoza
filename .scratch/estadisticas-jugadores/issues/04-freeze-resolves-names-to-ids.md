# 04: Freeze resolves sheet names to player ids

**What to build:** When the organizer archives a new tournament, every player name in the sheet is matched to a registry player ignoring accents, case and extra spaces, and the archive is written with player ids. If a name cannot be matched, the freeze fails and reports the name, the pair and the sheet row so it can be fixed at the source. During a live tournament, unmatched names do not break anything: they appear as warnings in the diagnostics page.

**Blocked by:** 02 (Archive integrity check), 03 (Player registry and minimal player profile)

**Status:** resolved

- [x] Freeze matches names with accent, case and whitespace normalisation, always on the full name
- [x] An unmatched name fails the freeze with name, pair and sheet row in the message
- [x] Unknown player ids in an archive fail the shared archive validation
- [x] Diagnostics page lists unmatched names of the live tournament as non-blocking warnings
- [x] Covered through freeze tests and tournament diagnostics tests

## Comments

Resolved in 15a2728, 27113bb (merge e64c9b1). Matching: `createPlayerMatcher`/`normalizePlayerName` in `src/domain/player-names.ts`. `freezeTournament(metadata, parejasCsv, partidosCsv, players)`; `validateArchive(tournament, { players })`, rules `(tournament, context) => string[]`. `diagnoseTournamentSheets(grids, checkedAt?, { players })` returns non-blocking `warnings`. Production diagnostics read `/jugadores/registro.json` via Cloudflare `env.ASSETS` (unverified in deploy).
