# Getting started with Gecko

This is the **5-minute path** from buying Gecko to streaming on your TV.
Skip ahead if you already know what hardware you have.

## What you need

A small computer for Gecko to run on. Anything from this list works:
- A mini PC (~€100-150 new — see [HARDWARE.md](HARDWARE.md) for
  recommendations like the Beelink S12 Pro)
- A used office PC (eBay, refurb shops — ~€50-100)
- An old laptop with a broken screen, but with HDMI out
- A spare desktop tower

It needs: 4 GB+ RAM, x86_64 CPU (any Intel/AMD from 2015 or newer),
HDMI out, a USB-3.0 port, and an ethernet cable or WiFi.

You'll also need:
- A **USB stick**, at least 8 GB (we recommend a Sandisk Ultra Fit
  USB-3.0, ~€8)
- An **external hard drive** for your media library (~€80 for 4-8 TB,
  USB-3.0 — WD Elements or Seagate Expansion are fine)
- A **TV with HDMI** (basically every TV from the last 10 years)

## Step 1 — Get the image

Download the latest `gecko-os.img.xz` from the
[Releases page](https://github.com/Pardo24/Gecko/releases/latest).
It's about 1 GB compressed. Save it somewhere you can find it.

## Step 2 — Flash the USB stick

Download [Etcher](https://etcher.balena.io/) (free, runs on Windows,
macOS, Linux). It's the tool we recommend because it's the hardest to
mess up.

1. Open Etcher.
2. Click **Flash from file** → pick the `gecko-os.img.xz` you
   downloaded (Etcher handles the `.xz` decompression itself).
3. Click **Select target** → pick your USB stick.
   ⚠ **Double-check you're picking the USB**, not your computer's main
   drive. Etcher will erase whatever you pick.
4. Click **Flash**. Wait ~3 minutes.
5. When done, eject the USB stick.

## Step 3 — Plug Gecko in

1. Plug the USB stick into the mini-PC.
2. Plug an HDMI cable from the mini-PC to your TV. Switch the TV to
   that HDMI input.
3. Plug ethernet cable (recommended) **or** be near your WiFi router.
4. Plug your external hard drive into a free USB port on the mini-PC.
5. Plug power and turn it on.

You may need to press F12 / Del / F2 / Esc during boot to pick "Boot
from USB" — the exact key depends on your PC. Most modern mini-PCs
auto-boot from USB if there's one inserted.

## Step 4 — Follow the wizard

After ~30 seconds you'll see the Gecko welcome screen on your TV. The
wizard has 5-6 short steps:

| # | What it asks | What to say |
|---|---|---|
| 1 | Welcome screen | Click "Start" |
| 2 | WiFi network (skipped if ethernet) | Pick yours, type the password |
| 3 | Where to save media | Point at your external hard drive |
| 4 | Admin password (one for everything) | 8+ characters, somewhere you'll remember |
| 5 | Subtitle language | "Català + English", "Castellano + English", or "English only" |
| 6 | VPN (optional) | "No VPN" for now — you can add one later |
| 7 | Install | Click; wait ~5 minutes; Gecko configures itself |

## Step 5 — Use it

When the wizard finishes, the dashboard opens. From here:

- **Watch** → Opens Jellyfin in a new tab. Sign in with `admin` and the
  password you set.
- **Request** → Opens Jellyseerr. Add friends/family as users; they
  request movies/series; Gecko downloads them automatically.
- **Network** → See which services are running, click any to open it
  in its own UI.
- **Guide** → Step-by-step guides for the advanced bits (adding
  indexers, tuning quality profiles).

## Step 6 — Adding indexers (the one extra step)

Gecko ships **without indexers configured** — that's the legal line
between "media server" and "piracy box". You're in charge of what
content sources you connect.

In the dashboard, **Guide → Indexers** walks through how to add yours.
Whether public, private, or Usenet, you add them via the Prowlarr web
UI (also reachable from the **Network** tab).

After you've added an indexer, Sonarr/Radarr will start finding
content within minutes of you adding a movie or series.

## Step 7 — Move Gecko to the internal disk (optional)

Right now Gecko is running off the USB stick. If you want to remove
the USB and have Gecko boot from the mini-PC's internal disk:

1. Open the dashboard → **Settings**.
2. Find the **Move to internal disk** card.
3. Pick the internal disk, type the disk's model name to confirm.
4. Wait ~5 minutes. The device reboots from the internal disk.
5. Pull the USB. You can reuse it for other things.

## Common first-boot snags

- **"USB doesn't boot"** → your BIOS is set to UEFI-only or
  Legacy-only. Look for "Boot mode" in BIOS settings, set to "Both" or
  "Auto". Or try the other mode.
- **"Black screen after GRUB"** → if your TV is on a non-standard
  resolution (some older 4K TVs), Gecko might boot to a mode the TV
  can't display. Try a different TV / monitor for the wizard, then
  switch back after install.
- **"Wizard says no internet"** → check the ethernet cable is plugged
  in and the router is on; or check your WiFi password if you typed
  it. The wizard can be retried.
- **"It's been 10 minutes and still installing"** → first install
  downloads ~3 GB of Docker images. On a slow connection this can take
  20+ min. Be patient; check the wizard's progress text.

If anything else goes wrong, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
or try our [AI helper prompt](ai-helper-prompt.md) — copy it into
ChatGPT, describe your problem, get an answer specific to Gecko.
