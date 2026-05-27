# Trust model

What can someone do who's on the same LAN as your Gecko box. Read before
deciding whether your situation calls for LAN auth.

## Default posture (v1.0)

**Anyone on your LAN can reach the Gecko dashboard at
`http://<gecko-ip>:3000`** and do everything the dashboard lets you do:
manage the stack, change config, browse media, reset the install.

This matches **every comparable self-hosted media tool**:

| Tool | LAN auth by default |
|---|---|
| Plex (server-side admin) | No (Plex.tv account is separate) |
| Jellyfin (admin dashboard) | No — anyone on LAN can hit the URL |
| Sonarr / Radarr / Lidarr | No — auth off in default linuxserver image |
| Prowlarr | No |
| Bazarr | No |
| qBittorrent WebUI | Username/password, defaults to `admin/adminadmin` |
| Home Assistant | Yes (auth required by default) |

So if your LAN is your home — where you trust the people and devices on
it — this is fine. If it isn't, you should put Gecko on a network you
control.

## When the default is not enough

- **Shared flat with non-trusted roommates.** They could reset your
  install, drop your media library, change your VPN credentials.
- **Office or coworking LAN.** Anyone on the office wifi is "trusted"
  by Gecko's defaults; that's almost certainly not what you want.
- **Public guest WiFi.** Don't run Gecko exposed to a network you didn't
  set up. (Also, why would you.)

## What you can do today (without code changes)

### Network-level isolation

The cleanest fix is to keep Gecko off untrusted networks:

- **Dedicated subnet** — most routers (UniFi, OpenWrt, recent ASUS,
  Mikrotik) let you carve a separate VLAN. Put Gecko on its own VLAN,
  block inbound traffic from your guest WiFi VLAN.
- **Disable guest network reach** — Tick the "isolate from main LAN"
  checkbox in your router's guest WiFi config. Most routers have this.
- **Firewall rule on Gecko itself** — `ufw deny from <untrusted-cidr>`
  via SSH, then `ufw allow from <trusted-cidr> to any port 3000`. Not
  user-friendly but works on Gecko OS today.

### IP allowlist via reverse proxy (advanced)

Stick Caddy or nginx in front of the Gecko Docker stack and have it
block by source IP. Requires Caddy/nginx knowledge — defer to the
[Architecture doc](ARCHITECTURE.md) if curious.

## If we add LAN auth later

A future "Settings → Enable LAN passcode" toggle would:

1. Generate a random session secret on enable
2. Require a one-time login (using the admin password) for any non-
   localhost request
3. Set an HTTP-only session cookie that lasts 30 days
4. Bypass auth entirely for `127.0.0.1` (so the Chromium kiosk on the
   device itself never gets prompted)

We've deferred this to keep the v1.0 wizard and UX simple. The trade-
off is recorded above. If 3+ users hit us with "I need to put Gecko in
an untrusted LAN and need auth", we revisit.

## What is always encrypted, regardless of LAN posture

- **VPN tunnel** — Gluetun + WireGuard, end-to-end with your VPN
  provider. Your ISP sees encrypted traffic only.
- **HTTPS to media sources** — Sonarr / Radarr / Prowlarr talk to
  indexers over HTTPS where supported.
- **At rest on your disk** — files are not encrypted. If you need
  encryption-at-rest, use LUKS on your media disk (out of scope for
  Gecko).

## What is NOT encrypted

- **Dashboard ↔ browser** — plain HTTP on port 3000. Trivially
  sniffable on the LAN. Don't transmit anything sensitive over the
  dashboard if you have unknown listeners on your network. Putting a
  reverse proxy with HTTPS in front (Caddy auto-renews Let's Encrypt
  certs in 1 line of config) closes this.
