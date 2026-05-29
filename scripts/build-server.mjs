// Builds the server bundle, baking the package.json version in via
// esbuild --define so `__GECKO_VERSION__` resolves at runtime on every
// platform (Windows service, macOS daemon, AND the Gecko OS image — which
// otherwise has nothing to set GECKO_VERSION and reported 0.0.0-dev).
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

await build({
  entryPoints: [path.join(root, 'src/server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: path.join(root, 'dist-server/server.js'),
  external: ['fsevents'],
  define: { __GECKO_VERSION__: JSON.stringify(pkg.version) },
});

console.log(`[build-server] bundled with version ${pkg.version}`);
