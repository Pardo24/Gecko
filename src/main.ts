import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import started from 'electron-squirrel-startup';
import { updateElectronApp } from 'update-electron-app';
import { runAutoSetup } from './autoSetup';

if (started) app.quit();

if (app.isPackaged) updateElectronApp();

Menu.setApplicationMenu(null);

const execAsync = promisify(exec);

const createWindow = () => {
  const win = new BrowserWindow({
    width: 920,
    height: 680,
    resizable: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

app.on('ready', async () => {
  createWindow();
  // If the stack was already running when Gecko opens, start the monitor
  try {
    const { stdout } = await execAsync('docker compose ps -q', { cwd: composeDir(), env: dockerEnv() });
    if (stdout.trim().split('\n').filter(Boolean).length > 0) startStallMonitor();
  } catch { /* stack not yet installed */ }
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── Helpers ───────────────────────────────────────────────────

function dockerEnv() {
  const base = process.env.PATH ?? '';
  if (process.platform === 'darwin') {
    const extra = '/usr/local/bin:/opt/homebrew/bin:/usr/bin';
    return { ...process.env, PATH: `${base}:${extra}` };
  }
  const extra = [
    'C:\\Program Files\\Docker\\Docker\\resources\\bin',
    'C:\\Program Files (x86)\\Docker\\Docker\\resources\\bin',
  ].join(';');
  return { ...process.env, PATH: `${base};${extra}` };
}

function composeDir() {
  return path.join(app.getPath('userData'), 'stack');
}

function parseEnv(content: string): Record<string, string> {
  return Object.fromEntries(
    content.split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

// ── Stall monitor ─────────────────────────────────────────────
// Periodically checks Radarr and Sonarr queues.
// Any item with trackedDownloadStatus 'warning' or 'error' that has been
// in the queue for more than STALL_THRESHOLD_MS is auto-blocklisted so
// the *arr service immediately searches for an alternative release.

const STALL_THRESHOLD_MS = 60 * 60 * 1000; // 60 minutes
const STALL_CHECK_INTERVAL_MS = 30 * 60 * 1000; // check every 30 minutes
let stallMonitorTimer: ReturnType<typeof setInterval> | null = null;

function arrHttpGet(port: number, urlPath: string, apiKey: string): Promise<{ status: number; body: string }> {
  return new Promise(resolve => {
    const req = http.request(
      { hostname: 'localhost', port, path: urlPath, headers: { 'X-Api-Key': apiKey } },
      res => {
        let data = '';
        res.on('data', (d: Buffer) => data += d);
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );
    req.on('error', () => resolve({ status: 0, body: '' }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ status: 0, body: '' }); });
    req.end();
  });
}

function arrHttpDelete(port: number, urlPath: string, apiKey: string): Promise<void> {
  return new Promise(resolve => {
    const req = http.request(
      { hostname: 'localhost', port, path: urlPath, method: 'DELETE', headers: { 'X-Api-Key': apiKey } },
      res => { res.resume(); res.on('end', resolve); },
    );
    req.on('error', () => resolve());
    req.setTimeout(8000, () => { req.destroy(); resolve(); });
    req.end();
  });
}

async function blocklistStalledInService(
  port: number, apiKey: string, apiVersion: string,
): Promise<void> {
  const resp = await arrHttpGet(port, `${apiVersion}/queue?pageSize=200&includeUnknownMovieItems=true`, apiKey);
  if (resp.status !== 200) return;
  const queue = JSON.parse(resp.body) as {
    records: Array<{ id: number; added: string; trackedDownloadStatus: string }>;
  };
  const now = Date.now();
  for (const item of queue.records ?? []) {
    if (item.trackedDownloadStatus !== 'warning' && item.trackedDownloadStatus !== 'error') continue;
    const age = now - new Date(item.added).getTime();
    if (age < STALL_THRESHOLD_MS) continue;
    // blocklist=true + skipRequeue=false → removes, blocklists, and triggers a new search
    await arrHttpDelete(
      port,
      `${apiVersion}/queue/${item.id}?removeFromClient=true&blocklist=true&skipRequeue=false`,
      apiKey,
    );
  }
}

async function runStallCheck(): Promise<void> {
  try {
    const envContent = await fs.readFile(path.join(composeDir(), '.env'), 'utf8');
    const env = parseEnv(envContent);
    const radarrPort = parseInt(env.RADARR_PORT ?? '7878');
    const sonarrPort = parseInt(env.SONARR_PORT ?? '8989');
    if (env.RADARR_API_KEY) await blocklistStalledInService(radarrPort, env.RADARR_API_KEY, '/api/v3');
    if (env.SONARR_API_KEY) await blocklistStalledInService(sonarrPort, env.SONARR_API_KEY, '/api/v3');
  } catch { /* stack not running or no config */ }
}

function startStallMonitor(): void {
  if (stallMonitorTimer) return;
  stallMonitorTimer = setInterval(() => { runStallCheck(); }, STALL_CHECK_INTERVAL_MS);
}

function stopStallMonitor(): void {
  if (stallMonitorTimer) { clearInterval(stallMonitorTimer); stallMonitorTimer = null; }
}

// ── IPC Handlers ─────────────────────────────────────────────

ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('check-docker', async () => {
  try { await execAsync('docker info', { env: dockerEnv() }); return 'running'; }
  catch {
    try { await execAsync('docker --version', { env: dockerEnv() }); return 'installed'; }
    catch { return 'missing'; }
  }
});

ipcMain.handle('start-docker', async () => {
  if (process.platform === 'darwin') {
    await execAsync('open -a Docker');
  } else {
    // Windows: try to launch Docker Desktop
    const paths = [
      'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
      'C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe',
    ];
    for (const p of paths) {
      try { await execAsync(`start "" "${p}"`); return; } catch { /* try next */ }
    }
  }
});

ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-external', (_e, url: string) => {
  shell.openExternal(url);
});

// Returns parsed .env config, or null if not installed
ipcMain.handle('get-config', async () => {
  try {
    const content = await fs.readFile(path.join(composeDir(), '.env'), 'utf8');
    const cfg = parseEnv(content);
    return { ...cfg, vpnEnabled: !!cfg.MULLVAD_PRIVATE_KEY };
  } catch {
    return null;
  }
});

// Returns 'running' | 'stopped'
ipcMain.handle('get-status', async () => {
  try {
    const { stdout } = await execAsync('docker compose ps -q', { cwd: composeDir(), env: dockerEnv() });
    return stdout.trim().split('\n').filter(Boolean).length > 0 ? 'running' : 'stopped';
  } catch {
    return 'stopped';
  }
});

ipcMain.handle('start-stack', async () => {
  await execAsync('docker compose up -d', { cwd: composeDir(), env: dockerEnv() });
  startStallMonitor();
});

ipcMain.handle('stop-stack', async () => {
  await execAsync('docker compose down', { cwd: composeDir(), env: dockerEnv() });
  stopStallMonitor();
});

ipcMain.handle('get-disk-stats', async (_e, folderPath: string) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = await (fs as any).statfs(folderPath);
    return {
      freeBytes:  stats.bfree  * stats.bsize,
      totalBytes: stats.blocks * stats.bsize,
    };
  } catch {
    return null;
  }
});

// Returns machine's local IPv4 address
ipcMain.handle('get-local-ip', () => {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
});

// Reset installation — stops stack + removes Docker config volumes + deletes compose dir
ipcMain.handle('reset-install', async () => {
  const dir = composeDir();
  try { await execAsync('docker compose down --volumes', { cwd: dir, env: dockerEnv() }); } catch {}
  await fs.rm(dir, { recursive: true, force: true });
});

ipcMain.handle('install', async (event, config: {
  dataPath: string; adminPassword: string; subtitleLangs: string[];
  vpnEnabled: boolean; mullvadKey: string; mullvadAddress: string;
}) => {
  const { dataPath, adminPassword, subtitleLangs, vpnEnabled, mullvadKey, mullvadAddress } = config;
  const progress = (step: number) => { try { event.sender.send('install-progress', step); } catch { /* window may be closing */ } };

  // Step 0: Create directories
  progress(0);
  const dirs = [
    'jellyfin/media/movies', 'jellyfin/media/series', 'jellyfin/media/music', 'downloads',
  ];
  for (const d of dirs) await fs.mkdir(path.join(dataPath, d), { recursive: true });

  // Step 1: Generate config + .env
  progress(1);

  const dir = composeDir();
  await fs.mkdir(dir, { recursive: true });

  const envLines = [
    `DATA_PATH=${dataPath.replace(/\\/g, '/')}`,
    `TZ=Europe/Madrid`,
    `JELLYFIN_PORT=8096`, `JELLYSEERR_PORT=5055`, `PROWLARR_PORT=9696`,
    `RADARR_PORT=7878`, `SONARR_PORT=8989`, `LIDARR_PORT=8686`,
    `BAZARR_PORT=6767`, `QBIT_PORT=8090`,
    `JELLYFIN_ADMIN_PASSWORD=${adminPassword}`,
    vpnEnabled ? `MULLVAD_PRIVATE_KEY=${mullvadKey}` : '',
    vpnEnabled ? `MULLVAD_ADDRESSES=${mullvadAddress}` : '',
  ].filter(Boolean).join('\n');

  await fs.writeFile(path.join(dir, '.env'), envLines);

  const composeFile = vpnEnabled ? 'docker-compose.yml' : 'docker-compose-novpn.yml';
  const src = app.isPackaged
    ? path.join(process.resourcesPath, 'stack', composeFile)
    : path.join(__dirname, `../../stack/${composeFile}`);
  await fs.copyFile(src, path.join(dir, 'docker-compose.yml'));

  // Step 2: Pull + start containers
  progress(2);

  // Pre-create qBittorrent config with known password (PBKDF2-HMAC-SHA512)
  // so we can log in reliably without parsing docker logs
  const qbitConfigDir = path.join(dataPath, 'qbittorrent', 'qBittorrent');
  await fs.mkdir(qbitConfigDir, { recursive: true });
  const qbitConf = path.join(qbitConfigDir, 'qBittorrent.conf');
  const qbitSalt = crypto.randomBytes(16);
  const qbitKey = await new Promise<Buffer>((resolve, reject) =>
    crypto.pbkdf2(adminPassword, qbitSalt, 100000, 64, 'sha512', (err, k) => err ? reject(err) : resolve(k))
  );
  const qbitHash = `@ByteArray(${qbitSalt.toString('base64')}:${qbitKey.toString('base64')})`;
  await fs.writeFile(qbitConf, [
    '[Preferences]',
    'WebUI\\Username=admin',
    `WebUI\\Password_PBKDF2="${qbitHash}"`,
  ].join('\n'));

  await execAsync('docker compose up -d', { cwd: dir, env: dockerEnv() });

  // Steps 3–10: Auto-configure all services (Jellyfin + *arr + qBit + Jellyseerr)
  const stepFailed = (step: number) => {
    try { event.sender.send('install-step-failed', step); } catch { /* window may be closing */ }
  };

  const { failedSteps, apiKeys } = await runAutoSetup({
    adminPassword,
    subtitleLangs: subtitleLangs ?? [],
    ports: {
      jellyfin: 8096, radarr: 7878, sonarr: 8989, lidarr: 8686,
      prowlarr: 9696, bazarr: 6767, qbit: 8090, jellyseerr: 5055,
    },
    vpnEnabled,
    dockerEnvObj: dockerEnv(),
    onProgress: progress,
    onStepFailed: stepFailed,
  });

  // Persist the actual API keys (auto-generated by each service) to .env
  // so the stall monitor and future sessions can use them.
  if (apiKeys.radarr || apiKeys.sonarr || apiKeys.lidarr || apiKeys.prowlarr) {
    const envPath = path.join(dir, '.env');
    let envContent = await fs.readFile(envPath, 'utf8');
    const setKey = (content: string, name: string, value: string) =>
      value ? (content.includes(`${name}=`)
        ? content.replace(new RegExp(`^${name}=.*$`, 'm'), `${name}=${value}`)
        : content + `\n${name}=${value}`)
      : content;
    envContent = setKey(envContent, 'RADARR_API_KEY',   apiKeys.radarr);
    envContent = setKey(envContent, 'SONARR_API_KEY',   apiKeys.sonarr);
    envContent = setKey(envContent, 'LIDARR_API_KEY',   apiKeys.lidarr);
    envContent = setKey(envContent, 'PROWLARR_API_KEY', apiKeys.prowlarr);
    await fs.writeFile(envPath, envContent);
  }

  return { failedSteps };
});

ipcMain.handle('add-vpn', async (_e, { mullvadKey, mullvadAddress }: { mullvadKey: string; mullvadAddress: string }) => {
  const dir = composeDir();
  let env = await fs.readFile(path.join(dir, '.env'), 'utf8');
  env = env.replace(/^MULLVAD_PRIVATE_KEY=.*$/m, '').replace(/^MULLVAD_ADDRESSES=.*$/m, '').trim();
  env += `\nMULLVAD_PRIVATE_KEY=${mullvadKey}\nMULLVAD_ADDRESSES=${mullvadAddress}\n`;
  await fs.writeFile(path.join(dir, '.env'), env);

  const src = app.isPackaged
    ? path.join(process.resourcesPath, 'stack', 'docker-compose.yml')
    : path.join(__dirname, '../../stack/docker-compose.yml');
  await fs.copyFile(src, path.join(dir, 'docker-compose.yml'));

  await execAsync('docker compose down', { cwd: dir, env: dockerEnv() });
  await execAsync('docker compose up -d', { cwd: dir, env: dockerEnv() });
});

ipcMain.handle('remove-vpn', async () => {
  const dir = composeDir();
  let env = await fs.readFile(path.join(dir, '.env'), 'utf8');
  env = env.replace(/^MULLVAD_PRIVATE_KEY=.*$/m, '').replace(/^MULLVAD_ADDRESSES=.*$/m, '').trim() + '\n';
  await fs.writeFile(path.join(dir, '.env'), env);

  const src = app.isPackaged
    ? path.join(process.resourcesPath, 'stack', 'docker-compose-novpn.yml')
    : path.join(__dirname, '../../stack/docker-compose-novpn.yml');
  await fs.copyFile(src, path.join(dir, 'docker-compose.yml'));

  await execAsync('docker compose down', { cwd: dir, env: dockerEnv() });
  await execAsync('docker compose up -d', { cwd: dir, env: dockerEnv() });
});
