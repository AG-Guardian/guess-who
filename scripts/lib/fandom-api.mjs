/**
 * Shared helpers for characters.fandom.com MediaWiki API scripts.
 */

export const API = 'https://characters.fandom.com/api.php';
export const WIKI_BASE = 'https://characters.fandom.com/wiki/';

export const USER_AGENT =
  process.env.FANDOM_USER_AGENT ||
  'GuessWhoDev/1.0 (local data pipeline; contact via repo)';

export const DELAY_MS = Number(process.env.DELAY_MS) || 250;

/** Categories ignored when building attributes (still count toward character popularity). */
export const META_CATEGORIES = new Set([
  'Category:Characters',
  'Category:Stubs',
  'Category:Candidates for deletion',
  'Category:Pages with broken file links',
  'Category:Pages with broken links',
  'Category:Articles in need of cleanup',
  'Category:Articles in need of citations',
]);

export const SKIP_CATEGORY_PREFIXES = [
  'Category:Candidates_for_deletion',
  'Category:Stubs',
  'Category:Pages',
  'Category:Images',
  'Category:Templates',
  'Category:Disambiguation',
];

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${params.action}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.info || JSON.stringify(data.error));
  }
  return data;
}

export function titleToWikiUrl(title) {
  return WIKI_BASE + encodeURIComponent(title.replace(/ /g, '_'));
}

export function characterId(pageid) {
  return `fandom-${pageid}`;
}

export function slugFromCategory(title) {
  return title
    .replace(/^Category:/, '')
    .replace(/_/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function labelFromCategory(title) {
  return title.replace(/^Category:/, '').replace(/_/g, ' ');
}

/** Body/appearance traits: "have black hair", not "are black hair". */
const HAVE_TRAITS =
  /\b(hair|eyes|eyebrows|nose|skin|fur|teeth|horns|wings|tail|scars|tattoos|freckles|mustache|moustache|beard)\b/;

/** Clothing/accessories: "wear high heels", not "are high heels". */
const WEAR_TRAITS = /\b(heels|glasses|hats|armor|armour|uniform|cape|mask|gloves|boots)\b/;

/** Role nouns in "protector of innocence" → "a protector of innocence". */
const ROLE_OF_HEAD =
  /^(protector|destroyer|master|lord|guardian|champion|keeper|wielder|bender|hunter|killer|lover|mentor|saint|demon|angel)\b/;

function articleFor(phrase) {
  return /^[aeiou]/i.test(phrase) ? 'an' : 'a';
}

export function hintFromCategory(title) {
  const label = labelFromCategory(title);
  const lower = label.toLowerCase();

  if (lower.startsWith('characters who ')) {
    let rest = lower.slice('characters who '.length);
    if (HAVE_TRAITS.test(rest)) {
      rest = rest.replace(/^have\s+/, '');
      return `Both characters have ${rest}`;
    }
    if (WEAR_TRAITS.test(rest)) {
      rest = rest.replace(/^wear\s+/, '');
      return `Both characters wear ${rest}`;
    }
    return `Both characters ${rest}`;
  }

  if (lower.endsWith(' characters')) {
    const kind = lower.slice(0, -' characters'.length);
    return `Both characters are ${kind} characters`;
  }

  if (lower.endsWith(' character')) {
    const kind = lower.slice(0, -' character'.length);
    return `Both characters are ${kind} characters`;
  }

  const debutYear = lower.match(/^(\d{4}) characters? debuts?$/);
  if (debutYear) {
    return `Both characters debuted in ${debutYear[1]}`;
  }

  if (HAVE_TRAITS.test(lower)) {
    return `Both characters have ${lower}`;
  }

  if (WEAR_TRAITS.test(lower)) {
    return `Both characters wear ${lower}`;
  }

  const ofMatch = lower.match(/^(.+?) of (.+)$/);
  if (ofMatch) {
    const role = ofMatch[1];
    const obj = ofMatch[2];
    if (ROLE_OF_HEAD.test(role) && !role.endsWith('s')) {
      return `Both characters are ${articleFor(role)} ${role} of ${obj}`;
    }
  }

  if (/^(anti-hero|anti-villain|bond protector|bond destroyer)$/.test(lower)) {
    return `Both characters are ${articleFor(lower)} ${lower}`;
  }

  return `Both characters are ${lower}`;
}

export function shouldSkipCategoryForAttributes(title) {
  if (META_CATEGORIES.has(title)) {
    return true;
  }
  return SKIP_CATEGORY_PREFIXES.some((p) => title.startsWith(p));
}
