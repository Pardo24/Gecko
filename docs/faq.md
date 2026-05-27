# FAQ — Gecko

The questions we hear most, with honest answers. If yours isn't here,
ask via [GitHub issues](https://github.com/Pardo24/Gecko/issues) and
we'll add it.

---

## What Gecko is

### Is this legal?

**Yes**, the way Gecko ships out of the box. We're a self-hostable
media server, the same category as Plex, Jellyfin, or vanilla Sonarr
+ Radarr. Gecko ships with **zero indexers configured** — you add
your own. The legal status of your home media library is identical to
the legal status of running Plex.

What you do with the indexers is your call. We don't track and don't
care.

### Is this just Plex / Jellyfin with extra steps?

It's a packaged, opinionated bundle:
- Jellyfin (the player)
- Sonarr / Radarr / Lidarr (the automators)
- Prowlarr (the indexer hub)
- Bazarr (the subtitle hunter)
- qBittorrent (the downloader)
- Jellyseerr (the family request portal)
- Gluetun (VPN tunnel, optional)
- A watchdog that fixes VPN dropouts

…all pre-wired, with TRaSH-Guides quality profiles applied, three
language subtitle profiles pre-built, and an installer that does the
whole thing in 5 minutes instead of a weekend.

You could roll it yourself. Gecko exists because rolling it yourself
takes 4-12 hours of reading guides; we did that for you once, then
froze it.

### Is it free?

**Yes, forever.** MIT licensed, all source on GitHub. No premium
tier, no subscription, no in-app purchases. If you buy a Gecko USB
from us (around €35), you're paying for the time it took to flash and
ship it — the software is the same as the free download.

### What does it cost to run?

- Electricity for the mini-PC: ~€10-30/year for an N100-class device.
- Optional VPN subscription: ~€5/month for Mullvad. Optional but
  recommended if you're downloading via torrent.
- Internet: whatever you already pay.

That's it.

---

## Hardware

### Can I run it on a Raspberry Pi?

- **Pi 3**: no — only 1 GB RAM, no hardware HEVC decode, USB-2 is
  too slow for media I/O. You'd be fighting it constantly.
- **Pi 4 (4 GB+)**: technically works, but ARM Docker support is
  rough for some of our containers, and HEVC transcoding is weak.
  Workable for direct-play to a smart TV, painful for transcoding.
- **Pi 5**: same caveats as Pi 4. We don't actively support ARM in
  v1.0 because the test matrix doubles.

A 4-year-old Intel mini-PC will out-perform a Pi 5 for our use case
and costs less used.

### What's the cheapest hardware?

A refurbished business mini-PC: HP ProDesk 400 G5 Mini, Dell OptiPlex
3070 Micro, or similar. ~€60-80 used on eBay (~€100 refurb-grade).
With 8 GB RAM and a 256 GB SSD, these are perfect for Gecko.

Avoid anything pre-2018 with Intel Atom or Celeron (too slow for
transcoding modern codecs).

### Does it work on Windows or Mac without a separate device?

Yes — Gecko ships a Windows installer (`.exe`, ~25 MB) and a macOS
installer (`.pkg`). They install Gecko as a background service. You
access the dashboard at <http://localhost:3000> in your browser. Same
features as the Gecko OS appliance, just no kiosk mode on a TV.

### Can I use my old NAS / Synology / unRAID?

Synology DSM and unRAID are themselves Docker hosts. You can install
the *same containers* Gecko orchestrates, by hand, on those systems —
but you lose the auto-configuration. We don't currently ship a
"Gecko for Synology" package; community is welcome to write one.

---

## Setup

### Why does the wizard skip the WiFi step on my Windows PC?

Because Windows is already on a network. The WiFi step appears only
in the Gecko OS appliance (where it controls the underlying Debian
network manager). On Windows / Mac, your existing connection is used.

### Why does my installer say "open in your browser" instead of opening an app?

Because Gecko's UI **is** a web app. We dropped Electron in favor of
running Gecko as a Windows service / macOS daemon, which serves the UI
on `localhost:3000`. The Start menu shortcut on Windows (and the
launchd entry on Mac) opens your default browser to that URL.

This makes the installer ~6× smaller (~25 MB vs Electron's ~150 MB)
and means the desktop install path uses the same code as Gecko OS.

### How do I add my own VPN provider (not Mullvad)?

Gluetun supports ~30 providers (NordVPN, Surfshark, ProtonVPN,
ExpressVPN, …). Edit `/opt/gecko/userData/stack/.env`:

```bash
VPN_SERVICE_PROVIDER=protonvpn          # or 'surfshark', 'nordvpn', etc.
VPN_TYPE=wireguard                       # or 'openvpn'
# Provider-specific keys/credentials — see Gluetun docs:
# https://github.com/qdm12/gluetun-wiki/blob/main/setup/providers/
WIREGUARD_PRIVATE_KEY=...
WIREGUARD_ADDRESSES=10.x.x.x/32
SERVER_COUNTRIES=Spain
```

Then `docker compose -f /opt/gecko/userData/stack/docker-compose.yml restart gluetun`.

### Can I use Usenet instead of BitTorrent?

Yes. Sonarr/Radarr accept Usenet indexers (Newznab) via Prowlarr just
like torrent indexers. Add your indexer URL + API key in Prowlarr.
You'll also want NZBGet or SABnzbd as the download client — neither
ships with Gecko by default, but adding them as a Docker container in
the compose file is straightforward (see
[ARCHITECTURE.md](../gecko-os/docs/ARCHITECTURE.md)).

---

## Privacy & legal

### Does Gecko phone home?

**No**. We collect zero telemetry. Out-of-the-box analytics are off
in every container (Sonarr, Radarr, Bazarr, etc.). The only network
calls Gecko makes by itself are:

- Container image updates (Docker Hub) — once a week
- Recyclarr quality-profile sync (TRaSH-Guides) — once a day
- (If you enable VPN) Mullvad / your VPN provider — constantly
- (Wizard install) Bazarr fetches subtitle providers (OpenSubtitles
  etc.) when asked

Everything else is initiated by you.

### Where is my data stored?

Locally on the device you run Gecko on. We don't have a server. We
can't read your data. We don't want to.

- Media: wherever you pointed `DATA_PATH` in the wizard (the external
  HDD typically)
- Service configs: Docker volumes on the system disk
- Wizard state + .env: `/opt/gecko/userData/stack/` (or equivalent
  on Windows / Mac)

### What if the EU regulator decides this kind of thing is illegal?

Gecko's behaviour is identical to running vanilla Plex + Sonarr +
Radarr — software that's been legal and widely available for 10+
years. We don't bundle infringing material; we don't include
configured trackers. The legal exposure is yours, the same as it would
be with any media server.

If a jurisdiction outright bans home media servers (none does yet),
we'd remove the relevant download capability from the EU image — but
that's hypothetical.

---

## Support

### Where do I get help?

In order of speed:
1. **The AI helper prompt** — copy
   [docs/ai-helper-prompt.md](ai-helper-prompt.md) into ChatGPT or
   Claude, describe your problem. The prompt teaches the AI Gecko's
   architecture so it gives specific answers, not generic Docker
   tips.
2. **[Troubleshooting](troubleshooting.md)** — symptom → fix table.
3. **GitHub issues** — <https://github.com/Pardo24/Gecko/issues>.
   Include `docker ps -a` output and the relevant log tail.
4. (Future) **Discord** — community channel once we have one.

### Will you help me set up a custom VPN / NAS / weird hardware?

Open an issue with the details. We can't promise — the project is
~1 person at the moment — but we'll point you at the right docs and
update them if your case is common.

### How do I support the project?

- **Buy the USB stick** (~€35 — eventually). Pays for hosting + my
  time.
- **Use the affiliate links** in our hardware recommendations when
  you buy a mini-PC.
- **[Buy Me a Coffee](https://buymeacoffee.com/danipardo24)** if you
  want to chip in without buying anything.
- **Star the repo** on GitHub. Sounds dumb, helps a lot with
  discoverability.
