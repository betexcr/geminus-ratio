# Hosting & Architecture

## Live URL

**https://geminus.surge.sh/**

## Repository

GitHub: `https://github.com/betexcr/geminus-ratio.git`
Branch: `main`

## Hosting — Surge.sh

The site is deployed as a static site on [Surge](https://surge.sh).
Logged-in account: `albmunmu@gmail.com` (Student plan).

### Deploy command

From the repo root:

```bash
surge . geminus.surge.sh
```

This uploads every file in the working directory to `geminus.surge.sh`.
No build step is needed — the repo is vanilla HTML/CSS/JS.

### Teardown (if ever needed)

```bash
surge teardown geminus.surge.sh
```

## Project structure

```
geminus-ratio/
├── index.html          # Single-page app entry point
├── css/
│   └── main.css        # All styles (FFT theme, grid layout, overlays)
├── js/
│   ├── rng.js          # Seeded PRNG (LCG via Math.imul)
│   ├── sfx.js          # Procedural Web Audio sound effects
│   ├── renderer.js     # IsoRenderer — canvas 2D isometric engine
│   ├── sprites.js      # Team palettes + per-class chibi rect data
│   ├── campaign.js     # 14-mission campaign data & persistent state
│   └── game.js         # Core game logic, UI, scene runner, battle AI
├── docs/
│   ├── lore-bible.md
│   ├── campaign-design.md
│   └── hosting-and-architecture.md   # ← this file
└── README.md
```

## Script load order

Scripts are loaded synchronously at the end of `<body>`, in dependency order:

1. `js/rng.js` — exposes `seedRng()` global
2. `js/sfx.js` — exposes `SFX` global
3. `js/renderer.js` — exposes `IsoRenderer` class
4. `js/sprites.js` — exposes `TEAM_PAL`, `SPRITE_RECTS` globals
5. `js/campaign.js` — exposes `CAMPAIGN_MISSIONS`, `campaignState`, `Campaign` globals
6. `js/game.js` — IIFE that calls `init()` on load; wires all UI and game logic

No bundler, no npm, no transpiler. Everything runs as-is in the browser.

## Key technologies

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Rendering   | Canvas 2D (isometric projection)  |
| Audio       | Web Audio API (procedural SFX)    |
| Fonts       | Google Fonts — VT323, Cinzel      |
| Persistence | localStorage (`geminus_campaign_v2`) |
| Hosting     | Surge.sh (static CDN)             |
| VCS         | Git + GitHub                      |

## Typical workflow

1. Edit files locally
2. Test at `http://localhost:8765` via `python3 -m http.server 8765`
3. `git add . && git commit -m "..."` then `git push origin main`
4. `surge . geminus.surge.sh` to deploy
