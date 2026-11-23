# 03: Player registry and minimal player profile

**What to build:** The tracer bullet. A visitor can open a player's profile page and see how many titles and runner-up finishes that player has across archived tournaments. Behind it: a player registry (one record per player with stable id and official name, validated by schema), generated from the three archived tournaments with the 13 accent-variant names unified into one player each; archived tournaments reference pair members by player id; a thin data-access interface for players and archived tournaments backed by JSON; and the pure player-statistics function returning titles and runner-ups (derived from each category's final).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Player registry exists as one schema-validated record per player; an invalid record fails the build naming the record
- [ ] Every player in the three archives has exactly one registry record; accent variants are unified
- [ ] Archived tournaments store player ids for both members of every pair; existing tournament pages still render unchanged
- [ ] Statistics are read through repository interfaces, not directly from files
- [ ] Player statistics function returns titles and runner-ups per player; tested with synthetic fixtures (no real player data)
- [ ] The player profile page is statically generated per player and shows titles and runner-ups
- [ ] Only archived tournaments are counted, never the active one
