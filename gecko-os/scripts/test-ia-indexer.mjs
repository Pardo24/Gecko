// Standalone validation of the Internet Archive indexer add — mirrors
// stack/gecko-init/init.py:ensure_prowlarr_indexer() against a real Prowlarr.
// Usage: node test-ia-indexer.mjs <apiKey> [baseUrl]
import http from 'node:http';

const KEY = process.argv[2];
const BASE = process.argv[3] || 'http://localhost:9797';
if (!KEY) { console.error('need api key'); process.exit(1); }

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const u = new URL(BASE + path);
    const r = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: { 'X-Api-Key': KEY, 'Content-Type': 'application/json',
                 ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  // 1. schema has internetarchive?
  const s = await req('GET', '/api/v1/indexer/schema');
  if (s.status !== 200) { console.log('FAIL schema', s.status); process.exit(1); }
  const defs = JSON.parse(s.body);
  const ia = defs.find(d => d.definitionName === 'internetarchive');
  console.log('schema defs:', defs.length, '| internetarchive present:', !!ia);
  if (!ia) { console.log('FAIL: definition not offered'); process.exit(1); }
  console.log('  name:', ia.name, '| protocol:', ia.protocol, '| privacy:', ia.privacy);

  // 2. the schema ships appProfileId:0 which Prowlarr rejects — pick a real
  //    app profile id (first one; fallback 1).
  const ap = await req('GET', '/api/v1/appprofile');
  const profiles = ap.status === 200 ? JSON.parse(ap.body) : [];
  const appProfileId = profiles[0]?.id || 1;
  console.log('app profiles:', profiles.map(p => `${p.id}:${p.name}`).join(', ') || '(none)', '→ using', appProfileId);

  const schema = { ...ia, enable: true, name: 'Internet Archive', appProfileId, tags: ia.tags || [] };

  // 3. POST with forceSave (like init.py)
  const p = await req('POST', '/api/v1/indexer?forceSave=true', schema);
  console.log('POST status:', p.status);
  if (p.status >= 300) { console.log('POST body:', p.body.slice(0, 500)); }

  // 4. confirm it now exists
  const list = await req('GET', '/api/v1/indexer');
  const added = list.status === 200 && JSON.parse(list.body)
    .some(i => i.definitionName === 'internetarchive' || i.name === 'Internet Archive');
  console.log('indexer present after add:', added);

  // 5. idempotency: a second add should be skipped by the existence check
  const list2 = JSON.parse((await req('GET', '/api/v1/indexer')).body);
  const dupeWouldSkip = list2.some(i => i.definitionName === 'internetarchive' || i.name === 'Internet Archive');
  console.log('idempotent re-run would skip:', dupeWouldSkip);

  console.log(added ? 'RESULT: PASS' : 'RESULT: FAIL');
  process.exit(added ? 0 : 1);
})();
