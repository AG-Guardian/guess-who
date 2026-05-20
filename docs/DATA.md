# Data pipeline

Character and attribute data comes from [Fictional Characters Wiki](https://characters.fandom.com/wiki/) via the MediaWiki API (`/api.php`). Do not scrape HTML.

## One command

```bash
npm run fandom-populate
```

`fandom-pipeline` is an alias for the same script.

This runs **import → backlinks → filter + attributes** and writes:

- `public/data/characters.json`
- `public/data/attributes.json` (includes an `index` plus an `attributes` map keyed by attribute id)

It also updates a **local cache** under `public/data/imported/` (gitignored). Re-running populate refreshes that cache and the game JSON.

Defaults: prefilter (`categories≥11`, `backlinks≥1`), attribute pool size **50–500** members. Override with env vars below.

Optional dev sample:

```bash
LIMIT=500 npm run fandom-populate
```

## Rebuild game JSON without API calls

If you already have `imported/fandom-characters-raw.json` and `imported/fandom-backlinks.json` from a previous populate, you can tweak filter env vars and rebuild only the shipped files:

```bash
npm run fandom-rebuild-game-data
```

Same with explicit env:

```bash
BUILD_ONLY=1 USE_PREFILTER=1 MIN_ATTRIBUTE_SIZE=50 MAX_ATTRIBUTE_SIZE=500 node scripts/fandom-populate.mjs
```

(`npm run fandom-build-prefilter` runs the same preset.)

## Library layout

| Module | Role |
|--------|------|
| `scripts/lib/import-characters.mjs` | Fandom import → raw cache |
| `scripts/lib/fetch-backlinks.mjs` | `linkshere` batch + merge into backlink cache |
| `scripts/lib/build-game-data.mjs` | `buildGameData(raw, backlinks)`; optional standalone CLI |
| `scripts/fandom-populate.mjs` | Orchestrates the pipeline; `BUILD_ONLY=1` skips API |

### Character prefilter (default `fandom-populate`)

- `categoryCount ≥ 11`
- `backlinks ≥ 1`

### Attribute filter (default `fandom-populate`)

Attributes from the union of categories on kept characters:

- `50 ≤ member count ≤ 500`

### Hint text

Implemented in `scripts/lib/fandom-api.mjs` (`hintFromCategory`).

## Environment variables

| Variable | Default (`fandom-populate`) | Used by |
|----------|---------------------------|---------|
| `USE_PREFILTER` | `1` | build |
| `PREFILTER_MIN_CATEGORIES` | `11` | build |
| `PREFILTER_MIN_BACKLINKS` | `1` | build |
| `MIN_ATTRIBUTE_SIZE` | `50` | build (`MIN_TAG_SIZE` still accepted) |
| `MAX_ATTRIBUTE_SIZE` | `500` | build (`MAX_TAG_SIZE` still accepted) |
| `LIMIT` | all | import |
| `DELAY_MS` | `250` | API |
| `BATCH` | `50` | backlinks |

Legacy category-only build (no backlinks), using cached raw import:

```bash
BUILD_ONLY=1 USE_PREFILTER=0 MIN_CHARACTER_CATEGORIES=8 node scripts/fandom-populate.mjs
```

## Attribution

Wiki text is generally [CC BY-SA 3.0](https://www.fandom.com/licensing). Credit [Fictional Characters Wiki](https://characters.fandom.com/) on an About / data sources page before a public launch. Bulk automated use may also require Fandom’s permission under their Terms of Use — confirm for production.

## `imported/` cache (not committed)

| File | Purpose |
|------|---------|
| `fandom-characters-raw.json` | Full import with categories per page |
| `fandom-backlinks.json` | Inbound link counts (merged incrementally on each populate) |

Listed in `.gitignore`. Not loaded by the game at runtime — only used when rebuilding game data (including `BUILD_ONLY=1`).
