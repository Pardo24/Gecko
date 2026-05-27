// Regenerate stack/seeds/bazarr/bazarr.db with one language profile per
// wizard option (8 langs) × {alone, +english}. Idempotent — re-run any time
// the wizard's SUBTITLE_LANGS list changes.
//
// Usage: node stack/seeds/build-bazarr-seed.mjs
//
// Why this exists: Bazarr's API can't CREATE language profiles (GET-only),
// so we ship them pre-baked in the SQLite that's seeded into Bazarr's
// config volume before first start.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(HERE, 'bazarr', 'bazarr.db');

// Wizard-supported languages. The `code3` is Bazarr's 3-letter ID
// (ISO 639-2/B for most, which is what Bazarr's language list uses).
const LANGS = [
  { code3: 'cat', display: 'Català'    },
  { code3: 'spa', display: 'Castellano' },
  { code3: 'fre', display: 'Français'   },
  { code3: 'ger', display: 'Deutsch'    },
  { code3: 'por', display: 'Português'  },
  { code3: 'ita', display: 'Italiano'   },
  { code3: 'jpn', display: '日本語'      },
];

function profileItem(id, code3) {
  return {
    id,
    language: code3,
    audio_exclude: 'False',
    hi: 'False',
    forced: 'False',
  };
}

function buildProfiles() {
  const out = [];
  let id = 1;

  // English-only baseline
  out.push({
    profileId: id++,
    name: 'English only',
    items: JSON.stringify([profileItem(1, 'eng')]),
  });

  // For each non-English language: "<Lang> + English" and "<Lang> only"
  for (const { code3, display } of LANGS) {
    out.push({
      profileId: id++,
      name: `${display} + English`,
      items: JSON.stringify([
        profileItem(1, code3),
        profileItem(2, 'eng'),
      ]),
    });
    out.push({
      profileId: id++,
      name: `${display} only`,
      items: JSON.stringify([profileItem(1, code3)]),
    });
  }

  return out;
}

function main() {
  const db = new DatabaseSync(DB_PATH);

  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM table_languages_profiles');
    const ins = db.prepare(`
      INSERT INTO table_languages_profiles
        (profileId, name, items, cutoff, originalFormat, mustContain, mustNotContain, tag)
      VALUES (?, ?, ?, NULL, NULL, '[]', '[]', NULL)
    `);
    for (const p of buildProfiles()) {
      ins.run(p.profileId, p.name, p.items);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const rows = db.prepare(
    'SELECT profileId, name FROM table_languages_profiles ORDER BY profileId'
  ).all();
  console.log(`Wrote ${rows.length} profiles to ${DB_PATH}:`);
  for (const r of rows) console.log(`  ${r.profileId}. ${r.name}`);

  db.close();
}

main();
