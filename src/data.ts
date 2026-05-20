import type { Attribute, AttributeSummary, Character } from './types';

const fetchOpts: RequestInit = { cache: 'no-store' };

export interface AttributesPayload {
  index: AttributeSummary[];
  attributes: Record<string, Attribute>;
}

let attributesBundlePromise: Promise<AttributesPayload> | null = null;

export async function loadCharacters(): Promise<Record<string, Character>> {
  const res = await fetch('/data/characters.json', fetchOpts);
  if (!res.ok) {
    throw new Error('Failed to load characters');
  }
  const data = (await res.json()) as Record<string, Character>;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid characters.json format');
  }
  return data;
}

export function loadAttributesData(): Promise<AttributesPayload> {
  if (!attributesBundlePromise) {
    attributesBundlePromise = (async () => {
      const res = await fetch('/data/attributes.json', fetchOpts);
      if (!res.ok) {
        throw new Error('Failed to load attributes');
      }
      const data = (await res.json()) as AttributesPayload;
      if (
        !Array.isArray(data.index) ||
        !data.attributes ||
        typeof data.attributes !== 'object' ||
        Array.isArray(data.attributes)
      ) {
        throw new Error('Invalid attributes.json format');
      }
      return data;
    })();
  }
  return attributesBundlePromise;
}

export async function loadAttribute(attributeId: string): Promise<Attribute> {
  const { attributes } = await loadAttributesData();
  const attr = attributes[attributeId];
  if (!attr) {
    throw new Error(`Attribute not found: ${attributeId}`);
  }
  return attr;
}

export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function playableIds(
  attribute: Attribute,
  characters: Record<string, Character>
): string[] {
  return attribute.characterIds.filter((id) => characters[id]);
}

/** Pick a random character from the attribute pool, optionally excluding one id. */
export function pickRandomCharacterId(
  attribute: Attribute,
  characters: Record<string, Character>,
  excludeId?: string
): string {
  let candidates = playableIds(attribute, characters);
  if (excludeId && candidates.length > 1) {
    candidates = candidates.filter((id) => id !== excludeId);
  }
  if (candidates.length === 0) {
    throw new Error('No characters available in this attribute group.');
  }
  return pickRandom(candidates);
}

export async function createRandomRound() {
  const [{ index, attributes }, characters] = await Promise.all([
    loadAttributesData(),
    loadCharacters(),
  ]);
  const charCount = Object.keys(characters).length;
  if (charCount < 2) {
    throw new Error(
      'Character data is empty or missing. Run npm run fandom-pipeline, then hard-refresh the page.'
    );
  }

  const order = [...index].sort(() => Math.random() - 0.5);
  for (const summary of order) {
    const attribute = attributes[summary.id];
    if (!attribute) {
      continue;
    }
    if (playableIds(attribute, characters).length >= 2) {
      return { attribute };
    }
  }

  throw new Error(
    'No attribute has two characters that match characters.json. Rebuild game data (npm run fandom-rebuild-game-data) and hard-refresh.'
  );
}

export function buildPlayerPath(attributeId: string): string {
  return `/${attributeId}`;
}
