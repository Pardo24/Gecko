# Hardware compatibility

The single source of truth for "what hardware do I need to run Gecko".

Two audiences:
- **Gecko OS USB**: the user provides a mini-PC, we bring the OS.
- **Desktop installer**: the user already has a Windows / macOS box.

Below is the matrix for the first case (the recommendation path).

## TL;DR

Cheapest reliable mini-PC that gives a great Gecko experience:

> **Beelink S12 Pro** — Intel N100, 16 GB RAM, 500 GB SSD. ~€130 EU.

Plug HDMI to a TV, ethernet to the router, USB stick in. Wizard in 3 min.

## Compatibility matrix

### ✅ Recommended

| Class | Example | Why we recommend |
|---|---|---|
| **Modern mini-PC, N100/N97** | Beelink S12 Pro, GMKtec NucBox G3 | 8 GB+ RAM, NVMe SSD, hardware HEVC decode → handles 2-3 simultaneous transcodes |
| **Modern mini-PC, Ryzen / i5** | Beelink SER5, Asus PN51 | Overkill but great if you want 4K transcoding |
| **Refurbished business mini-PC** | Dell OptiPlex 7060 Micro, HP ProDesk 400 G5 | €60-100 used, i5/i7 7th-gen, perfect for self-hosted; check seller is EU/US-based for shipping |

### 🟡 Works, with caveats

| Class | Caveat |
|---|---|
| **Older mini-PC, i3/i5 2015-2018** | No hardware HEVC encode — transcoding falls back to CPU, slow with 4K. Fine if your TV is HEVC-capable (most are) |
| **Used thin client (HP T620, Wyse 5070)** | €25-50 on eBay, but check the spec: T620 with G5715-G (dual core, 2 GB RAM) is too weak. T620 Plus or 5070 with 4 GB+ RAM works |
| **Old laptop with broken screen** | Plug HDMI to TV. RAM/CPU OK if Haswell or newer (2014+) |

### ❌ Don't buy for Gecko

| Class | Why not |
|---|---|
| **Raspberry Pi 3** | Only 1 GB RAM, no hardware HEVC, USB 2.0 (slow disk I/O) — Jellyfin chokes |
| **Anything with Intel Atom < 2018** | Too slow even for direct play on most TVs |
| **ARM SBC without active development** | OrangePi, BananaPi, etc. — Docker on ARM is rough, missing community support, image not built for them |
| **Anything < 4 GB RAM** | Docker + the whole *arr stack just won't fit |
| **Anything without HDMI or USB-3.0** | Need HDMI for kiosk, USB-3.0 for external drives |

### 🟢 Worth considering — Apple Silicon Mini

A Mac Mini M1/M2 (used: ~€350) runs the Docker stack natively and idles
super quiet. Overkill for €150 worth of mini-PC, but if you have one
lying around, it's an excellent host.

## Tested hardware

This list grows as we and beta users confirm setups end-to-end. Each
entry has: hardware spec → installation result → known issues.

| Model | Spec | Status | Notes |
|---|---|---|---|
| _(empty until beta)_ | | | |

## Storage

Internal SSD is for the OS + Docker volumes (~10 GB). **External HDD via
USB-3.0 is recommended for the media library** — cheap per TB, easy to
upgrade, separable from the device. The wizard asks for `DATA_PATH`;
point it at the external drive's mount point.

We recommend:
- **For setup**: a 32 GB Sandisk Ultra Fit USB-3.0 (€8). The image we
  ship is 4 GB, leaves plenty of room.
- **For media**: a 4-8 TB WD Elements or Seagate Expansion USB-3.0 HDD
  (€80-150). Cheaper per TB than internal NVMe.

## Network

Wired ethernet is preferred. WiFi works (we ship NetworkManager + the
wizard scans/joins) but qBittorrent + Jellyfin transcoding both stress
the bandwidth — wifi can bottleneck.

If you must use WiFi: 5 GHz, 2-stream minimum.

## Display

For the kiosk dashboard on the TV: any HDMI port. The wizard renders
fine at 720p, 1080p, and 4K (responsive design). For 4K we recommend a
mini-PC with at least an N97 or better.

If you don't want the dashboard on the TV (some users prefer to keep
the device headless and use a laptop browser): unplug HDMI, the rest
still works.
