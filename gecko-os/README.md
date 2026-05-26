# Gecko OS

Bootable Linux image that turns any x86_64 mini PC into a plug-and-play Gecko
media server. Flash to USB, boot, configure once, done.

## Why this exists

The Electron installer (in the parent repo) covers the "I have a Windows PC and
want Gecko on it" case. Gecko OS covers the "I want a dedicated appliance
without picking the OS, the partitioning, or the Docker setup" case — which is
most non-technical users.

## Architecture

```
USB stick (boot media)              Mini PC (target hardware)
─────────────────────────────       ────────────────────────────
gecko-os.img (~4 GB)         ──>    First boot: wizard collects
  ├── ESP (boot)                      WiFi, password, lang, data path
  ├── rootfs (Debian 12 + Docker)
  └── Gecko stack pre-seeded         Optionally: dd image to internal
                                       disk, eject USB, autoboot from disk
```

**Key principle: ship configured.** Sonarr, Radarr, Bazarr, Prowlarr and
Jellyseerr all read their settings from SQLite/XML on first run. We pre-seed
those files in the image so the appliance arrives with quality profiles,
language profiles, tags, log levels, etc. already set. The first-boot wizard
only fills in user-specific bits (admin password, paths, WiFi creds).

This avoids the API-config friction we hit in the Electron track (Bazarr
language profiles, Lidarr root folder quirks, Jellyseerr fork API drift).
We control the on-disk schema; we don't depend on the runtime API surface.

## Layout

```
gecko-os/
├── README.md               ← this file
├── build.sh                ← main image builder (run on Linux or WSL2)
├── packages.list           ← apt packages installed in chroot
├── overlay/                ← files copied verbatim into the rootfs
│   ├── etc/systemd/system/  ← gecko-first-boot.service, kiosk.service
│   ├── opt/gecko/          ← first-boot scripts, Electron kiosk app
│   └── usr/local/bin/      ← helper CLIs (gecko-update, etc.)
├── seeds/                  ← pre-seeded service configs (SQLite, XML, YAML)
│   ├── sonarr/config.xml
│   ├── radarr/config.xml
│   ├── bazarr/bazarr.db
│   ├── prowlarr/config.xml
│   └── recyclarr/          ← already-synced quality profile snapshot
├── docs/
│   ├── KIOSK_PLAN.md       ← Electron changes needed for kiosk mode
│   ├── SEEDS_PLAN.md       ← what each seed file contains and how to regenerate
│   └── BOOT_FLOW.md        ← what happens between power-on and Gecko being ready
└── dist/                   ← build output (gitignored)
    └── gecko-os.img
```

## Build requirements

- Linux host (WSL2 on Windows works; CI uses Ubuntu)
- `debootstrap`, `qemu-utils`, `grub-pc-bin`, `grub-efi-amd64-bin`, `dosfstools`
- Root (`sudo`) — required for loop mounts and chroot
- ~10 GB free disk
- ~15 minutes per build

## Quick start

```bash
# On WSL2 / Linux:
sudo apt install debootstrap qemu-utils grub-pc-bin grub-efi-amd64-bin dosfstools
cd gecko-os
sudo ./build.sh
# Output: dist/gecko-os.img — flash to USB with Etcher / Rufus / dd
```

## Status

**Stage 0 — scaffolding** (current). Building the bones: dir structure,
README, build.sh skeleton, seeding plan, kiosk changes plan.

**Stage 1 — boots to wizard.** First milestone: image boots on a real mini PC,
kiosk Chromium opens the wizard. No Docker yet, no seeds, just the OS skeleton.

**Stage 2 — Docker stack runs.** After wizard collects config, stack comes up
and the dashboard renders. Same UX as the Electron version.

**Stage 3 — seeded configs.** Sonarr/Radarr/etc. boot already configured;
gecko-init is reduced to API-key wiring only.

**Stage 4 — install-to-disk + auto-update.** Wizard offers to `dd` itself to
internal storage so the USB can be removed.

See `docs/BOOT_FLOW.md` for the full target behavior.
