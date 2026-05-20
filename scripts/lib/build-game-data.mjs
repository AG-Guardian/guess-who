/**
 * Filter characters and build attributes from the union of categories.
 *
 * Exports buildGameData(raw, backlinksCache) for use by fandom-populate.mjs.
 *
 * Writes:
 *   public/data/characters.json
 *   public/data/attributes.json   — { index, attributes }
 *
 * Removes legacy public/data/tags/ if present.
 */

import { existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  slugFromCategory,
  labelFromCategory,
  hintFromCategory,
  shouldSkipCategoryForAttributes,
} from './fandom-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const dataDir = join(root, 'public', 'data');
const legacyTagsDir = join(dataDir, 'tags');
const backlinksPath = join(
  root,
  'public',
  'data',
  'imported',
  'fandom-backlinks.json'
);

function loadBacklinksFromDisk() {
  if (!existsSync(backlinksPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(backlinksPath, 'utf8'));
  } catch {
    console.warn(`Could not parse ${backlinksPath}; treating as empty.`);
    return {};
  }
}

function printDistribution(raw) {
  const counts = Object.values(raw)
    .map((c) => c.categoryCount)
    .sort((a, b) => a - b);
  const thresholds = [4, 6, 8, 10, 12, 15, 20];
  console.log('\nCharacters remaining at each MIN_CHARACTER_CATEGORIES threshold:');
  for (const t of thresholds) {
    const n = counts.filter((c) => c >= t).length;
    console.log(`  ≥${t}: ${n}`);
  }
}

function resolvePrefilter(backlinksCache) {
  const hasPayload = Object.keys(backlinksCache).length > 0;
  const usePrefilter =
    process.env.USE_PREFILTER === '1' ||
    (process.env.USE_PREFILTER !== '0' && hasPayload);

  const MIN_CHARACTER_CATEGORIES =
    Number(process.env.MIN_CHARACTER_CATEGORIES) || 8;
  const PREFILTER_MIN_CATEGORIES =
    Number(process.env.PREFILTER_MIN_CATEGORIES) || 11;
  const PREFILTER_MIN_BACKLINKS =
    Number(process.env.PREFILTER_MIN_BACKLINKS) || 1;

  function keepCharacter(id, c) {
    if (usePrefilter) {
      const bl = backlinksCache[id]?.backlinks ?? 0;
      return (
        c.categoryCount >= PREFILTER_MIN_CATEGORIES &&
        bl >= PREFILTER_MIN_BACKLINKS
      );
    }
    return c.categoryCount >= MIN_CHARACTER_CATEGORIES;
  }

  return { usePrefilter, keepCharacter };
}

