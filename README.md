# Guess Who?

A two-player web guessing game. The app picks a **shared attribute**. Both players open the same link on their phones: each sees that attribute and a random character from the group (reroll if you need someone you both recognize). Your secret character is not shown in the app.

## Quick start

```bash
cd guess-who
npm install
npm run fandom-populate   # optional if public/data/ is already built
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## How to play

1. The home page loads a random shared attribute automatically.
2. Read the attribute aloud (e.g. “Both characters are villains”).
3. Send the **same link** to both players — each opens it on their own phone.
4. Use **Pick a different character** before the round if you need someone you both recognize.
5. Take turns asking yes/no questions until someone guesses their character.

## URL structure

| Route | Purpose |
|-------|---------|
| `/` | Host: random attribute + player link |
| `/:attributeId` | Player view (random character for that attribute) |
| `/about` | Rules and data documentation |

Example player link: `https://your-domain.com/villains`

## Data model

```
public/data/
  characters.json
  attributes.json     # index + every attribute (character id lists)
  imported/                      # local cache (gitignored); created by fandom-populate
    fandom-characters-raw.json
    fandom-backlinks.json
```

See **[docs/DATA.md](docs/DATA.md)** for the import pipeline.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build to `dist/` |
| `npm run fandom-populate` | Full pipeline: Fandom import → backlinks → `characters.json` + `attributes.json` |
| `npm run fandom-rebuild-game-data` | Rebuild game JSON from local `imported/` cache only (no API) |

## Deploy

```bash
npm run build
```

Serve `dist/` with SPA fallback so all routes serve `index.html`.

## Tech stack

- Vite + React + TypeScript
- React Router
- Static JSON in `public/data/` (no backend)
