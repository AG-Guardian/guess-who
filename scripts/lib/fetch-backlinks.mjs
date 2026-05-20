/**
 * Batch-fetch inbound link counts (linkshere) for character pages.
 * Merges with an optional on-disk cache; only missing entries are fetched.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { api, sleep, DELAY_MS } from './fandom-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMPORTED_DIR = join(__dirname, '..', '..', 'public', 'data', 'imported');

/** @exports default path for CLI */
export function defaultBacklinksPath() {
  return join(IMPORTED_DIR, 'fandom-backlinks.json');
}

async function linkshereCount(pageid) {
  let total = 0;
  let lhcontinue;
  do {
    const data = await api({
      action: 'query',
      prop: 'linkshere',
      pageids: String(pageid),
      lhlimit: '500',
      lhnamespace: '0',
      ...(lhcontinue ? { lhcontinue } : {}),
    });
    const page = data.query?.pages?.[pageid] || data.query?.pages?.[String(pageid)];
    total += page?.linkshere?.length || 0;
    lhcontinue = data.continue?.lhcontinue;
    if (lhcontinue) {
      await sleep(150);
    }
  } while (lhcontinue);
  return total;
}

async function batchLinkshereCounts(pageids) {
  const map = new Map();
  const data = await api({
    action: 'query',
    prop: 'linkshere',
    pageids: pageids.join('|'),
    lhlimit: '500',
    lhnamespace: '0',
  });
  for (const page of Object.values(data.query?.pages || {})) {
    if (page.missing !== undefined) {
      continue;
    }
    const count = page.linkshere?.length || 0;
    map.set(Number(page.pageid), count);
    if (count >= 500 && data.continue?.lhcontinue) {
      map.set(Number(page.pageid), await linkshereCount(page.pageid));
    }
  }
  return map;
}

/**
 * @param {Record<string, { pageid: number, title: string, categoryCount: number }>} raw
 * @param {{ cachePath?: string }} [opts]
 * @returns {Promise<Record<string, { title: string, pageid: number, categoryCount: number, backlinks: number }>>}
 */
export async function buildBacklinksCache(raw, opts = {}) {
  const entries = Object.entries(raw).map(([id, c]) => ({ id, ...c }));
  const cachePath = opts.cachePath ?? defaultBacklinksPath();

  let cache = {};
  if (existsSync(cachePath)) {
    try {
      cache = JSON.parse(readFileSync(cachePath, 'utf8'));
    } catch {
      cache = {};
    }
  }

  const missing = entries.filter((e) => cache[e.id]?.backlinks === undefined);
  const batchSize = Number(process.env.BATCH) || 50;
  console.log(
    `Backlinks: ${entries.length} characters, ${missing.length} need fetching (batch=${batchSize})`
  );

  for (let i = 0; i < missing.length; i += batchSize) {
    const chunk = missing.slice(i, i + batchSize);
    const counts = await batchLinkshereCounts(chunk.map((e) => e.pageid));
    for (const e of chunk) {
      cache[e.id] = {
        title: e.title,
        pageid: e.pageid,
        categoryCount: e.categoryCount,
        backlinks: counts.get(e.pageid) ?? 0,
      };
    }
    if ((i + batchSize) % 500 === 0 || i + batchSize >= missing.length) {
      mkdirSync(dirname(cachePath), { recursive: true });
      writeFileSync(cachePath, JSON.stringify(cache));
      console.log(`  cached ${Math.min(i + batchSize, missing.length)} / ${missing.length}`);
    }
    await sleep(DELAY_MS);
  }

  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, JSON.stringify(cache));

  const bl = entries.map((e) => cache[e.id]?.backlinks ?? 0);
  bl.sort((a, b) => a - b);
  console.log(`\nWrote ${cachePath}`);
  console.log(`  zero backlinks: ${bl.filter((n) => n === 0).length}`);
  console.log(`  median: ${bl[Math.floor(bl.length / 2)] ?? 0}, max: ${bl[bl.length - 1] ?? 0}`);
  return cache;
}
