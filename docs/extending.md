# Extending Gecko — adding more apps to your mini PC

Gecko is opinionated about media. It does Jellyfin + Sonarr + Radarr +
the rest of the stack, pre-wired, and we keep it focused. But a mini PC
can do **much more**. Here's how to add the things people most often
want, without breaking Gecko.

> **TL;DR**: Your Gecko box runs Docker. Anything that runs in Docker
> runs alongside Gecko. Just add containers to your stack. If you
> want a graphical app store on top, install **CasaOS** — it
> coexists with Gecko cleanly.

---

## Option A — add Docker containers manually (recommended)

Edit `/opt/gecko/userData/stack/docker-compose.yml` (on Gecko OS) or
`%APPDATA%\gecko\stack\docker-compose.yml` (on Windows). Add the new
service block. Then:

```bash
cd /opt/gecko/userData/stack            # Gecko OS path
docker compose up -d <service-name>
```

The new container shares the `media_net` network with Gecko, so they
can talk to each other if needed.

### Common additions

#### Home Assistant — smart home hub

```yaml
homeassistant:
  image: homeassistant/home-assistant:stable
  container_name: home-assistant
  network_mode: host                       # needs LAN broadcast
  volumes:
    - ${DATA_PATH}/homeassistant:/config
  restart: unless-stopped
```

Access at <http://gecko.local:8123>. First-run sets up the admin account.

#### Pi-hole — network-wide ad blocker

```yaml
pihole:
  image: pihole/pihole:latest
  container_name: pihole
  ports:
    - "53:53/tcp"
    - "53:53/udp"
    - "8081:80"
  environment:
    TZ: Europe/Madrid
    WEBPASSWORD: changeme
  volumes:
    - ${DATA_PATH}/pihole/etc:/etc/pihole
    - ${DATA_PATH}/pihole/dnsmasq.d:/etc/dnsmasq.d/
  restart: unless-stopped
```

Then point your router's DNS at the mini-PC's IP. Web UI at
<http://gecko.local:8081/admin>.

#### Immich — Google Photos replacement (self-hosted)

```yaml
immich-server:
  image: ghcr.io/immich-app/immich-server:release
  container_name: immich
  ports:
    - "2283:3001"
  volumes:
    - ${DATA_PATH}/immich:/usr/src/app/upload
  environment:
    DB_URL: postgres://...    # see immich docs for full setup
  restart: unless-stopped
# (also needs immich-machine-learning + redis + postgres — see immich's
#  compose example: https://immich.app/docs/install/docker-compose)
```

Best photo backup tool, hands-down. ~5 GB RAM if you enable ML.
Worth it if you have a phone full of photos.

#### Vaultwarden — Bitwarden password manager (self-hosted)

```yaml
vaultwarden:
  image: vaultwarden/server:latest
  container_name: vaultwarden
  ports:
    - "8082:80"
  volumes:
    - ${DATA_PATH}/vaultwarden:/data
  environment:
    DOMAIN: http://gecko.local:8082
  restart: unless-stopped
```

Open Bitwarden app on your phone, point at `http://gecko.local:8082`.
Free for unlimited users (paid Bitwarden is ~€10/user/year).

#### Nextcloud — Dropbox replacement

```yaml
nextcloud:
  image: nextcloud:latest
  container_name: nextcloud
  ports:
    - "8083:80"
  volumes:
    - ${DATA_PATH}/nextcloud/html:/var/www/html
    - ${DATA_PATH}/nextcloud/data:/var/www/html/data
  restart: unless-stopped
```

Sync files, calendars, contacts across devices. Heavy on disk; budget
~10-20 GB for the app + space for your files.

#### Tailscale — secure remote access

To reach your Gecko from outside the LAN:

```yaml
tailscale:
  image: tailscale/tailscale:latest
  container_name: tailscale
  network_mode: host
  cap_add: [NET_ADMIN, NET_RAW]
  volumes:
    - ${DATA_PATH}/tailscale:/var/lib/tailscale
    - /dev/net/tun:/dev/net/tun
  environment:
    TS_AUTHKEY: tskey-xxxxx                  # from your tailscale admin
  restart: unless-stopped
```

Then you can access Gecko from your phone anywhere via Tailscale's
zero-config VPN. (Note: this is unrelated to the BitTorrent VPN
inside the Gluetun container.)

---

## Option B — install CasaOS alongside Gecko

Don't want to edit YAML? CasaOS is a friendly app store for Docker
containers. It coexists with Gecko (different ports, different
volumes).

```bash
# On Gecko OS, SSH in (or open a TTY):
ssh gecko@gecko.local

# Install CasaOS:
curl -fsSL https://get.casaos.io | sudo bash

# CasaOS UI: http://gecko.local
# Gecko dashboard: http://gecko.local:3000  (unchanged)
```

CasaOS gives you a one-click install of 50+ apps. Gecko keeps running
exactly as before. The only conflict to watch for is **port 80** —
CasaOS takes it for its UI. If anything else of yours wanted port 80,
move it to a different port first.

---

## Option C — Portainer (advanced Docker GUI)

For full Docker control with a web GUI:

```yaml
portainer:
  image: portainer/portainer-ce:latest
  container_name: portainer
  ports: ["9000:9000"]
  volumes:
    - portainer_data:/data
    - /var/run/docker.sock:/var/run/docker.sock
  restart: unless-stopped
```

Then <http://gecko.local:9000>. More power, less hand-holding than
CasaOS — meant for users comfortable with Docker concepts.

---

## What to NOT do

- **Don't run two media servers** (Plex + Jellyfin). Pick one. They
  conflict on subtitle / metadata DBs.
- **Don't expose port 3000 to the public Internet**. Gecko's
  dashboard assumes LAN trust. See [TRUST_MODEL.md](../gecko-os/docs/TRUST_MODEL.md).
- **Don't change `media_net` settings** unless you know what you're
  doing — Gecko's services depend on it.
- **Don't share the mini PC with workloads that pin CPU** (compiling,
  AI training). Jellyfin transcoding will choke.

---

## When you've outgrown Gecko's mini PC

If your container list creeps beyond 8-10 services, consider:

- Upgrading hardware: 16 GB RAM, NVMe SSD, dedicated GPU for AI
  workloads
- Migrating to a small NAS: Synology DS923+, Ugreen DXP4800, TrueNAS
  Scale on custom hardware
- Splitting workloads: Gecko on one box, Home Assistant on a Pi 5,
  Nextcloud on a NAS

Gecko's footprint is ~3-4 GB RAM + 10 GB disk for itself; everything
beyond that is yours.
