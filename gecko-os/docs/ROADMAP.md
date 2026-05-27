# Gecko — Production Roadmap

Last updated: 2026-05-27. Replaces the earlier informal phase notes.

## North star (the product we're building)

A USB image + tiny desktop installer that **anyone in any country** can
buy and install on their own mini-PC with zero technical skill. After 5
minutes, they have their own private Netflix on the TV. Errors are
visible and recoverable. Help is one click away (optionally via an AI
that runs on their own device).

Concretely:
1. International: works in **EU, US, LATAM, Africa, MENA, Asia** —
   languages, region-aware VPN/affiliate links, mirror-aware downloads.
2. Hardware: a clear compatibility matrix; pre-install checks warn before
   we waste the user's time.
3. Install: a single bootable USB or a 50 MB Windows installer. Wizard
   completes in 3-5 minutes. Every error has a defined recovery path.
4. Docs: strong, offline-accessible from the dashboard, plus a public web
   site. Multilingual.
5. Support: an opt-in AI helper that runs on the same hardware (self-
   hosted Ollama). Reads logs + config (sanitised), suggests fixes.

## Phases (sequence + honest time estimates)

These are **part-time** estimates (evenings/weekends), one developer.

### Phase 0 — Single codebase (kill Electron) — 2-3 days

Decision: take option C from DESKTOP_STACK_DECISION.md. Both products
ship the same server.js + React bundle.

- 0.1 Build a Windows installer (NSIS) that bundles portable Node, copies
      server.js + renderer/ + stack/ to Program Files, registers a
      Windows service via NSSM, adds Start Menu shortcut that opens the
      default browser to localhost:3000.
- 0.2 Build a macOS pkg with the same flow (launchd plist).
- 0.3 Validate end-to-end on a clean Windows VM (and Mac VM if possible).
- 0.4 Delete src/main.ts, src/preload.ts, electron-forge config, related
      deps. Update CI workflow to build .img + .exe (NSIS) + .pkg instead
      of Electron makers.
- 0.5 Update README + web copy + screenshots.

Output: installers smaller, single code path, easier auto-update.

### Phase 1 — International — REVISED 2026-05-27

**Decision (user, 2026-05-27): EN (primary) + ES + CA only.** No additional
languages in v1.0. Rationale: ~80% of Gecko's likely audience reads
English; maintaining 10 languages is high ongoing cost; let's validate
demand before investing in more translations.

The default language was changed to detect the browser locale, falling
back to English (was Catalan). LangContext.tsx implements this.

If users in non-English markets request their language post-launch, we
re-evaluate (potentially via Crowdin community translations — free for
OSS, no maintenance burden on us).

Region-aware infrastructure (kept as priority for v1.0):

- VPN recommendations: Mullvad (works in China), NordVPN/Surfshark
  (Western markets), or self-hosted WireGuard.
- Affiliate links: per-region Amazon programmes (`amazon.de`,
  `amazon.com`, `amazon.com.br`, `amazon.in`).
- Debian mirror: detect user's geo on first boot, configure
  `/etc/apt/sources.list` to use the closest mirror (deb.debian.org
  already does some of this via the CDN, but explicit is safer for
  Africa/Asia).
- DNS: offer a "Privacy DNS" toggle (Quad9, NextDNS) to bypass ISP DNS
  hijacking, common in MENA/Asia.
- Currency display: read user's locale, render prices in their
  currency (Stripe handles charging in local currency).

### Phase 2 — Easy install — 1 week

Hardware compat doc + pre-install checks:

- 2.1 Tested hardware list with thumbnails: Beelink S12 Pro,
      GMKtec NucBox, etc. With direct Amazon affiliate links per region.
- 2.2 Anti-recommendations: "Don't buy: Raspberry Pi 3, anything with
      <4 GB RAM, anything Atom CPU."
- 2.3 Boot-time pre-flight checks displayed on the first wizard screen:
      RAM ≥ 4 GB, free disk ≥ 100 GB, CPU supports HW-accel (VAAPI),
      network ready.
- 2.4 Finish wizard kiosk improvements:
      - F2.2 install-to-disk picker (lsblk + dd + reboot) ✅
      - F2.3 D-pad/keyboard navigation, responsive 1080p/4K ✅
      - ~~F2.4 passcode auth~~ — **DROPPED for v1.0** (2026-05-27 decision):
        Gecko's LAN trust model matches Plex, Jellyfin, Sonarr, Radarr
        (none ship auth by default). Adding auth adds wizard complexity
        + lock-out bug surface + UX cost, for benefit only on hostile-LAN
        cases (shared flat, office). Documented in
        docs/TRUST_MODEL.md. If user demand justifies it post-launch,
        reconsider with a "Settings → Enable LAN passcode" toggle.

