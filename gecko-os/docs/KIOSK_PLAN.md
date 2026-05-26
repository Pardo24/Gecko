# Kiosk plan — Electron app changes for Gecko OS

The current Electron app (parent repo `src/`) is a desktop installer. For Gecko
OS we need it to run as a **headless UI server** that Chromium connects to in
kiosk mode. Most of the code stays; the changes are surgical.

## What changes

### 1. Split main process from renderer hosting

Today: Electron's main process opens a `BrowserWindow` and loads the React app
into it. The IPC layer talks between them.

Target: The main process runs an **HTTP server** (Express or Fastify) that
serves the same React bundle to whatever browser connects. IPC becomes plain
HTTP / WebSocket. Chromium running on the same machine connects to
`localhost:3000`.

**Concretely:**
- New file `src/server.ts` — Express app that:
  - Serves the built React bundle from `dist/renderer/`
  - Exposes the existing IPC handlers (`install`, `get-disk-stats`, etc.) as
    POST `/api/<handler-name>` endpoints
  - Streams `install-progress` events via Server-Sent Events at `/api/events`
- `src/main.ts` keeps the BrowserWindow path **for the desktop installer build**
  but adds a `--headless` flag for Gecko OS that skips the window and just
  starts the server.

### 2. Preload bridge → fetch wrapper

Today: `window.electron.install(config)` goes through `ipcRenderer.invoke`.

Target: same surface, different transport. Create a `src/lib/transport.ts`
that:
- Detects environment (`window.electron` present → use IPC; otherwise → use `fetch`)
- Exposes the same API shape so React code doesn't change

This means **zero React code changes**. The split is invisible to the renderer.

### 3. Routes for wizard vs dashboard

Today: A single root entry, navigation is internal React state.

Target: Two URL entry points the kiosk script can pick between:
- `/wizard` — onboarding flow (steps 0..7)
- `/` — dashboard

Add a `react-router` (or a tiny custom router) to expose these.

### 4. Disk + network APIs

The existing Electron `get-disk-stats` and `get-local-ip` use `fs.statfs` and
`os.networkInterfaces()` — both work fine in plain Node.js, no Electron needed.
They'll keep working when called from the HTTP server.

### 5. Build modes

Add to `package.json`:
```json
"scripts": {
  "start": "electron-forge start",
  "start:headless": "tsx src/server.ts",
  "build:headless": "vite build && tsc -p tsconfig.headless.json",
  ...
}
```

The Gecko OS build pipeline runs `build:headless` and copies the output to
`/opt/gecko/ui/` inside the image. systemd unit `gecko-ui.service` starts it.

## What does NOT change

- The whole `src/` React tree (`pages/`, `steps/`, `components/`, `i18n.ts`)
- `src/autoSetup.ts` — Docker stack orchestration logic
- The Docker stack itself (`stack/`) — identical for both products
- The i18n strings — already cover the wizard flow

## Estimated effort

- Split server/main: ~half a day
- Transport abstraction: ~2 hours
- Routes: ~1 hour
- Headless build config: ~2 hours
- Testing on real hardware: ~half a day

Total: **~2 working days** to have the existing wizard rendering inside
Chromium on a real mini PC.

## Open questions

1. **Authentication.** Today the Electron app trusts the user — there's no
   login. In Gecko OS the UI is reachable from the LAN too (via
   `http://gecko.local:3000`). Do we want to gate the wizard with the admin
   password from step one, or trust the LAN? **Decision needed before merging.**
2. **Resolution.** Mini PCs ship with various HDMI resolutions (some TVs report
   weird modes). The CSS today targets 920×680 (the BrowserWindow size). For
   kiosk we need responsive design — at minimum, scale up gracefully to 1080p
   and 4K.
3. **D-pad / remote.** If the user controls the TV with a remote that emits
   arrow keys + enter (most cheap mini PC remotes do), focus management in the
   wizard needs review. Currently relies on mouse / touch.
