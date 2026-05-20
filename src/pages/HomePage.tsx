import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildPlayerPath, createRandomRound } from '../data';
import type { Round } from '../types';

export function HomePage() {
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRound = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      const next = await createRandomRound();
      setRound(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start a round');
      setRound(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await createRandomRound();
        if (!cancelled) {
          setRound(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not start a round');
          setRound(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const playerLink =
    round && `${window.location.origin}${buildPlayerPath(round.attribute.id)}`;

  return (
    <main className="page home">
      <header className="hero">
        <p className="eyebrow">Two-player guessing game</p>
        <h1>Guess Who?</h1>
        <p className="lede">
          Each player is secretly assigned a character. You share one attribute in common.
          Open the link on your phone to see a character from that group — use it as a
          reference while you ask yes/no questions to guess your own.
        </p>
      </header>

      {loading && !round && (
        <p className="loading">Picking attribute…</p>
      )}

      {error && (
        <section className="panel">
          <p className="error">{error}</p>
          <button
            type="button"
            className="btn primary"
            onClick={() => loadRound(true)}
            disabled={loading}
          >
            Try again
          </button>
        </section>
      )}

      {round && playerLink && (
        <section className="panel round-setup">
          <h2>Shared attribute</h2>
          <p className="attribute-label">{round.attribute.label}</p>
          <p className="attribute-hint">{round.attribute.hint}</p>

          <h2>Send this link to both players</h2>
          <p className="note">
            Each player opens the same link on their own phone. Everyone gets a random
            character from this group — use <strong>Pick a different character</strong> if
            you need one you both recognize.
          </p>

          <div className="link-card">
            <a className="player-link" href={playerLink}>
              {playerLink}
            </a>
          </div>

          <div className="round-setup-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => loadRound(true)}
              disabled={loading}
            >
              {loading ? 'Picking attribute…' : 'Pick a different attribute'}
            </button>
          </div>
        </section>
      )}

      <footer className="footer">
        <Link to="/about">How it works &amp; data</Link>
      </footer>
    </main>
  );
}
