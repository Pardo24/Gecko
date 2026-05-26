# Boot flow — power-on to "Gecko ja funciona"

What happens between the user plugging in the USB / powering on the mini PC
and the dashboard rendering on the TV. This is the target end-state; not all
stages are implemented yet (see `README.md` for status).

## Stage 0 — Power on, BIOS hands control to GRUB

The USB has a GPT partition table with an ESP partition; modern UEFI mini PCs
boot it without BIOS config changes. Older BIOS-only machines fall through to
the BIOS GRUB stub installed in MBR (the `i386-pc` target in `build.sh`).

GRUB shows the Gecko boot menu for 2 seconds, then auto-selects Debian + Linux.

## Stage 1 — Kernel + early userspace

Standard Debian boot. systemd targets fire in order:
1. `local-fs.target` — rootfs and ESP mounted
2. `network-online.target` — DHCP grabs an IP (ethernet or WiFi if pre-config)
3. `docker.service` — Docker daemon up
4. `gecko-first-boot.service` — runs once
5. `graphical.target` → `gecko-kiosk.service` — kiosk Chromium

If `/var/lib/gecko/first-boot-done` exists, `gecko-first-boot.service` is
skipped (`ConditionPathExists=!`).

## Stage 2 — First-boot housekeeping

`gecko-first-boot.service` runs `/opt/gecko/first-boot.sh`, which:

1. **Expands the rootfs** to fill the whole USB / disk via `growpart` +
   `resize2fs`. The shipped image is ~4 GB; a 32 GB USB becomes 32 GB of usable
   space.
2. **Regenerates `/etc/machine-id`** — every appliance gets a unique one so
   Avahi (`gecko.local` discovery) doesn't collide.
3. **Seeds the Docker config volumes** by copying `/opt/gecko/seeds/<service>/`
   into the not-yet-created Docker volumes for each service. (Implementation:
   pre-create the volumes via `docker volume create` then mount-and-cp.)
4. **Stages the Docker stack** to `/opt/gecko/userData/stack/` — same path
   Electron uses, so subsequent code paths converge.
5. **Marks done** by `touch`-ing `/var/lib/gecko/first-boot-done`.

## Stage 3 — Wizard kiosk

`gecko-kiosk.service` waits for `localhost:3000` to respond, then opens
Chromium full-screen pointed at `/wizard` (or `/` if a previous wizard run
completed — tracked by `/var/lib/gecko/wizard-done`).

The wizard is the same React tree as today, with one extra step at the
beginning for Gecko OS only:

- **Step -1 (Gecko OS only): WiFi & install location.** Pick a WiFi network
  (or "I'm on ethernet"), choose: stay on USB, or `dd` myself to the internal
  disk (recommended). On choosing "internal disk", the wizard:
  - Lists block devices via `lsblk -J`
  - Asks user to confirm the target (with a clear warning that it wipes the disk)
  - On confirm, runs `dd if=/dev/sdX of=/dev/nvme0n1 bs=4M status=progress`
    where `sdX` is the USB and `nvme0n1` is the chosen disk
  - Reboots; subsequent boots come from the internal disk
- **Steps 0..7**: identical to the existing Electron wizard (data folder,
  admin password, subtitle language, VPN, install).

## Stage 4 — Stack provisioning

Step 2 of the wizard ("Pull + start containers") runs `docker compose up -d`.
Pre-seeded configs mean Sonarr/Radarr/Bazarr/Prowlarr/Jellyseerr boot already
configured. The `gecko-init` Python container then:

- Reads API keys from each *arr's `config.xml` (auto-generated on first run)
- Writes them to `.env`
- Substitutes them into the seeded Jellyseerr `settings.json`
- Creates root folders (paths are user-specific from wizard input)
- Wires the qBittorrent download client
- Triggers Prowlarr → *arr app sync
- Configures Bazarr ↔ Sonarr/Radarr connections

Bazarr language profiles? **Already seeded** — the wizard's language choice
just toggles which one is default via `/api/system/settings`.

## Stage 5 — Done

Chromium redirects to `/` (dashboard). The user sees the Gecko home screen on
their TV. Done in ~5-8 minutes from power-on for a fresh boot, ~30 seconds for
subsequent boots.

## What happens if step 4 or earlier fails

The wizard's existing per-step failure handling (`failedSteps[]`, the warning
screen with manual-setup hints) applies. The user sees what failed and can
fix it via the dashboard's Settings → Reinstall, or via the service's web UI
directly (reachable from the dashboard).

For Gecko OS specifically, an additional escape hatch: the kiosk supports a
debug-shortcut (e.g. Ctrl+Alt+F2) to drop to a TTY for advanced users. Most
users won't need it.
