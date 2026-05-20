import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <main className="page about">
      <header className="hero">
        <h1>How it works</h1>
      </header>

      <section className="panel prose">
        <h2>Gameplay</h2>
        <ol>
          <li>Start a round on the home page. The app picks a shared attribute.</li>
          <li>Send the same link to both players. Each person gets a random character from that group.</li>
          <li>
            On your phone you see the shared attribute and one character — not your secret.
            Ask yes/no questions until you can guess who you are.
          </li>
          <li>
            If the character isn&apos;t recognizable, use{' '}
            <strong>Pick a different character</strong> before you start. Agree with your
            opponent on who counts.
          </li>
        </ol>

        <h2>URL format</h2>
        <p>
          Player links look like <code>/{'{attributeId}'}</code> (for example{' '}
          <code>/disney-characters</code>). The slug in the path is the shared attribute; the
          character on screen is chosen at random when the page loads.
        </p>

        <h2>Data model</h2>
        <ul>
          <li>
            <strong>Characters</strong> — global pool in <code>public/data/characters.json</code>.
            The same character can belong to many attributes.
          </li>
          <li>
            <strong>Attributes</strong> — shared traits in <code>public/data/attributes.json</code>
            (an index plus the full attribute records, including character id lists).
          </li>
          <li>
            <strong>Scale goal</strong> — 1,000+ attributes, each with 1,000+ character IDs (with
            reuse across attributes).
          </li>
        </ul>

        <h2>Populating data (Fandom pipeline)</h2>
        <p>
          One command imports characters, updates the backlinks cache, and writes{' '}
          <code>characters.json</code> plus <code>attributes.json</code>:
        </p>
        <pre>
          {`npm run fandom-populate`}
        </pre>
        <p>
          Optional granular steps and env vars are documented in <code>docs/DATA.md</code>. Each
          character shows a <strong>name</strong> and a link to the Fandom wiki article.
        </p>
      </section>

      <footer className="footer">
        <Link to="/">← Back home</Link>
      </footer>
    </main>
  );
}
