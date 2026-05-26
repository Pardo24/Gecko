/**
 * Headless HTTP server — serves the React bundle and exposes the same API
 * surface as the Electron IPC layer. Used by Gecko OS where Chromium kiosk
 * mode renders the UI but there's no Electron runtime.
 *
 * Run: `npm run start:headless` (after `npm run build:headless` for the UI)
 *
 * The desktop Electron entry (src/main.ts) is untouched — it still calls
 * the same `runAutoSetup` and uses the same disk/network APIs. This file
 * provides a parallel transport for the same logic.
 */

import express from 'express';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';
import { runAutoSetup } from './autoSetup';

const execAsync = promisify(exec);

const PORT = Number(process.env.PORT ?? 3000);
const STATIC_DIR = process.env.STATIC_DIR ?? path.join(__dirname, '..', 'renderer', 'main_window');
const COMPOSE_DIR = process.env.COMPOSE_DIR ?? path.join(os.homedir(), '.gecko', 'stack');
const STACK_BASE = process.env.STACK_BASE ?? path.join(__dirname, '..', '..', 'stack');
const PKG_VERSION = process.env.GECKO_VERSION ?? '0.0.0-dev';

const app = express();
app.use(express.json({ limit: '1mb' }));

// ── Event bus for install progress (replaces IPC `install-progress` push) ─
const events = new EventEmitter();
events.setMaxListeners(50);  // SSE clients can pile up briefly during reloads

// ── Helpers (mirrored from main.ts, no Electron deps) ─────────────────
function dockerEnv() {
  const base = process.env.PATH ?? '';
  if (process.platform === 'darwin') {
    return { ...process.env, PATH: `${base}:/usr/local/bin:/opt/homebrew/bin:/usr/bin` };
  }
  // Linux (Gecko OS) — Docker is at /usr/bin/docker
  return { ...process.env };
}

function parseEnv(content: string): Record<string, string> {
  return Object.fromEntries(
    content.split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      }),
  );
}

// ── API handlers ──────────────────────────────────────────────────────
// All handlers are POST so we can pass JSON bodies uniformly. 204 = void.

app.post('/api/get-version', (_req, res) => res.json(PKG_VERSION));

app.post('/api/check-docker', async (_req, res) => {
  try { await execAsync('docker info', { env: dockerEnv() }); return res.json('running'); }
  catch {
    try { await execAsync('docker --version', { env: dockerEnv() }); return res.json('installed'); }
    catch { return res.json('missing'); }
  }
});

app.post('/api/start-docker', async (_req, res) => {
  // On Gecko OS, Docker is a systemd service. The wizard doesn't normally
  // hit this path (docker is enabled at image-build time), but support it
  // for resilience.
  try { await execAsync('systemctl start docker', { env: dockerEnv() }); } catch { /* best-effort */ }
  res.status(204).end();
});

app.post('/api/pick-folder', (_req, res) => res.json(null));   // no native dialog in kiosk

app.post('/api/get-local-ip', (_req, res) => {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return res.json(iface.address);
    }
  }
  res.json('127.0.0.1');
});

app.post('/api/open-external', (_req, res) => {
  // Kiosk shouldn't open external browsers. In Gecko OS, this is intentionally
  // a no-op (Chromium kiosk has no URL bar). Could be wired to `xdg-open` later
  // if we add a "click to copy URL" affordance.
  res.status(204).end();
});

app.post('/api/get-disk-stats', async (req, res) => {
  const { path: folderPath } = req.body ?? {};
  try {
    // statfs is in fs/promises in Node 18+; cast to access it
    const stats = await (fs as unknown as { statfs: (p: string) => Promise<{ bfree: number; bsize: number; blocks: number }> }).statfs(folderPath);
    res.json({
      freeBytes: stats.bfree * stats.bsize,
      totalBytes: stats.blocks * stats.bsize,
    });
  } catch {
    res.json(null);
  }
});

app.post('/api/get-config', async (_req, res) => {
  try {
    const content = await fs.readFile(path.join(COMPOSE_DIR, '.env'), 'utf8');
    const cfg = parseEnv(content);
    res.json({ ...cfg, vpnEnabled: !!cfg.MULLVAD_PRIVATE_KEY });
  } catch {
    res.json(null);
  }
});

app.post('/api/get-status', async (_req, res) => {
  try {
    const { stdout } = await execAsync('docker compose ps -q', { cwd: COMPOSE_DIR, env: dockerEnv() });
    res.json(stdout.trim().split('\n').filter(Boolean).length > 0 ? 'running' : 'stopped');
  } catch {
    res.json('stopped');
  }
});

