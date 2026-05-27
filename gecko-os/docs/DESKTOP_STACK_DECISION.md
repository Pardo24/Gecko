# Desktop installer: keep Electron, or replace?

Strategic question raised after F3: should the Windows / Mac desktop
installer stay on Electron, or switch to something lighter?

## Status quo

We have two products that share a React UI:

```
                 ┌──────────────────────┐
                 │     React + IPC      │   (src/, shared)
                 └──────────────────────┘
                            │
            ┌───────────────┴────────────────┐
            ▼                                ▼
  Desktop installer                  Gecko OS appliance
  ─────────────────                  ─────────────────
  Electron main.ts                   Node server.ts
  Electron BrowserWindow             Chromium kiosk
  IPC contextBridge                  HTTP fetch (transport.ts)
  ~150 MB .exe                       Embedded in OS image
```

The headless server we built in C is **the same code path** as the Gecko OS
kiosk. The Electron desktop installer is essentially a fancier wrapper
around a smaller version of the same thing.

## The three real options

### A. Keep Electron (status quo)

| Pros | Cons |
|------|------|
| Familiar UX (proper app window, taskbar icon) | 150 MB installer (bundles Chromium) |
| Native folder dialog | 200 MB idle RAM |
| Auto-update via update-electron-app already wired | Chromium CVEs need patching |
| Mac .dmg pipeline already in forge.config | Code signing for SmartScreen / Gatekeeper expensive |
| Lower friction for non-tech "install an app" mental model | Two codebases drift over time |

### B. Replace with Tauri (Rust + system WebView)

| Pros | Cons |
|------|------|
| 10-15 MB installer | Rust toolchain to build/maintain |
| 30 MB idle RAM | Smaller community than Electron |
| Uses Edge WebView2 (system-managed, MS patches it) | Rebuilding all the IPC + native dialogs |
| Modern security model | Still maintains TWO codebases (Tauri+web vs Gecko OS web) |
| Same .exe/.dmg packaging | Mac WebView differences |

### C. Drop the desktop app entirely → "Web app + Windows service"

This reuses the work we already did for Gecko OS. The Windows installer
becomes a thin wrapper:

```
NSIS installer (~10 MB)
  ├── bundles a portable Node runtime
  ├── installs server.js + renderer/ to %ProgramFiles%\Gecko
  ├── creates Windows service "Gecko Server" (auto-start on boot)
  ├── adds Start Menu shortcut → opens default browser to localhost:3000
  └── Mac equivalent: pkgbuild + launchd plist
```

User experience:
- Double-click installer → next-next-finish
- Start Menu → "Gecko" → browser opens, dashboard renders
- Auto-start at login (or manually via service)
- Updates: NSIS auto-update or in-app "Update available" downloads new
  server.js + restarts the service

| Pros | Cons |
|------|------|
| ONE codebase for both products | "Opens in your browser" feels less native |
| Tiny installer (~10 MB, no Chromium) | User might close browser tab and panic |
| Auto-update is just "download + replace JS file" | Service-based UX is unusual on Windows |
| No code signing needed for browser HTML | Need NSIS / pkgbuild scripts (new tooling) |
| Same Express server runs on both products | LAN exposure: localhost:3000 is open by default |
| No Chromium CVE chase | |

## Recommendation: C (Web + Service)

Reasons in order of weight:

1. **Architecture coherence.** We already have a working HTTP server that
   runs identically on both products. Building a second wrapper (Electron
   OR Tauri) means maintaining two paths to the same destination. A new
   bug in the install handler has to be reproduced in two places.

2. **Installer size matters for conversion.** 10 MB downloads in seconds.
   150 MB takes 30 s+ on a typical home connection and prompts
   second-guessing. r/selfhosted posts about Electron apps frequently get
   "why is it 150 MB" comments — the bar for new tooling is low.

3. **No code signing pressure.** A `.exe` that just installs a service +
   shortcut doesn't trigger SmartScreen as aggressively as one that runs
   arbitrary code with elevated privileges. The "scary unknown publisher"
   warning lessens. Long-term SignPath solves this anyway, but C reduces
   the urgency.

4. **Update mechanism is trivial.** Replace `server.js` (1.7 MB), restart
   the service. Compare with Electron's whole-app updates.

5. **No "appliance vs desktop" mental model split for us.** Everything we
   do for one helps the other.

## What we'd need to do to execute C

Rough estimate: 2-3 days of focused work.

1. **NSIS script** (`installer/windows/gecko.nsi`)
   - Bundle node-portable.exe (~30 MB compressed)
   - Copy server.js + renderer/ + stack/ to %ProgramFiles%\Gecko
   - Install Windows service via sc.exe (or use node-windows package)
   - Add Start Menu shortcut → `cmd /c start http://localhost:3000`
   - Uninstaller that stops service + removes files

2. **macOS pkg** (similar, with launchd plist)

3. **Auto-update for service** — small JS in server.js that polls a
   GitHub release feed; if newer, downloads + replaces server.js,
   restarts itself.

4. **Browser-detection landing page** — if user opens server.js root via
   `index.html`, but server isn't running locally → show "Run Gecko Server
   from your Start Menu" instead of a blank page.

5. **Delete:** electron-forge, src/main.ts, src/preload.ts, the .exe
   build pipeline. Reduces lint warnings + maintenance burden.

## What we'd lose by NOT doing it

If we keep Electron:
- Continued duplication of install handler between IPC and HTTP
- Chromium update toil
- 150 MB installer that makes the conversion harder
- Two failure modes to test for every wizard change

## Decision pending

This document doesn't decide — it lays out the trade. Strong recommendation
to switch (C). Will continue with F2 (wizard kiosk improvements) on the
existing dual-stack code in the meantime, since those changes apply to
both architectures.

Vote when ready:
- **A (keep)** — defer for now, revisit when we have 100+ paying users
- **B (Tauri)** — open to switching but want to keep two stacks
- **C (web+service)** — collapse to one stack
