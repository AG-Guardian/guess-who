import type { Character } from '../types';

type Props = {
  character: Character;
  variant?: 'featured' | 'spoiler';
};

export function CharacterCard({ character, variant = 'featured' }: Props) {
  return (
    <div className={`character-card ${variant}`}>
      <div className="character-meta">
        <h2>{character.name}</h2>
        {character.wikiUrl && (
          <a
            className="wiki-link"
            href={character.wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Fandom wiki
          </a>
        )}
      </div>
    </div>
  );
}
