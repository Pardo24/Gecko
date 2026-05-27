# Troubleshooting

Symptom → likely cause → fix. Try the steps in order; each later step
costs more time, so the easy ones go first.

If your problem isn't here, copy the
[AI helper prompt](ai-helper-prompt.md) into ChatGPT or Claude and
describe what's happening. It knows Gecko's architecture and will
diagnose your specific situation.

---

## Boot & install

### USB doesn't boot — PC goes straight into Windows / shows BIOS error

The PC isn't trying to boot from your USB.

1. Restart and tap **F12** (or F2, F8, Esc, Del — depends on the PC).
   This opens the boot-device menu. Pick the USB stick.
2. If F12 doesn't show the USB: enter BIOS (usually F2/Del). Find
   "Boot Mode" or "Boot Order". Set Boot Mode to **Both** or **Auto**
   (not UEFI-only or Legacy-only). Save and exit.
3. Re-flash the USB with Etcher (sometimes the first flash is
   corrupted). Pick the same `gecko-os.img.xz` file.
4. Try a different USB port. Some PCs only boot from specific ports.

### "Black screen after GRUB" or "No signal" message

The kernel booted but X (the graphical display) didn't start, often
because your TV doesn't support the mode Gecko chose.

1. Wait 60 seconds — kiosk Chromium needs time on first boot.
2. SSH in from another computer:
   `ssh gecko@<gecko-ip>` (password: the admin password, or empty on
   first boot). Then `sudo journalctl -u gecko-kiosk.service -n 50`
   to see what's wrong.
3. Switch the TV to a different HDMI port and back — forces re-detection.
4. Try a different TV / monitor temporarily, just to get past the wizard.

### "Wizard says no internet"

Wired: ethernet cable issue. WiFi: wrong network or password.

1. Check the cable is plugged into both ends, and the router LED is on.
2. From the wizard, click "Tornar a cercar" / "Rescan" — re-detects.
3. SSH in: `nmcli connection show` lists active connections. If empty,
   `nmcli device wifi list` and `nmcli device wifi connect "<SSID>" password "<pw>"`.

### "It's been 15+ minutes installing"

First install downloads ~3 GB of Docker images. On a slow connection
this is normal.

1. Check the wizard's status text — it tells you which step it's on.
2. SSH in: `docker ps` shows which containers are up. They come up one
   by one.
3. Bandwidth bottleneck: try wired ethernet instead of WiFi.

### Wizard hangs at "Configuring downloads"

qBittorrent is on the VPN tunnel (Gluetun) and Gluetun is failing to
connect.

1. Check VPN credentials — Mullvad WireGuard key + addresses must be
   exact. The address is something like `10.66.x.x/32` — pay attention
   to the `/32`.
2. SSH in: `docker logs media_gluetun --tail 30` shows why the tunnel
   isn't establishing. Common reasons:
   - "wireguard: Bad key" → your key is wrong
   - "no servers found for country X" → change `SERVER_COUNTRIES` in
     `/opt/gecko/userData/stack/.env` to a country Mullvad has
   - "context deadline exceeded" → ISP may be blocking WireGuard;
     try the OpenVPN protocol (edit `VPN_TYPE` in `.env`)
3. If you're not on Mullvad, edit `.env` to use a different provider.
   Gluetun supports ~30 VPN providers; see
   <https://github.com/qdm12/gluetun-wiki/blob/main/setup/providers/>

---

## After install — things break

### Sonarr / Radarr say "no search results"

Expected on a fresh install. You haven't added an indexer yet. **This
is by design** — Gecko ships with Prowlarr empty so we're not
distributing what's politely called "a piracy box".

1. Open the dashboard → **Network** → **Prowlarr**.
2. Sign in with `admin` and your admin password.
3. **Indexers → Add Indexer**. Add whatever you have — public trackers,
   private trackers, Usenet indexers. Sonarr/Radarr inherit them
   automatically because Prowlarr is wired to push them.

### Bazarr isn't downloading subtitles

Either no language profile is assigned to your library, or no
subtitle provider is enabled.

1. In Bazarr (**Network → Bazarr**): **Settings → Languages → Profile**.
   Make sure one of the 3 seeded profiles is set as default for both
   movies and series.
2. **Settings → Providers** — verify at least OpenSubtitles is
   enabled. It's free; signup at <https://www.opensubtitles.com/> if
   they ask for credentials.

### qBittorrent shows all torrents "Stalled" with 0 B/s

Either the VPN tunnel dropped, or you have no peers (private tracker
needs you to seed-back).

1. Open dashboard → Network — check qBittorrent and Gluetun status
   lights. If Gluetun is red:
2. SSH in: `docker logs media_gluetun --tail 20`. Restart it with
   `docker compose -f /opt/gecko/userData/stack/docker-compose.yml restart gluetun`.
   The watchdog should also auto-fix this within ~60 s.
3. If Gluetun is green but downloads stalled: the trackers may simply
   not have seeders. Try a different release.