/** @param {Record<string, any>} raw @param {Record<string, any>} backlinksCache */
export function buildGameData(raw, backlinksCache) {
  const MIN_ATTRIBUTE_SIZE =
    Number(
      process.env.MIN_ATTRIBUTE_SIZE || process.env.MIN_TAG_SIZE
    ) || 20;
  const MAX_ATTRIBUTE_SIZE =
    Number(
      process.env.MAX_ATTRIBUTE_SIZE || process.env.MAX_TAG_SIZE
    ) || 0;
  const MAX_ATTRIBUTES =
    Number(process.env.MAX_ATTRIBUTES || process.env.MAX_TAGS) || 0;
  const MIN_CHARACTER_CATEGORIES =
    Number(process.env.MIN_CHARACTER_CATEGORIES) || 8;
  const PREFILTER_MIN_CATEGORIES =
    Number(process.env.PREFILTER_MIN_CATEGORIES) || 11;
  const PREFILTER_MIN_BACKLINKS =
    Number(process.env.PREFILTER_MIN_BACKLINKS) || 1;

  const { usePrefilter, keepCharacter } = resolvePrefilter(
    backlinksCache ?? {}
  );

  printDistribution(raw);

  if (
    usePrefilter &&
    (!backlinksCache || Object.keys(backlinksCache).length === 0)
  ) {
    console.error(
      'Prefilter requested but no backlink counts were provided.\n' +
        'Run npm run fandom-populate, or create public/data/imported/fandom-backlinks.json.'
    );
    process.exit(1);
  }

  const kept = Object.entries(raw).filter(([id, c]) => keepCharacter(id, c));
  if (usePrefilter) {
    console.log(
      `\nPrefilter: categories≥${PREFILTER_MIN_CATEGORIES}, backlinks≥${PREFILTER_MIN_BACKLINKS}`
    );
  }
  console.log(
    `Keeping ${kept.length} / ${Object.keys(raw).length} characters` +
      (usePrefilter
        ? ''
        : ` (MIN_CHARACTER_CATEGORIES=${MIN_CHARACTER_CATEGORIES})`)
  );

  const characters = {};
  for (const [id, c] of kept) {
    characters[id] = {
      id,
      name: c.title,
      wikiUrl: c.wikiUrl,
      categoryCount: c.categoryCount,
    };
  }

  const attributeMap = new Map();

  for (const [charId] of kept) {
    for (const catTitle of raw[charId].categories) {
      if (shouldSkipCategoryForAttributes(catTitle)) {
        continue;
      }
      const slug = slugFromCategory(catTitle);
      if (!slug) {
        continue;
      }
      if (!attributeMap.has(slug)) {
        attributeMap.set(slug, {
          id: slug,
          label: labelFromCategory(catTitle),
          hint: hintFromCategory(catTitle),
          categoryTitle: catTitle,
          characterIds: new Set(),
        });
      }
      attributeMap.get(slug).characterIds.add(charId);
    }
  }

  let attributes = [...attributeMap.values()]
    .map((a) => {
      const characterIds = [...a.characterIds];
      return {
        ...a,
        characterIds,
        count: characterIds.length,
      };
    })
    .filter(
      (a) =>
        a.count >= MIN_ATTRIBUTE_SIZE &&
        (MAX_ATTRIBUTE_SIZE <= 0 || a.count <= MAX_ATTRIBUTE_SIZE)
    );

  attributes.sort((a, b) => b.count - a.count);
  if (MAX_ATTRIBUTES > 0) {
    attributes = attributes.slice(0, MAX_ATTRIBUTES);
  }

  const sizes = attributes.map((a) => a.count).sort((a, b) => a - b);
  const atLeast = (n) => sizes.filter((c) => c >= n).length;
  const sizeRange =
    MAX_ATTRIBUTE_SIZE > 0
      ? `${MIN_ATTRIBUTE_SIZE}–${MAX_ATTRIBUTE_SIZE}`
      : `≥${MIN_ATTRIBUTE_SIZE}`;
  console.log(
    `Built ${attributes.length} attributes with ${sizeRange} characters (from union of categories).`
  );
  console.log('Attribute size thresholds (kept):');
  for (const t of [100, 200, 500, 1000]) {
    console.log(`  ≥${t}: ${atLeast(t)} attributes`);
  }
  console.log('Top 10 attributes by size:');
  attributes
    .slice(0, 10)
    .forEach((a) => console.log(`  ${a.count}\t${a.label}`));

  if (existsSync(legacyTagsDir)) {
    rmSync(legacyTagsDir, { recursive: true });
    console.log('\nRemoved legacy public/data/tags/');
  }

  writeFileSync(join(dataDir, 'characters.json'), JSON.stringify(characters));

  const index = attributes.map(({ id, label, count }) => ({
    id,
    label,
    count,
  }));
  const attributesById = {};
  for (const a of attributes) {
    const { categoryTitle: _c, count: _n, ...payload } = a;
    attributesById[a.id] = payload;
  }

  writeFileSync(
    join(dataDir, 'attributes.json'),
    JSON.stringify({ index, attributes: attributesById })
  );

  console.log(
    `\nWrote public/data/characters.json (${Object.keys(characters).length} chars)`
  );
  console.log(`Wrote public/data/attributes.json (${attributes.length} attributes)`);
}

/** Standalone: read raw + backlinks from disk and build game JSON. */
function cliMain() {
  const rawPath = join(
    root,
    'public',
    'data',
    'imported',
    'fandom-characters-raw.json'
  );
  let raw;
  try {
    raw = JSON.parse(readFileSync(rawPath, 'utf8'));
  } catch {
    console.error(`Missing ${rawPath}. Run: npm run fandom-populate`);
    process.exit(1);
  }
  buildGameData(raw, loadBacklinksFromDisk());
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  cliMain();
}
