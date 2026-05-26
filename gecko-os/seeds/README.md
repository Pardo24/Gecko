# Seeds

Pre-built service configurations copied into Docker volumes on first boot.
See `../docs/SEEDS_PLAN.md` for the strategy.

Stage 0: this directory is empty. Stage 3 fills it with:
- `sonarr/seed.sql` + `sonarr/config.xml`
- `radarr/seed.sql` + `radarr/config.xml`
- `lidarr/seed.sql` + `lidarr/config.xml`
- `prowlarr/config.xml` + `prowlarr/seed.sql` (sync profile only — no indexers)
- `bazarr/bazarr.db` + `bazarr/config.yaml`
- `jellyseerr/settings.json.template`

Each seed has a regeneration script under `../scripts/` so they can be rebuilt
when upstream schemas change.