### Jellyfin can't play a file — "media format not supported"

Hardware acceleration isn't available, or the codec isn't transcodable.

1. Jellyfin → **Dashboard → Playback**. Confirm **Hardware
   acceleration** is set to "Intel QuickSync" or "VAAPI" (Gecko OS
   pre-configures this on Intel iGPU mini-PCs).
2. If the file is a rare format (e.g. AV1 on a non-AV1-capable CPU),
   transcoding will be CPU-only and slow. Watch on a device that
   supports the codec natively (modern TV/phone).
3. Some MKV files have audio formats no decoder handles. Re-encode
   with `ffmpeg` (advanced) or just delete and re-download.

### "Service stopped" after I rebooted

Docker daemon didn't auto-start. (Should never happen on Gecko OS —
report a bug if it does.)

1. SSH in: `sudo systemctl status docker` — should say `active
   (running)`. If not:
2. `sudo systemctl enable --now docker` enables auto-start AND starts now.
3. `cd /opt/gecko/userData/stack && docker compose up -d` brings the
   stack up.

---

## Settings & maintenance

### I forgot my admin password

The password is the same for Jellyfin, qBittorrent, Bazarr — all the
services.

1. SSH in (the SSH password is also the admin password, sorry — that's
   the simplest design for non-tech users).
2. If even SSH is locked: boot Gecko OS from USB on a different
   machine, mount the broken disk's rootfs, edit
   `/opt/gecko/userData/stack/.env`, set `JELLYFIN_ADMIN_PASSWORD=newpass`,
   reboot. Then in each service's web UI go to user settings and
   update the per-service password (Jellyfin keeps users in its DB,
   not in .env, so the password only changes for new wizards — for
   existing users, change via Jellyfin admin UI).

### How do I update Gecko?

The Docker containers update automatically (weekly via Recyclarr's
cron + watchtower-like logic).

The Gecko OS itself updates by re-flashing the USB:

1. Download the new `gecko-os.img.xz`.
2. Etcher → flash a USB.
3. Boot from the new USB.
4. The wizard recognises your existing config (it's on the external
   HDD's compose dir) and offers to re-use it.

We'll automate this in a future release ("Update Gecko" button in
Settings that downloads + applies in-place).

### How do I back up my Gecko config?

The compose dir holds your .env, API keys, and pre-seeded service
configs. It's everything that's "yours".

On Gecko OS:
```bash
sudo tar -czf gecko-backup.tar.gz /opt/gecko/userData/stack
```

Copy that .tar.gz somewhere safe. To restore:
```bash
sudo tar -xzf gecko-backup.tar.gz -C /
docker compose -f /opt/gecko/userData/stack/docker-compose.yml up -d
```

(Your media library on the external HDD doesn't need backup unless
you care about which files are on it; the media itself can be
re-downloaded.)

### How do I uninstall Gecko cleanly?

If you want to start over:
- **Just the install state** (keep the OS): dashboard → **Settings →
  Reinstall**. Wipes the .env and all Docker volumes.
- **Everything, back to bare hardware**: re-flash the OS over Gecko's
  internal disk via any Linux live USB. Or use Gecko OS's own
  installer on a different disk and reformat the old one.

---

## Performance & quality

### Streams keep buffering on the TV

Bandwidth or transcoding issue.

1. Are you streaming the **same network** the Gecko is on? If yes:
   wired ethernet on both ends is ideal. WiFi can bottleneck.
2. Is Jellyfin transcoding? In playback: if it says **Direct Play**
   you're fine. If it says **Transcoding**, your TV doesn't support
   the source codec and the mini-PC is converting on-the-fly. CPU is
   the bottleneck.
3. Lower the Jellyfin client's "internet quality" setting to 1080p or
   720p — direct-plays at lower bitrate.

### Downloads max out at 1-2 MB/s on a 100 Mbps line

Almost certainly the VPN, not the trackers.

1. Check Gluetun's reported server: `docker logs media_gluetun |
   grep "Public IP"`. If it's in a country far away, switch
   `SERVER_COUNTRIES` in `.env` to one near you.
2. Mullvad's free testing tier is rate-limited — make sure you have a
   paid account.

### CPU is at 100% all the time

Something's stuck in an infinite transcode loop, or the watchdog is
restarting something repeatedly.

1. `docker stats` shows live CPU/memory per container. The container
   pegged at 100% is the culprit.
2. If it's `jellyfin`: a stream is transcoding. Stop the playback.
3. If it's `gluetun`: VPN is in a reconnect loop. See "qBittorrent
   stalled" above.
4. If it's something else: that's worth filing as a bug.

---

## Still stuck

- Copy the [AI helper prompt](ai-helper-prompt.md) into Claude or
  ChatGPT and describe your problem in plain language. It knows
  Gecko's architecture and will give specific advice.
- Open an issue at
  <https://github.com/Pardo24/Gecko/issues>. Include:
  - What you were doing
  - What happened
  - Output of: `docker ps -a` and `docker logs --tail 50 media_gecko_init`
