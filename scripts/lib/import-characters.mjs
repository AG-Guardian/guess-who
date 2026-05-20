/**
 * Fetch all Character wiki pages plus categories via MediaWiki API.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  api,
  sleep,
  DELAY_MS,
  titleToWikiUrl,
  characterId,
} from './fandom-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMPORTED_DIR = join(__dirname, '..', '..', 'public', 'data', 'imported');
const DEFAULT_RAW_PATH = join(IMPORTED_DIR, 'fandom-characters-raw.json');

const BATCH = 50;

export async function fetchAllCharacterPages(limit) {
  const pages = [];
  let cmcontinue;
  do {
    const data = await api({
      action: 'query',
      list: 'categorymembers',
      cmtitle: 'Category:Characters',
      cmlimit: '500',
      cmtype: 'page',
      cmnamespace: '0',
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    for (const m of data.query.categorymembers) {
      pages.push({ pageid: m.pageid, title: m.title });
      if (limit > 0 && pages.length >= limit) {
        return pages;
      }
    }
    cmcontinue = data.continue?.cmcontinue;
    if (cmcontinue) {
      await sleep(DELAY_MS);
    }
  } while (cmcontinue);
  return pages;
}

async function fetchCategoriesForPageIds(pageids) {
  const out = new Map();
  let clcontinue;
  do {
    const data = await api({
      action: 'query',
      prop: 'categories',
      pageids: pageids.join('|'),
      cllimit: '500',
      ...(clcontinue ? { clcontinue } : {}),
    });
    for (const page of Object.values(data.query?.pages || {})) {
      if (page.missing !== undefined) {
        continue;
      }
      const id = Number(page.pageid);
      const prev = out.get(id) || [];
      const cats = (page.categories || []).map((c) => c.title);
      out.set(id, prev.concat(cats));
    }
    clcontinue = data.continue?.clcontinue;
    if (clcontinue) {
      await sleep(DELAY_MS);
    }
  } while (clcontinue);
  return out;
}

/**
 * @param {{ limit?: number, rawPath?: string }} [opts]
 * @returns {Promise<Record<string, { pageid, title, wikiUrl, categories, categoryCount }>>}
 */
export async function buildRawCharacterDataset(opts = {}) {
  const envLimit = Number(process.env.LIMIT);
  const limit =
    opts.limit ??
    (Number.isFinite(envLimit) && envLimit > 0 ? envLimit : 0);
  console.log('Listing pages in Category:Characters…');
  const pages = await fetchAllCharacterPages(limit);
  console.log(`Found ${pages.length} character pages${limit ? ` (LIMIT=${limit})` : ''}.`);

  const raw = {};
  for (let i = 0; i < pages.length; i += BATCH) {
    const batch = pages.slice(i, i + BATCH);
    const ids = batch.map((p) => p.pageid);
    process.stdout.write(
      `Categories ${i + 1}-${Math.min(i + BATCH, pages.length)} / ${pages.length}…\n`
    );
    const catMap = await fetchCategoriesForPageIds(ids);
    for (const { pageid, title } of batch) {
      const categories = catMap.get(Number(pageid)) || [];
      raw[characterId(pageid)] = {
        pageid,
        title,
        wikiUrl: titleToWikiUrl(title),
        categories,
        categoryCount: categories.length,
      };
    }
    await sleep(DELAY_MS);
  }

  const outPath = opts.rawPath ?? DEFAULT_RAW_PATH;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(raw));

  const counts = Object.values(raw).map((c) => c.categoryCount);
  counts.sort((a, b) => a - b);
  const median = counts[Math.floor(counts.length / 2)] ?? 0;
  console.log(`\nWrote ${Object.keys(raw).length} characters to ${outPath}`);
  console.log(
    `Category count: min=${counts[0] ?? 0} median=${median} max=${counts[counts.length - 1] ?? 0}`
  );

  return raw;
}
