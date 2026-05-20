export interface Character {
  id: string;
  name: string;
  wikiUrl?: string;
  categoryCount?: number;
}

export interface AttributeSummary {
  id: string;
  label: string;
  count: number;
}

export interface Attribute extends Omit<AttributeSummary, 'count'> {
  hint: string;
  characterIds: string[];
}

export interface Round {
  attribute: Attribute;
}