### Phase 3 — Error prevention + recovery — 2 weeks

A catalogue of every plausible failure mode + how we handle it. Lives in
docs/ERROR_CASUISTICS.md (drafted in Phase 3.1).

- 3.1 Audit each wizard step for: timeout, network drop, invalid input,
      disk full, service crash. Document detection + auto-recovery +
      user-facing message.
- 3.2 Diagnostic bundle: one-click "Create support package" in dashboard
      → tar.gz with logs, .env (sanitised), gecko-init output, container
      status. Sends to email/Discord support.
- 3.3 Status dashboard: red/yellow/green per service with "last error"
      tooltip. Already exists partially (PageNetwork) — extend.
- 3.4 Auto-recovery extensions: Jellyfin restart on 3× health failures,
      stack-wide weekly health snapshot, gecko-init re-run scheduled if
      a service comes up missing its config.

### Phase 4 — Strong documentation — 1-2 weeks

Two destinations: public web (gecko-web/) + offline-accessible from
the dashboard (docs bundled into the image).

- 4.1 Getting started — 5 min read with screenshots
- 4.2 Hardware guide — buy this, not that
- 4.3 Troubleshooting — "the dashboard says X, what now?" table
- 4.4 FAQ — top 25 questions (from r/selfhosted + Discord)
- 4.5 Privacy + legal — what we collect (nothing), what the user is
      responsible for (their content choices)
- 4.6 Power-user API reference — for the 5% who want to script
- 4.7 Architecture — for contributors

All translated to at least the Phase 1a languages.

### Phase 5 — AI helper — 2-3 weeks

Opt-in, runs locally (no cloud cost, no privacy issues):

- 5.1 Add an optional `ollama` Docker service to the stack with a small
      model (Qwen 2.5 7B or similar, ~5 GB RAM, runs on CPU). Default
      off; user toggles in dashboard settings.
- 5.2 "Need help?" chat UI in the dashboard. Open chat → user types
      ("Why is qBittorrent showing red?") → backend pipes user's recent
      logs + active service status + chat history to Ollama with a system
      prompt that knows Gecko's architecture.
- 5.3 Privacy notice up front: "Your logs go to the AI running on YOUR
      device. Nothing leaves your network."
- 5.4 Sanitisation: strip passwords, API keys, Mullvad tokens from logs
      before they're seen by the model.
- 5.5 Disclaimer: "The AI may suggest wrong things. Verify before
      running anything destructive."

Hardware impact: needs ≥ 8 GB RAM and a recent x86 CPU. Mark as a
"premium hardware" feature — users with cheap N100 mini-PCs get the
option but with a warning.

### Phase 6 — Validation + launch — 2-4 weeks

- 6.1 Closed beta with 5 friends + family in different countries
- 6.2 Iterate based on what they hit
- 6.3 Public launch on r/selfhosted, r/jellyfin, ProductHunt
- 6.4 First sales via Gumroad
- 6.5 Continuous improvement based on real customer support tickets

## Honest total estimate

**~3-4 months of part-time work** to ship a v1.0.0 that meets every bar
above. If you go full-time, half that.

Cheaper path to first revenue: ship Phase 0 + Phase 2.4 + Phase 4.1
(getting-started + FAQ), validate demand with 10-20 sales. Then expand.

## What we explicitly defer (not "later", but "no")

- Mobile apps. The dashboard works in mobile browsers; standalone apps
  are not worth the maintenance for our scale.
- Cloud sync of media. The whole point is local. If users want cloud,
  Plex Pass exists.
- Subscription tiers. "Gecko Pro" would break trust. The web says
  "free forever, MIT licensed". Stay there.
- Closed-source modules. MIT all the way. Even the AI helper, even the
  installers.

## Where we are right now (2026-05-27)

Done:
- ✅ v1.3.0 stack refactor + watchdog (main)
- ✅ Headless UI server + transport polyfill (main)
- ✅ Gecko OS scaffold (Stage 1) — bootable image, login prompt (gecko-os)
- ✅ Gecko OS Stage 2 — kiosk display stack + UI server validated (gecko-os)
- ✅ F3 Bazarr seeds — eliminates the SKIP at install (gecko-os)
- ✅ F2.1 WiFi step with capability detection (gecko-os)

In flight:
- 🟡 F2.0 desktop installer decision → user picked option C (kill Electron)

Next: Phase 0.1 — NSIS installer scaffold.
