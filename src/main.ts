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

app.on('ready', () => { createWindow(); });
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

function stackBase() {
  return app.isPackaged ? path.join(process.resourcesPath, 'stack') : path.join(__dirname, '../../stack');
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
});

ipcMain.handle('stop-stack', async () => {
  await execAsync('docker compose down', { cwd: composeDir(), env: dockerEnv() });
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

ipcMain.handle('get-media-list', async () => {
  try {
    const content = await fs.readFile(path.join(composeDir(), '.env'), 'utf8');
    const cfg = parseEnv(content);
    const { RADARR_API_KEY: radarrKey, SONARR_API_KEY: sonarrKey } = cfg;
    const radarrPort = cfg.RADARR_PORT ?? '7878';
    const sonarrPort = cfg.SONARR_PORT ?? '8989';

    const get = async (url: string, apiKey: string) => {
      const res = await fetch(url, { headers: { 'X-Api-Key': apiKey }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      return res.json();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [movies, series]: [any[], any[]] = await Promise.all([
      radarrKey ? get(`http://localhost:${radarrPort}/api/v3/movie`, radarrKey) : Promise.resolve([]),
      sonarrKey ? get(`http://localhost:${sonarrPort}/api/v3/series`, sonarrKey) : Promise.resolve([]),
    ]);

    return [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...movies.filter((m: any) => m.sizeOnDisk > 0).map((m: any) => ({
        id: m.id, title: m.title, year: m.year, type: 'movie', sizeOnDisk: m.sizeOnDisk,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...series.filter((s: any) => (s.statistics?.sizeOnDisk ?? 0) > 0).map((s: any) => ({
        id: s.id, title: s.title, year: s.year, type: 'series', sizeOnDisk: s.statistics.sizeOnDisk,
      })),
    ].sort((a, b) => b.sizeOnDisk - a.sizeOnDisk);
  } catch {
    return [];
  }
});

ipcMain.handle('delete-media', async (_e, { id, type, searchAfter }: { id: number; type: 'movie' | 'series'; searchAfter: boolean }) => {
  const content = await fs.readFile(path.join(composeDir(), '.env'), 'utf8');
  const cfg = parseEnv(content);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doFetch = async (url: string, method: string, apiKey: string, body?: any) => {
    const res = await fetch(url, {
      method,
      headers: { 'X-Api-Key': apiKey, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  };

  if (type === 'movie') {
    const key = cfg.RADARR_API_KEY;
    const base = `http://localhost:${cfg.RADARR_PORT ?? '7878'}`;
    if (searchAfter) {
      const movie = await (await doFetch(`${base}/api/v3/movie/${id}`, 'GET', key)).json();
      if (movie.movieFile?.id) await doFetch(`${base}/api/v3/movieFile/${movie.movieFile.id}`, 'DELETE', key);
      await doFetch(`${base}/api/v3/command`, 'POST', key, { name: 'MoviesSearch', movieIds: [id] });
    } else {
      await doFetch(`${base}/api/v3/movie/${id}?deleteFiles=true`, 'DELETE', key);
    }
  } else {
    const key = cfg.SONARR_API_KEY;
    const base = `http://localhost:${cfg.SONARR_PORT ?? '8989'}`;
    if (searchAfter) {
      const files = await (await doFetch(`${base}/api/v3/episodeFile?seriesId=${id}`, 'GET', key)).json();
      if (Array.isArray(files) && files.length > 0) {
        await fetch(`${base}/api/v3/episodeFile/bulk`, {
          method: 'DELETE',
          headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ episodeFileIds: files.map((f: { id: number }) => f.id) }),
          signal: AbortSignal.timeout(15000),
        });
      }
      await doFetch(`${base}/api/v3/command`, 'POST', key, { name: 'SeriesSearch', seriesId: id });
    } else {
      await doFetch(`${base}/api/v3/series/${id}?deleteFiles=true`, 'DELETE', key);
    }
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
  await fs.copyFile(path.join(stackBase(), composeFile), path.join(dir, 'docker-compose.yml'));
  await fs.cp(path.join(stackBase(), 'cleaner'), path.join(dir, 'cleaner'), { recursive: true });

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

  await execAsync('docker compose up -d --build', { cwd: dir, env: dockerEnv() });

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
    // Restart cleaner so it picks up the freshly written API keys
    try { await execAsync('docker compose up -d --no-deps gecko-cleaner', { cwd: dir, env: dockerEnv() }); } catch (err) { console.warn('[install] gecko-cleaner restart failed:', err); }
  }

  return { failedSteps };
});

ipcMain.handle('add-vpn', async (_e, { mullvadKey, mullvadAddress }: { mullvadKey: string; mullvadAddress: string }) => {
  const dir = composeDir();
  let env = await fs.readFile(path.join(dir, '.env'), 'utf8');
  env = env.replace(/^MULLVAD_PRIVATE_KEY=.*$/m, '').replace(/^MULLVAD_ADDRESSES=.*$/m, '').trim();
  env += `\nMULLVAD_PRIVATE_KEY=${mullvadKey}\nMULLVAD_ADDRESSES=${mullvadAddress}\n`;
  await fs.writeFile(path.join(dir, '.env'), env);

  await fs.copyFile(path.join(stackBase(), 'docker-compose.yml'), path.join(dir, 'docker-compose.yml'));

  await execAsync('docker compose down', { cwd: dir, env: dockerEnv() });
  await execAsync('docker compose up -d', { cwd: dir, env: dockerEnv() });
});

ipcMain.handle('remove-vpn', async () => {
  const dir = composeDir();
  let env = await fs.readFile(path.join(dir, '.env'), 'utf8');
  env = env.replace(/^MULLVAD_PRIVATE_KEY=.*$/m, '').replace(/^MULLVAD_ADDRESSES=.*$/m, '').trim() + '\n';
  await fs.writeFile(path.join(dir, '.env'), env);

  await fs.copyFile(path.join(stackBase(), 'docker-compose-novpn.yml'), path.join(dir, 'docker-compose.yml'));

  await execAsync('docker compose down', { cwd: dir, env: dockerEnv() });
  await execAsync('docker compose up -d', { cwd: dir, env: dockerEnv() });
});
