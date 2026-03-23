# Geminus Ratio

Turn-based tactics in the Colosseum—**Final Fantasy Tactics**–inspired rules on an isometric grid, **Fire Emblem**–style presentation. Hire gladiators with a **point budget** each bout; classes follow **historical types**, each with a **unique ability**.

## Run locally

Open `index.html` in a modern browser, or serve the folder:

```bash
cd geminus-ratio && npx --yes serve -p 3333
```

Then open `http://localhost:3333`.

## Flow

1. **Ludus** — Spend **Denarii** to hire gladiators (each class has a cost and stat line).
2. **Deploy** — Place your team on the **blue** tiles (arena gate).
3. **Arena** — **CT** (Charge Time) turn order like FFT: faster gladiators act sooner. Move, **Attack**, or use your **Class Ability** once per activation.

## Gladiator classes (historical bases)

| Class        | Role   | Ability (unique) |
|-------------|--------|------------------|
| Murmillo    | Bulwark | **Cetus Wall** — Brace: reduce damage taken this turn |
| Retiarius   | Skirmisher | **Iaculum** — Net: root adjacent foe 1 turn |
| Secutor     | Hunter | **Umbra** — Dash: move farther if ending next to foe |
| Thraex      | Duelist | **Sica Riposte** — Counter if attacked in melee this turn |
| Hoplomachus | Lancer | **Hasta Impetus** — Spear thrust: +range line attack |
| Dimachaerus | Blademaster | **Ferrum Cyclone** — Strike all adjacent foes |
| Provocator  | Champion | **Provocatio** — Mark foe: they deal −dmg to others |
| Samnite     | Veteran | **Samnis Press** — Shove target 1 tile |

## Tech

Plain HTML/CSS/JS, no build step. Deploy to GitHub Pages, Netlify, or Cloudflare Pages by uploading this folder.
