/**
 * Pre-seed Docker config volumes from stack/seeds/ before the first
 * `docker compose up`. Idempotent — uses `cp -an` (archive, no-clobber)
 * so an existing config is never overwritten.
 *
 * Both the Electron desktop installer and the Gecko OS HTTP server call
 * this from their /api/install handlers, between "generate compose" and
 * "compose up".
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const execAsync = promisify(exec);

interface SeedSpec {
  /** Subdirectory under seedsRoot — e.g. "bazarr" */
  name: string;
  /** Docker volume name to seed — e.g. "bazarr_config" */
  volume: string;
}

const SEEDS: SeedSpec[] = [
  // Bazarr — 15 pre-built language profiles (one per wizard option ×
  // {alone, +english}). The Bazarr API is GET-only for profiles, so they
  // must exist before first start. Regenerate via
  // `node stack/seeds/build-bazarr-seed.mjs`.
  { name: 'bazarr', volume: 'bazarr_config' },
  // Future: more here as seeds are added.
];

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

/**
 * Seed Docker volumes from `seedsRoot/<service-name>/...`. Volumes are
 * created if missing. Existing files inside are preserved (cp -an).
 *
 * @param seedsRoot Absolute path to the seeds directory (typically
 *                  `<stackDir>/seeds` after the install handler has copied
 *                  `stack/seeds/` into the user's compose dir).
 * @param dockerEnvObj Env including PATH that finds the `docker` binary.
 */
export async function seedDockerVolumes(
  seedsRoot: string,
  dockerEnvObj: NodeJS.ProcessEnv,
): Promise<{ seeded: string[]; skipped: string[] }> {
  const seeded: string[] = [];
  const skipped: string[] = [];

  for (const { name, volume } of SEEDS) {
    const src = path.join(seedsRoot, name);
    if (!await exists(src)) {
      skipped.push(`${name} (no source dir)`);
      continue;
    }

    // Docker normalises Windows path separators automatically on Docker
    // Desktop, but we forward-slash anyway for cross-platform consistency.
    const srcMount = src.replace(/\\/g, '/');

    // Create the volume idempotently
    await execAsync(`docker volume create ${volume}`, { env: dockerEnvObj });

    // Copy seed into the volume via a throwaway alpine container, but only
    // if the volume is empty (re-install safety: never wipe existing config).
    // We can't use `cp -an` because Alpine's busybox cp handles -n differently
    // from GNU coreutils and silently skips directory contents.
    const cmd = (
      'if [ -z "$(ls -A /dest 2>/dev/null)" ]; then ' +
      '  cp -a /src/. /dest/ && echo SEEDED; ' +
      'else ' +
      '  echo SKIPPED_NONEMPTY; ' +
      'fi'
    );
    const { stdout } = await execAsync(
      `docker run --rm -v ${volume}:/dest -v "${srcMount}":/src:ro alpine sh -c '${cmd}'`,
      { env: dockerEnvObj, maxBuffer: 1024 * 1024 },
    );
    if (stdout.includes('SEEDED')) seeded.push(name);
    else skipped.push(`${name} (volume already had data)`);
  }

  return { seeded, skipped };
}
