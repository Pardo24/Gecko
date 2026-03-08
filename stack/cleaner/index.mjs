// Gecko Cleaner — monitors Radarr/Sonarr/Lidarr queues and removes stalled/failed downloads
// Runs every INTERVAL_MINUTES inside Docker on the media_net network.

const INTERVAL_MS = parseInt(process.env.INTERVAL_MINUTES ?? '10') * 60 * 1000;

const SERVICES = [
  { name: 'Radarr', host: process.env.RADARR_HOST, apiKey: process.env.RADARR_API_KEY, version: 'v3' },
  { name: 'Sonarr', host: process.env.SONARR_HOST, apiKey: process.env.SONARR_API_KEY, version: 'v3' },
  { name: 'Lidarr', host: process.env.LIDARR_HOST, apiKey: process.env.LIDARR_API_KEY, version: 'v1' },
];

const REQUEST_TIMEOUT_MS = 10000;

// Tracker messages that indicate a torrent will never recover
const BAD_TRACKER_KEYWORDS = [
  'unregistered', 'not registered', 'torrent not found', 'unknown torrent',
  'banned', 'account suspended', 'removed by', 'could not connect to tracker',
  'tracker is down', 'announce url is not valid',
];

async function getQueue(host, apiKey, version) {
  const res = await fetch(`${host}/api/${version}/queue?pageSize=200`, {
    headers: { 'X-Api-Key': apiKey },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.records ?? []);
}

async function removeItem(host, apiKey, version, id) {
  const res = await fetch(
    `${host}/api/${version}/queue/${id}?blocklist=true&removeFromClient=true`,
    { method: 'DELETE', headers: { 'X-Api-Key': apiKey }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

function hasBadTrackerMessage(statusMessages) {
  if (!Array.isArray(statusMessages)) return false;
  return statusMessages.some(sm =>
    (sm.messages ?? []).some(msg =>
      BAD_TRACKER_KEYWORDS.some(kw => msg.toLowerCase().includes(kw))
    )
  );
}

function classifyItem(item) {
  if (item.status === 'failed') return 'failed';
  if (item.trackedDownloadStatus === 'error') return 'error';
  if (item.trackedDownloadState === 'downloadFailed') return 'downloadFailed';
  if (item.trackedDownloadState === 'importFailed') return 'importFailed';
  if (item.trackedDownloadStatus === 'warning' && hasBadTrackerMessage(item.statusMessages))
    return 'bad tracker';
  return null;
}

async function cleanService({ name, host, apiKey, version }) {
  if (!host || !apiKey) {
    console.log(`[${name}] Skipping — not configured`);
    return;
  }

  let records;
  try {
    records = await getQueue(host, apiKey, version);
  } catch (err) {
    console.log(`[${name}] Queue fetch failed: ${err.message}`);
    return;
  }

  const toRemove = records.map(item => ({ item, reason: classifyItem(item) })).filter(x => x.reason);
  let removed = 0;

  await Promise.all(toRemove.map(async ({ item, reason }) => {
    const title = item.title ?? item.movieTitle ?? item.seriesTitle ?? `id:${item.id}`;
    console.log(`[${name}] Removing [${reason}]: ${title}`);
    try {
      await removeItem(host, apiKey, version, item.id);
      removed++;
    } catch (err) {
      console.log(`[${name}] Remove failed: ${err.message}`);
    }
  }));

  console.log(`[${name}] Done — ${removed} removed, ${records.length - removed} clean`);
}

let isRunning = false;

async function run() {
  if (isRunning) return;
  isRunning = true;
  try {
    console.log(`\n[Gecko Cleaner] ${new Date().toISOString()}`);
    await Promise.all(SERVICES.map(cleanService));
  } finally {
    isRunning = false;
  }
}

run();
setInterval(run, INTERVAL_MS);
