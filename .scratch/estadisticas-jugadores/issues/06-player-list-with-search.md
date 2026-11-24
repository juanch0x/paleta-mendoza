# 06: Player list with search

**What to build:** A visitor can open the players page, see every player in the registry, type part of a name to find someone, and open that player's profile.

**Blocked by:** 03 (Player registry and minimal player profile)

**Status:** resolved

- [x] Players page lists all registry players by official name
- [x] A labeled search box filters the list, ignoring accents and case
- [x] Each entry links to the player's profile
- [x] Works on mobile with large, explicit controls

## Comments

Resolved in 09da40b, b4b3f0c. `filterPlayers` in `src/domain/player-search.ts`; page `src/pages/jugadores/index.astro`. No nav entry yet (ticket 09).
