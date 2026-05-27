# What the user configures (wizard) — and what they don't

This document is the **single source of truth** for the user-facing setup
experience. If something is in this document, the wizard exposes it. If
something is in §"What is preconfigured", the user never sees it — it's
already correct out of the box.

The wizard targets a non-technical buyer: someone who can plug an HDMI cable
into a TV and follow a few clear screens, but does not know what an "API
key", "indexer", or "quality profile" is. Wizard inputs must be answerable
from common knowledge.

---

## The complete list of wizard steps

| # | Step | What the user does | Hard requirement? |
|---|------|--------------------|-------------------|
| 1 | **Language** | tap CA / ES / EN | yes |
| 2 | **Network** | "ethernet (cable)" — auto-detected by DHCP, no input; OR "WiFi: pick SSID + type password" | yes |
| 3 | **Admin password** | type once (8+ chars). Single password used for Jellyfin admin, qBittorrent, dashboard auth | yes |
| 4 | **Storage** | pick from a visual list of disks (size + label shown). If only 1 disk → preselected. | yes |
| 5 | **VPN (optional)** | "Use VPN: yes / no". If yes → paste Mullvad WireGuard key + addresses (we explain what to copy from where) | no — can skip and add later |
| 6 | **Install to internal disk** | "Stay on USB" / "Install to internal disk (recommended)". Internal install means the USB can be removed; the device boots from its own storage. | no — defaults to internal install |

Total wizard time: ~3 minutes if the user knows what they're typing.

### Non-goals (will NOT add to the wizard)

- Choosing which media services to install (always: full Jellyfin + Sonarr + Radarr + Lidarr + Prowlarr + Bazarr + Jellyseerr stack)
- Choosing service ports
- Choosing quality profiles, custom formats, log levels
- Choosing subtitle providers
- Choosing image/CDN regions
- Anything involving API keys
- Anything involving "trackers", "indexers", "feeds", or "categories"

These are all preconfigured (see below) or deliberately deferred to the dashboard.

---

## What is preconfigured (no user input ever)

### Quality profiles

| Service | Profile name | Source |
|---------|--------------|--------|
| Sonarr | "Gecko HD WEB+Bluray" | TRaSH Guides via Recyclarr seed |
| Radarr | "Gecko HD WEB+Bluray" | TRaSH Guides via Recyclarr seed |
| Lidarr | "Gecko Standard" | Lidarr default + scoring tweaks |

### Custom formats (negative scores — block these)

- CAM rips
- Telecine
- Hardcoded subtitles
- Low-quality VP9/AV1 (TRaSH-Guides standard)

### Subtitle profiles in Bazarr (preseeded as 3 ready-to-use profiles)

- "Català + English" → `cat, eng`
- "Castellano + English" → `spa, eng`
- "English only" → `eng`

The Language step (#1) of the wizard sets which one becomes the default
for movies + series.

### Subtitle providers enabled in Bazarr

- OpenSubtitles (free, no account required to start)
- Podnapisi
- TVSubtitles
- Addic7ed

User can add credentials for premium providers later via Bazarr UI.

### Tags + branding

- `gecko-managed` tag on all auto-created entities (root folder, download client, etc.) — makes Gecko-related items distinguishable from things the user adds manually
- `Gecko Jellyfin`, `Gecko Sonarr`, etc. as service instance names (better than the default `Sonarr`)

### Log levels

All services set to `info` (default is often `debug`, too noisy on flash storage that has limited write endurance).

### Auto-updates

- Container images: weekly `docker compose pull` via gecko-update.service
- TRaSH Guides: weekly Recyclarr sync
- Host OS: unattended-upgrades for security patches only

### Network ports (external)

| Service | Port |
|---------|------|
| Jellyfin | 8096 |
| Jellyseerr | 5055 |
| Prowlarr | 9696 |
| Radarr | 7878 |
| Sonarr | 8989 |
| Lidarr | 8686 |
| Bazarr | 6767 |
| qBittorrent WebUI | 8090 |
| Gecko dashboard | 80 (redirects to the kiosk UI on the same device) |

Internal ports (inside the Docker network) are different — user doesn't see them.

### API keys + cross-service connections

All auto-generated on first boot by gecko-init. Never exposed to the user.

---

## What is empty by default (user can configure later in the dashboard)

### Prowlarr indexers — **legal line**

Prowlarr ships with **zero indexers** configured. The user must add their own
in the dashboard or via Prowlarr's web UI. This is deliberate:

- Bundling configured public/private trackers crosses into "circumvention
  tool distribution" in EU/UK case law (see Dragon Box, Kodi-build sellers).
- We're shipping a *self-hostable media server*, not a *piracy box*. The user
  decides what content sources to add, exactly as with Plex+arr.

The wizard does NOT prompt for indexer URLs. The dashboard has a guided
PageGuia explaining how to add indexers (the existing one in the Electron
track applies as-is).

### Additional Jellyfin users

Wizard creates only the admin. Adding family members happens later via the
native Jellyfin UI, which the user discovers from the dashboard's "Open
Jellyfin" button.

### Storage management policies

The Space Manager (already implemented) lets the user browse and delete
media by size from the dashboard home. No automatic deletion is configured
by default.

---

## What the user does NOT do via Gecko (use the native UI of each service)

- Mark a movie/series as "monitored" / "unmonitored" → Sonarr/Radarr UI
- Request a movie/series as a family member → Jellyseerr
- Tune Jellyfin transcoding settings → Jellyfin admin dashboard
- Search/download a specific subtitle for a single episode → Bazarr UI

Each service is accessible from the dashboard via a button. We don't
re-wrap their UIs; we orchestrate the install and provide a single landing
page.

---

## How this list constrains development

When proposing a new feature:

1. **Wizard addition?** Refuses by default — adds a step a non-technical
   user has to understand. Needs an explicit problem statement.
2. **Preconfigured addition?** Welcome — burden is on us to test the seed
   stays valid across upstream releases.
3. **Dashboard addition?** Welcome — visible only to users who go
   looking, no first-boot friction.

If a config dial *must* exist (e.g., GPU transcoding on/off), it goes in the
dashboard, not the wizard. Default it to the right value and add a
"Reinstal·lar" path if the default doesn't work for a given hardware.
