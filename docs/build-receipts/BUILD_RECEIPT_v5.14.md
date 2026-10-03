# PixelForge v5.14 — Build Receipt

## Release
**Parallax PixelForge v5.14 — Larrina Character + Portrait Pass**

## Content promoted
- `larrina-character` → **READY**
  - original 24-frame horizontal sprite sheet
  - native frame size: 32×48
  - states: idle, talk, blink, smile, concern, celebrate
  - original-rights declaration + SHA-256 binding
- `larrina-portraits` → **READY**
  - four original 96×96 portraits
  - neutral, smile, concern, surprised
  - original-rights declaration + SHA-256 binding
- Wobble Woods Echo Gate now targets `larrina-tower.runtime-scene.v5.14.json`.
- Tower runtime binds real Larrina character + portrait assets.

## Asset Forge state
**5 / 8 required Legend final-art roles READY.**

Ready:
1. More Bounce hero
2. Bouncehome Grove
3. Wobble Woods
4. Larrina character
5. Larrina portraits

Pending:
1. Larrina Tower interior
2. Shared UI frames
3. Bounce effects

## Validation
The complete historical PixelForge `npm run github:preflight` passed from the v5.14 source tree, including project validation, PocketGames, mobile QA, SNES doctrine, Asset Forge, community systems, Sprite Studio, Tile Studio, Runtime Composer, v5.12/v5.13 retention, v5.14 content validation, and public-release validation.

Dedicated v5.14 evidence:
- Larrina character dimensions: **768×48** = 24 native 32×48 frames — PASS
- Larrina portraits dimensions: **384×96** = four native 96×96 portraits — PASS
- character/portrait hashes match Asset Forge profile — PASS
- character/portrait rights status = `original` — PASS
- Wobble → Tower transition — PASS
- Tower character binding — PASS
- Tower portrait binding — PASS
- Tower interior remains `awaiting-art`, `countsAsFinalArt=false` — PASS
- Legend required final art = **5 / 8 READY** — PASS

## Browser evidence boundary
A fresh headless Chromium render was attempted. Chromium failed to terminate cleanly in this container and the attempt was timed out, so no new browser screenshot is claimed as evidence. The standalone preview's inline JavaScript passes syntax validation in the v5.14 content gate, and the full PixelForge preflight passes.

## Claim boundary
Machine validation proves asset presence, dimensions, bindings, hashes, declared rights, runtime contracts, and release-gate state. It does **not** grant human visual-gold-standard approval. Tower environment art remains pending.
