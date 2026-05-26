# Seeds plan — what each service's pre-seeded config contains

The seeds live under `gecko-os/seeds/<service>/`. At image-build time, `build.sh`
copies them to `/opt/gecko/seeds/<service>/` in the rootfs. On first boot,
before Docker starts the services, an init script copies each seed into the
corresponding service's `/config` Docker volume.

This means: when Sonarr/Radarr/Bazarr/Prowlarr/Jellyseerr first start, they
already have profiles, settings, quality formats, etc. configured. The runtime
`gecko-init` Python container only handles things that genuinely need the
runtime API (cross-service API key wiring, root folder creation tied to the
user-chosen data path).

## What we seed per service

### Sonarr / Radarr / Lidarr — `config.xml`

Path inside container: `/config/config.xml`

Contents to seed:
- `<LogLevel>info</LogLevel>` (default is debug — too noisy on USB storage)
- `<UpdateAutomatically>False</UpdateAutomatically>` — we control updates via
  the image
- `<Branch>main</Branch>`
- `<AnalyticsEnabled>False</AnalyticsEnabled>` — no phone-home from a sealed
  appliance
- `<Theme>auto</Theme>`
- `<InstanceName>Gecko Sonarr</InstanceName>` (and equivalents) — friendlier
  than the default "Sonarr"

**API key**: deliberately NOT seeded. Each service generates a fresh key on
first run, which `gecko-init.py` reads from `config.xml` and propagates to
`.env` for the other services to use. Seeding a fixed key would make every
shipped appliance share the same auth — terrible security.

**Quality profiles + custom formats**: seeded into the SQLite (`sonarr.db` /
`radarr.db` / `lidarr.db`) — see below.

### Sonarr / Radarr SQLite — `sonarr.db` / `radarr.db`

Path: `/config/sonarr.db` (or `radarr.db`, `lidarr.db`)

We don't ship the raw DB. Instead we ship an SQL script per service
(`seeds/sonarr/seed.sql`, etc.) that runs against the empty DB the service
creates on first boot. Reasons:
- DB schema changes between versions; a fixed snapshot rots fast
- SQL is reviewable in git diffs; binary blobs aren't
- The seed script is idempotent (uses `INSERT OR IGNORE`)

**What goes in `seed.sql`:**
- Default quality profiles: "Gecko HD-1080p" (Sonarr/Radarr) /
  "Gecko Standard" (Lidarr) with sensible TRaSH-Guides aligned cutoffs
- Custom formats blocking CAM / Telecine / HardSubs
- Format-to-profile score assignments
- Tags: `gecko-managed`, `auto-update`

Regeneration: a separate script `scripts/dump-seed-sql.sh` runs Sonarr/Radarr/
Lidarr in a throwaway container, configures them via API to the desired state,
then dumps the rows we care about to SQL. Re-run when upstream changes.

### Bazarr — `bazarr.db` (SQLite) + `config.yaml`

Path: `/config/db/bazarr.db` + `/config/config/config.yaml`

`bazarr.db` is where language profiles live (the bit we couldn't create via API
in the Electron track). We seed it with **three pre-built profiles**:
- "Català + English" — `cat, eng`
- "Castellano + English" — `spa, eng`
- "English only" — `eng`

The wizard's language step picks which one becomes the default for movies and
series. No runtime profile creation needed.

`config.yaml` is seeded with:
- Subtitle providers enabled by default: `opensubtitles, podnapisi, tvsubtitles, addic7ed`
- Encoding: `utf-8`
- Log level: `INFO`
- Bazarr's API key: NOT seeded (similar reasoning as Sonarr/Radarr)

Regeneration: `scripts/regen-bazarr-seed.sh` boots a clean Bazarr, configures
the three profiles via UI automation (Playwright headless), and exports the DB.
Re-run when Bazarr's schema changes.

### Prowlarr — `config.xml` + `prowlarr.db`

Path: `/config/config.xml` + `/config/prowlarr.db`

`config.xml`: same minimal settings as Sonarr/Radarr (log level, theme,
auto-update off, analytics off, instance name).

`prowlarr.db`: **deliberately empty** of indexers. This is the legal line —
shipping with pre-configured public/private indexers can be interpreted as
distribution of infringement tools. The user adds their own via the UI on
first visit. We DO seed:
- A `gecko-default` sync profile (enableRss, enableInteractiveSearch,
  enableAutomaticSearch all true, minSeeders=1)
- Tags `gecko-managed`

### Jellyseerr — first-run skip

Jellyseerr's first-run wizard checks an `INITIALIZED` flag in its config. If
we seed `settings.json` with `initialized: true` plus the connection settings
to Sonarr/Radarr (filled in at first boot via the API keys read by
gecko-init), we skip the wizard entirely.

Path: `/app/config/settings.json` — for the seerr-team fork specifically.

What we seed (with placeholders the first-boot script substitutes):
```json
{
  "main": { "mediaServerType": 2, "mediaServerLogin": true },
  "jellyfin": { "name": "Gecko Jellyfin", "ip": "media_jellyfin", "port": 8096, "useSsl": false },
  "radarr": [{ "name": "Radarr", "hostname": "media_radarr", "port": 7878, "apiKey": "__RADARR_API_KEY__", "isDefault": true, "rootFolder": "/movies" }],
  "sonarr": [{ "name": "Sonarr", "hostname": "media_sonarr", "port": 8989, "apiKey": "__SONARR_API_KEY__", "isDefault": true, "rootFolder": "/tv" }]
}
```

The `__RADARR_API_KEY__` and `__SONARR_API_KEY__` markers get filled in by
`gecko-init.py` after reading the keys from each *arr's `config.xml`.

### Jellyfin — first-run skip (TBD)

Jellyfin's first-run wizard is the trickiest to skip — the wizard mutates many
files. The current Electron track uses HTTP API calls in `autoSetup.ts`. For
Gecko OS we can either:
1. Keep doing it via HTTP API (works, but slow and racy)
2. Seed `/config/data/jellyfin.db` with a pre-created admin user (clean but
   schema-fragile)

**Decision pending.** Option 1 is the safe default; option 2 is the optimal
end state.

## What's NOT seeded

- Indexers (legal reasons — see Prowlarr)
- Media content
- Credentials for any third-party service (Mullvad, Plex token, etc.)
- API keys for any *arr (would defeat security)

## Pipeline for seed maintenance

When upstream releases break a seed:

```bash
cd gecko-os
./scripts/regen-seeds.sh sonarr      # boots Sonarr, configures, dumps SQL
./scripts/regen-seeds.sh bazarr      # same for Bazarr via Playwright
git diff seeds/
# Review, test build, ship a new image release
```

This script doesn't exist yet — it's a Stage 3 deliverable. For Stage 1 and 2
we hand-write the seeds, validate against a real install, then automate.
