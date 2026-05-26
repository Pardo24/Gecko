# Gecko stack — architecture

## Why three configurators

Each *arr service has its own quirks and Sonarr v4 / Radarr v5 broke the
schemas that older config tools (Buildarr) understand. No single tool covers
everything, so Gecko uses three, each doing what it does best:

| Tool          | Handles                                            | Why this one |
|---------------|----------------------------------------------------|--------------|
| **Recyclarr** | Quality definitions, quality profiles, custom formats (TRaSH Guides) | Officially tracks Sonarr v4 / Radarr v5; idempotent |
| **Buildarr**  | Prowlarr settings, sync profiles                   | Only plugin still aligned with current API (`buildarr-prowlarr`) |
| **gecko-init**| Root folders, qBittorrent download client, Prowlarr→app links, Bazarr↔*arrs, Jellyseerr setup | Custom Python; the bits no off-the-shelf tool covers reliably |

Anything else (Jellyfin wizard, qBittorrent first-boot password) stays in
`src/autoSetup.ts` because there's no container that can do them from inside
the network — they need the host-side container shell access.

## Boot order

1. `docker compose up -d` — Jellyfin / *arrs / qBit / Gluetun start.
2. Gecko (Electron) runs `configureJellyfin()` and `configureQbit()` over HTTP.
3. Gecko reads API keys from each *arr's auto-generated `config.xml` and
   writes them to `.env`.
4. Gecko runs `docker compose --profile init up gecko-init` — a one-shot
   Python container that talks to every service inside `media_net` and wires
   them all together.
5. Gecko runs `docker compose exec recyclarr recyclarr sync` to apply the
   TRaSH-Guides quality profiles.
6. Buildarr runs on its own schedule (default: weekly) — no Gecko involvement.

## Adding a new service

If the new service has REST API auth that supports inter-service config
(token + endpoint), extend `gecko-init/init.py`. If it only supports `.yml`
based config (no API), prefer mounting that config from `stack/<service>/`
directly into the container.

Do **not** add new flows to `autoSetup.ts` — the goal is to keep the TS
host-side code as small as possible. Container-side configurators are easier
to test, easier to debug (logs go to `docker logs media_gecko_init`), and
portable across CasaOS / Umbrel-like environments if Gecko ever ships there.

## Compatibility notes

- `buildarr-sonarr` 0.6.4 and `buildarr-radarr` 0.2.6 only work with Sonarr
  v3 and Radarr v4. They throw `KeyError: 'preferred'` and
  `colonReplacementFormat` validation errors against current images.
  Re-enable them only if upstream ships v4/v5-compatible releases.
- Recyclarr v8+ renamed `quality_profiles` (under `custom_formats`) to
  `assign_scores_to`. Older YAML in the wild will fail validation.
- gecko-init expects `media_*` container hostnames (defined in
  `docker-compose.yml`). If you rename them, update the env vars in the
  `gecko-init` service block.
