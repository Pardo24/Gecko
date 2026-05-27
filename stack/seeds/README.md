# Stack seeds

Pre-built service configuration that gets copied into Docker config volumes
**before** `docker compose up` on first install. Eliminates the runtime API
configuration steps that are fragile or impossible (e.g. Bazarr language
profiles, where the API is GET-only).

## Layout

```
stack/seeds/
├── bazarr/
│   └── bazarr.db        ← SQLite with 15 language profiles pre-inserted
│                          ("English only" + each of cat/spa/fre/ger/por/ita/jpn
│                          × {alone, +english}). Regen: `node ../build-bazarr-seed.mjs`.
├── jellyseerr/
│   └── settings.json    ← Initialized config with __API_KEY__ placeholders
│                          that gecko-init substitutes at first boot
└── _meta/
    └── versions.txt     ← Image tags each seed was generated against
                          (regenerate seed when the image bumps)
```

## How it's used

The Electron `/api/install` and Gecko OS first-boot install both run:

```bash
# 1. Pre-create the Docker volumes
docker volume create bazarr_config jellyseerr_config

# 2. Copy seed contents into each volume via a temp container
for svc in bazarr jellyseerr; do
  docker run --rm \
    -v ${svc}_config:/dest \
    -v $(pwd)/seeds/${svc}:/src:ro \
    alpine sh -c 'cp -an /src/. /dest/'
done

# 3. Now compose up — volumes already have the seed config
docker compose up -d
```

The `cp -an` (archive, no-clobber) means existing files inside the volume are
NOT overwritten. So if the user has run before and the volumes already have
real configs, a re-install doesn't wipe them.

## Why no Sonarr/Radarr/Lidarr/Prowlarr seeds yet

Their APIs cover everything we need at runtime:

- Quality profiles + custom formats → Recyclarr container does this after boot
- Root folders, tags, download clients → gecko-init.py via API
- Branding (instance name, log level, theme) → could be seeded but pure
  cosmetic; skipped for v1 to keep the seed maintenance burden small

Will add when the maintenance pain justifies it (e.g. if Recyclarr can't keep
up with TRaSH-Guides changes).

## Regeneration

Each seed has a regen script in `gecko-os/scripts/regen-<service>-seed.sh`.
Re-run when:

- The service image tag changes (check `_meta/versions.txt`)
- A new field needs to be added to the seed
- A schema migration happens upstream
