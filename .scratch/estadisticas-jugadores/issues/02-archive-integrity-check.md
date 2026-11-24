# 02: Archive integrity check fails freeze and build

**What to build:** An archived tournament can never be incomplete. A single shared validation runs both when freezing a tournament and during the site build. It fails when any archived match has no score or when a category has no final, and the error names the tournament and the match or category at fault. The live, in-progress tournament is never validated this way.

**Blocked by:** 01 (Recover the missing score of Regatas match 23), so the build stays green when this lands

**Status:** resolved

- [x] One validation function is used by both the freeze step and the build
- [x] A match without sets fails validation, naming tournament and match
- [x] A category without a final fails validation, naming tournament and category
- [x] The three current archives pass validation
- [x] The build fails when an archive is deliberately broken
- [x] Covered through the existing freeze tests

## Comments

Resolved in bd86659: `validateArchive` in `src/data/archive-validation.ts`, used by `freeze.ts` and by `loadRegisteredArchives` in `src/data/archives.ts`. New rules are appended to `archiveRules`.