app.post('/api/start-stack', async (_req, res) => {
  await execAsync('docker compose up -d', { cwd: COMPOSE_DIR, env: dockerEnv() });
  res.status(204).end();
});

app.post('/api/stop-stack', async (_req, res) => {
  await execAsync('docker compose down', { cwd: COMPOSE_DIR, env: dockerEnv() });
  res.status(204).end();
});

app.post('/api/reset-install', async (_req, res) => {
  try { await execAsync('docker compose down --volumes', { cwd: COMPOSE_DIR, env: dockerEnv() }); } catch { /* ignore */ }
  await fs.rm(COMPOSE_DIR, { recursive: true, force: true });
  res.status(204).end();
});

app.post('/api/install', async (req, res) => {
  const config = req.body;
  const { dataPath, adminPassword, subtitleLangs, vpnEnabled } = config;
  const progress = (step: number) => events.emit('install-progress', { step });

  // Step 0: dirs
  progress(0);
  const dirs = ['jellyfin/media/movies', 'jellyfin/media/series', 'jellyfin/media/music', 'downloads'];
  for (const d of dirs) await fs.mkdir(path.join(dataPath, d), { recursive: true });

  // Step 1: generate .env + compose
  progress(1);
  await fs.mkdir(COMPOSE_DIR, { recursive: true });
  const envLines = [
    `DATA_PATH=${dataPath.replace(/\\/g, '/')}`,
    `TZ=Europe/Madrid`,
    `JELLYFIN_PORT=8096`, `JELLYSEERR_PORT=5055`, `PROWLARR_PORT=9696`,
    `RADARR_PORT=7878`, `SONARR_PORT=8989`, `LIDARR_PORT=8686`,
    `BAZARR_PORT=6767`, `QBIT_PORT=8090`,
    `JELLYFIN_ADMIN_PASSWORD=${adminPassword}`,
    vpnEnabled ? `MULLVAD_PRIVATE_KEY=${config.mullvadKey}` : '',
    vpnEnabled ? `MULLVAD_ADDRESSES=${config.mullvadAddress}` : '',
  ].filter(Boolean).join('\n');
  await fs.writeFile(path.join(COMPOSE_DIR, '.env'), envLines);

  const composeFile = vpnEnabled ? 'docker-compose.yml' : 'docker-compose-novpn.yml';
  await fs.copyFile(path.join(STACK_BASE, composeFile), path.join(COMPOSE_DIR, 'docker-compose.yml'));
  await fs.cp(path.join(STACK_BASE, 'cleaner'), path.join(COMPOSE_DIR, 'cleaner'), { recursive: true });
  for (const sub of ['gecko-init', 'recyclarr', 'buildarr']) {
    try { await fs.cp(path.join(STACK_BASE, sub), path.join(COMPOSE_DIR, sub), { recursive: true }); }
    catch { /* not present */ }
  }

  // Step 2: pull + start
  progress(2);
  await execAsync('docker compose up -d --build', { cwd: COMPOSE_DIR, env: dockerEnv() });

  // Steps 3-7: auto-setup
  const result = await runAutoSetup({
    adminPassword,
    subtitleLangs: subtitleLangs ?? [],
    ports: {
      jellyfin: 8096, radarr: 7878, sonarr: 8989, lidarr: 8686,
      prowlarr: 9696, bazarr: 6767, qbit: 8090, jellyseerr: 5055,
    },
    vpnEnabled,
    stackDir: COMPOSE_DIR,
    dockerEnvObj: dockerEnv(),
    onProgress: progress,
  });

  res.json({ failedSteps: result.failedSteps });
});

// SSE stream — clients subscribe and receive install-progress events.
app.get('/api/events', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const send = (payload: { step: number }) => {
    res.write(`event: install-progress\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  events.on('install-progress', send);
  // Heartbeat every 25 s to keep proxies from idle-closing the stream
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
  _req.on('close', () => {
    events.off('install-progress', send);
    clearInterval(heartbeat);
  });
});

// ── Static React bundle ───────────────────────────────────────────────
// Falls back to index.html for any unknown path → React router handles it.
app.use(express.static(STATIC_DIR));
app.get('*', (_req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`[gecko-ui] listening on http://localhost:${PORT}`);
  console.log(`[gecko-ui]   static:  ${STATIC_DIR}`);
  console.log(`[gecko-ui]   compose: ${COMPOSE_DIR}`);
  console.log(`[gecko-ui]   stack:   ${STACK_BASE}`);
});
