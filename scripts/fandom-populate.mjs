/**
 * One-step data pipeline:
 * import from Fandom → fetch backlinks → filter → write characters.json + attributes.json.
 *
 *   node scripts/fandom-populate.mjs
 *   LIMIT=500 node scripts/fandom-populate.mjs   # dev sample
 *
 * Rebuild game JSON only (from local imported/ cache on disk):
 *
 *   BUILD_ONLY=1 node scripts/fandom-populate.mjs
 *
 * Defaults match the shipped game pool (prefilter + attribute size bounds).
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildRawCharacterDataset } from './lib/import-characters.mjs';
import { buildBacklinksCache } from './lib/fetch-backlinks.mjs';
import { buildGameData } from './lib/build-game-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const rawPath = join(root, 'public', 'data', 'imported', 'fandom-characters-raw.json');
const backlinksPath = join(root, 'public', 'data', 'imported', 'fandom-backlinks.json');

if (process.env.USE_PREFILTER === undefined) {
  process.env.USE_PREFILTER = '1';
}
if (process.env.MIN_ATTRIBUTE_SIZE === undefined) {
  process.env.MIN_ATTRIBUTE_SIZE = '50';
}
if (process.env.MAX_ATTRIBUTE_SIZE === undefined) {
  process.env.MAX_ATTRIBUTE_SIZE = '500';
}

async function main() {
  if (process.env.BUILD_ONLY === '1') {
    console.log(
      'BUILD_ONLY — reading imported cache files and writing game JSON:\n'
    );
    let raw;
    try {
      raw = JSON.parse(readFileSync(rawPath, 'utf8'));
    } catch {
      console.error(
        `Missing or invalid ${rawPath}. Run npm run fandom-populate (without BUILD_ONLY=1) once to fetch from Fandom.`
      );
      process.exit(1);
    }

    let backlinks;
    try {
      backlinks = JSON.parse(readFileSync(backlinksPath, 'utf8'));
    } catch {
      console.error(
        `Missing or invalid ${backlinksPath}. Run npm run fandom-populate (without BUILD_ONLY=1) once to build the backlink cache.`
      );
      process.exit(1);
    }

    buildGameData(raw, backlinks);
    console.log('\nDone.');
    return;
  }

  console.log('=== Guess Who — populate game data ===\n');

  console.log('Step 1/3 — Import characters from Fandom…\n');
  const raw = await buildRawCharacterDataset();

  console.log('\nStep 2/3 — Inbound backlinks (incremental cache)…\n');
  const backlinks = await buildBacklinksCache(raw);

  console.log('\nStep 3/3 — Filter + build attributes…\n');
  buildGameData(raw, backlinks);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
