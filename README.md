# Paleta Mendoza

Tournament fixtures, standings, playoffs, and news for Federación de Paleta de Mendoza.

The site is deliberately simple to operate: the current tournament is read from a
Google Sheet, while finished tournaments are stored as versioned JSON files in this
repository. There is no database and no custom admin panel.

## Quick path: run the site locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:4321`. Before publishing code changes, run:

```bash
pnpm test
pnpm build
```

## How tournament data works

| Tournament state | Source | Purpose |
| --- | --- | --- |
| Active | Google Sheets CSV URLs | Editable from a phone during the tournament |
| Archived | `src/data/torneos/archivos/*.json` | Immutable historical record |

Only one tournament should be active at a time. The site never synchronizes the
same tournament between a Sheet and JSON: when it ends, it is frozen into JSON.

### Configure the active tournament

1. Create a new tournament spreadsheet by copying the base template.
2. In Google Sheets, set sharing to **Anyone with the link — Viewer**.
3. Copy the two CSV endpoints, one for the `parejas` sheet and one for `partidos`.
   The expected URL format is:

   ```text
   https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/gviz/tq?tqx=out:csv&sheet=parejas
   https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/gviz/tq?tqx=out:csv&sheet=partidos
   ```

4. Put them in `.env`:

   ```dotenv
   PUBLIC_ACTIVE_TOURNAMENT_PAREJAS_CSV_URL="https://docs.google.com/...&sheet=parejas"
   PUBLIC_ACTIVE_TOURNAMENT_PARTIDOS_CSV_URL="https://docs.google.com/...&sheet=partidos"
   PUBLIC_TOURNAMENT_MOCK=false
   ```

5. Keep `.env` for local development only. Configure the same variables in
   Cloudflare Pages under **Settings → Environment variables**, then trigger a new
   deployment. The CSV URLs are public read-only URLs, but the local `.env` file is
   still not committed.

> The public Sheet is the operational panel. Do not put formulas or standings logic
> in it: it contains raw data only, and TypeScript calculates the tournament.

### Daily Sheet workflow

- Add every pair once in `parejas`, using a stable unique ID such as `3B-2`.
- Use pair IDs in `partidos`; the helper columns in the template display names for
  easier score entry.
- Leave `sets` blank while a match is pending. A match with a result is treated as
  played; there is no `estado` column.
- Record withdrawals as `12-0 12-0` directly in `sets`.
- Leave `fecha` blank to hide an unannounced or rescheduled match from the site.
- Use `G:<match-id>` or `P:<match-id>` in a playoff participant cell to reference
  the winner or loser of an earlier match. Plain text labels are allowed before the
  participant is known.

The site accepts incomplete data: pending group games and unresolved playoff
references remain visible without breaking the tournament view.

### Scoring and standings

- Matches are best of three sets.
- Regular sets are played to 12 points; a deciding set is played to 7.
- Zone ranking order is: match difference, set difference, then total-point
  difference.
- There is no head-to-head tiebreaker. If all three differences are equal, pairs
  share the same position.
- Qualification to playoffs is entered manually in the Sheet. The site calculates
  zone tables but does not invent seeding rules between zones.

## Archive a finished tournament

When every scheduled match has its final score, run the freeze command from the
repository root:

```bash
pnpm freeze -- \
  --slug 2026-09 \
  --nombre "Apertura" \
  --fecha "September 2026" \
  --parejas-url "https://docs.google.com/...&sheet=parejas" \
  --partidos-url "https://docs.google.com/...&sheet=partidos"
```

The command downloads both CSV files, validates the full tournament, and writes:

- `src/data/torneos/archivos/<slug>.json`
- an entry in `src/data/torneos/registro.json`

It intentionally fails if a match has no score or a playoff reference cannot be
resolved. Fix the Sheet first; use `--overwrite` only to correct an existing archive.
Then review, commit, and push the generated JSON. Cloudflare Pages publishes the
historical page on the next deployment.

## Publish changes

Cloudflare Pages is connected to the `main` branch. A push to `main` builds and
deploys the site automatically.

Cloudflare Pages configuration:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `pnpm build` |
| Build output directory | `dist` |

This is a static **Pages** project, not a Cloudflare Worker. Do not configure a
`wrangler deploy` command.

## Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local development server |
| `pnpm test` | Run tournament logic tests |
| `pnpm build` | Type-check and build the production site |
| `pnpm preview` | Preview the latest local production build |
| `pnpm freeze -- --help` | Show archive command arguments |
| `pnpm format:check` | Check formatting |
| `pnpm lint` | Run linting |

## Main project locations

| Path | Responsibility |
| --- | --- |
| `src/components/tournament/ActiveTournament.tsx` | Tournament UI, fixture search, zones, and playoffs |
| `src/data/` | CSV parsing, match resolution, standings, and archive validation |
| `src/data/torneos/registro.json` | Index of historical tournaments |
| `src/data/torneos/archivos/` | Frozen tournament snapshots |
| `src/data/blog/` | News and champion posts in Markdown |
| `scripts/freeze.ts` | Command-line archive workflow |
| `.env.example` | Required active-tournament environment variables |

## Before a tournament starts

- [ ] Copy the tournament spreadsheet template.
- [ ] Add categories, zones, pairs, and the initial fixture.
- [ ] Set Google Sheet sharing to anyone-with-link viewer.
- [ ] Set both active CSV URLs in Cloudflare Pages environment variables.
- [ ] Check the live site on a phone.
- [ ] Publish any registration or tournament announcement post.

## After a tournament ends

- [ ] Confirm every match has a final score in the Sheet.
- [ ] Run `pnpm freeze` and inspect the generated JSON diff.
- [ ] Commit and push the archive.
- [ ] Verify the new historical tournament page after deployment.
- [ ] Create the next active tournament spreadsheet.
