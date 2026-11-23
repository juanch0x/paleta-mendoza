# 02: Archive integrity check fails freeze and build

**What to build:** An archived tournament can never be incomplete. A single shared validation runs both when freezing a tournament and during the site build. It fails when any archived match has no score or when a category has no final, and the error names the tournament and the match or category at fault. The live, in-progress tournament is never validated this way.

**Blocked by:** 01 (Recover the missing score of Regatas match 23), so the build stays green when this lands

**Status:** ready-for-agent

- [ ] One validation function is used by both the freeze step and the build
- [ ] A match without sets fails validation, naming tournament and match
- [ ] A category without a final fails validation, naming tournament and category
- [ ] The three current archives pass validation
- [ ] The build fails when an archive is deliberately broken
- [ ] Covered through the existing freeze tests
