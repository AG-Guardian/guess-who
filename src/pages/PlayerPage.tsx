import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CharacterCard } from '../components/CharacterCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  loadCharacters,
  loadAttribute,
  pickRandomCharacterId,
  playableIds,
} from '../data';
import type { Attribute, Character } from '../types';

export function PlayerPage() {
  const { attributeId } = useParams<{ attributeId: string }>();

  const [attribute, setAttribute] = useState<Attribute | null>(null);
  const [characters, setCharacters] = useState<Record<string, Character> | null>(null);
  const [shownCharacter, setShownCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(() => Boolean(attributeId));
  const [error, setError] = useState<string | null>(null);
  const [rerollError, setRerollError] = useState<string | null>(null);
  const [confirmRerollOpen, setConfirmRerollOpen] = useState(false);

  useEffect(() => {
    const safeId = attributeId!;
    let cancelled = false;

    async function load() {
      try {
        const [attrData, characterMap] = await Promise.all([
          loadAttribute(safeId),
          loadCharacters(),
        ]);

        const ids = playableIds(attrData, characterMap);
        if (ids.length < 2) {
          throw new Error('This attribute group needs at least two characters.');
        }

        const characterId = pickRandomCharacterId(attrData, characterMap);
        const character = characterMap[characterId];
        if (!character) {
          throw new Error('Character data not found.');
        }

        if (!cancelled) {
          setAttribute(attrData);
          setCharacters(characterMap);
          setShownCharacter(character);
          setRerollError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load game');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [attributeId]);

  const poolSize =
    attribute && characters ? playableIds(attribute, characters).length : 0;
  const canReroll = poolSize > 1;

  function applyReroll() {
    if (!attribute || !characters || !shownCharacter) {
      return;
    }
    setRerollError(null);
    try {
      const nextId = pickRandomCharacterId(attribute, characters, shownCharacter.id);
      const next = characters[nextId];
      if (!next) {
        throw new Error('Character data not found.');
      }
      setShownCharacter(next);
    } catch (err) {
      setRerollError(
        err instanceof Error ? err.message : 'Could not pick another character.'
      );
    }
  }

  if (!attributeId) {
    return (
      <main className="page player">
        <div className="panel">
          <h1>Invalid link</h1>
          <p className="error">This link is incomplete. Start a new round from the home page.</p>
          <Link className="btn primary" to="/">
            Start a new round
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page player">
        <p className="loading">Loading your clue…</p>
      </main>
    );
  }

  if (error || !attribute || !shownCharacter) {
    return (
      <main className="page player">
        <div className="panel">
          <h1>Invalid link</h1>
          <p className="error">{error ?? 'Something went wrong.'}</p>
          <Link className="btn primary" to="/">
            Start a new round
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page player">
      <header className="player-header">
        <p className="shared-trait">{attribute.hint}</p>
      </header>

      <section className="panel opponent-panel">
        <p className="eyebrow">Your opponent&apos;s character is:</p>
        <CharacterCard character={shownCharacter} variant="featured" />
        <p className="your-secret">
          Ask yes/no questions until you can guess the character shown on your opponent&apos;s
          screen.
        </p>
        <p className="reroll-hint">
          Don&apos;t recognize this one? Before starting the round, try to pick someone else
          you are both likely to recognize.
        </p>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setConfirmRerollOpen(true)}
          disabled={!canReroll}
        >
          Pick a different character
        </button>
        {rerollError && <p className="error">{rerollError}</p>}
      </section>

      <ConfirmDialog
        open={confirmRerollOpen}
        title="Pick a different character?"
        message="This will replace the character on your screen. Your opponent should agree before you continue."
        confirmLabel="Pick new character"
        cancelLabel="Keep current"
        onConfirm={() => {
          setConfirmRerollOpen(false);
          applyReroll();
        }}
        onCancel={() => setConfirmRerollOpen(false)}
      />

      <footer className="footer">
        <Link to="/">New round</Link>
      </footer>
    </main>
  );
}
