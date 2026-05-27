# Gecko 🦎

**Your private Netflix at home.** Plug a USB stick into a mini PC, follow a
3-minute wizard, and you have your own streaming server on the TV. No
technical skills needed.

Two ways to install:

- **Gecko OS** — bootable USB image. Flash, boot a spare PC, done.
  *(The recommended path for non-technical users.)*
- **Desktop installer** — Windows + macOS native installer that runs Gecko
  as a background service. Best if you want it on an existing PC.

Both share the same web UI and the same Docker stack.

---

## What you get

A complete media stack, pre-wired:

| Service | Purpose |
|---|---|
| [Jellyfin](https://jellyfin.org) | Media server — stream movies, series, music |
| [Radarr](https://radarr.video) | Movie automation |
| [Sonarr](https://sonarr.tv) | Series automation |
| [Lidarr](https://lidarr.audio) | Music automation |
| [Prowlarr](https://prowlarr.com) | Indexer manager (you add your own — see legal note below) |
| [qBittorrent](https://qbittorrent.org) | Download client |
| [Bazarr](https://bazarr.media) | Subtitle manager — 3 language profiles pre-built |
| [Jellyseerr](https://github.com/seerr-team/seerr) | Media request portal |
| [Gluetun](https://github.com/qdm12/gluetun) + autoheal | WireGuard VPN tunnel (ProtonVPN, Mullvad, or any of ~30 providers). Auto-recovers when the tunnel drops |

Everything but indexers comes pre-configured.

---

## Quick start

### Gecko OS (recommended)

1. Download `gecko-os.img.xz` from [Releases](https://github.com/Pardo24/Gecko/releases/latest)
2. Flash to a USB stick with [Etcher](https://etcher.balena.io/)
3. Plug into a mini-PC, plug HDMI to your TV, power on
4. Follow the wizard (3 minutes)

### Desktop installer

Windows: download `Gecko-Setup-x64.exe` (~25 MB), run, follow the install
wizard. Gecko runs as a Windows service. Open the Start Menu → "Gecko" to
launch the UI in your browser.

macOS: download `Gecko-arm64.pkg` (Apple Silicon) or `Gecko-x86_64.pkg`
(Intel), open, accept the admin prompt. Open <http://localhost:3000>.

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/)
on Windows/macOS.

---

## Hardware

Minimum for a smooth experience:
- 4-core x86_64 CPU (Intel N100 or better)
- 4 GB RAM (8 GB if you'll enable optional features)
- 100 GB free storage for media
- HDMI output if you want kiosk mode on a TV

Tested mini-PCs (links pending — being audited per region in roadmap Phase 1):
- Beelink S12 Pro — N100, 16 GB RAM, ~€130 EU
- GMKtec NucBox — N97, 16 GB RAM, ~€110 EU

NOT recommended:
- Raspberry Pi 3 or any ARM with < 4 GB RAM (transcoding suffers)
- Anything with an Intel Atom CPU older than 2018

---

## Privacy + legal

Gecko ships with **no indexers configured**. We're a media server, not a
content source. Users add their own indexers — public, private, or Usenet —
exactly as they would with vanilla Prowlarr. The same legal rules that
apply to any *arr stack apply here.

We collect no telemetry, no analytics. Your installation is yours.

---

## Development

Requires Node 20 and Docker.

```bash
npm install

# Dev mode — Vite hot-reload + tsx watch in parallel
npm run start:dev

# Production server (after build)
npm run build
npm run start

# Lint
npm run lint

# Build the Windows installer (must run on Windows with NSIS installed)
npm run build:installer:win

# Build Gecko OS image (must run on Linux, see gecko-os/build.sh)
sudo gecko-os/build.sh
```

**Stack:** React 19 · TypeScript · Vite 5 · Tailwind 4 · Express · esbuild

The architecture is one server (`src/server.ts`) and one React bundle
(`src/`). Native installers wrap them as platform services. See
`gecko-os/docs/DESKTOP_STACK_DECISION.md` for why we ditched Electron.

---

## Support

If Gecko saves you time, consider buying me a coffee ☕

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-danipardo24-teal?logo=buy-me-a-coffee)](https://buymeacoffee.com/danipardo24)

---

## License

MIT © [Dani Pardo](https://github.com/Pardo24/Gecko)
