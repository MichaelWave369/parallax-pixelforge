# PixelForge v5.11 Runtime Composer — Build Receipt

Status: **candidate PASS**

## Added
- `runtime-composer.js` first-class playable-scene workstation.
- Runtime Composer full-screen modal and responsive controls.
- Additive `runtimeComposer` project contract under the frozen v5.0 project schema.
- Live Sprite Studio + Tile Studio / Map Composer binding.
- WASD/arrow movement with normalized diagonal speed.
- Camera-follow viewport.
- Collision blocking sourced from Map Composer collision layers.
- Live idle/walk animation-label binding.
- Collision and tile-grid debug overlays.
- Portable `pixelforge.runtime-scene.v5.11` JSON export.
- Attached runtime-scene project registry.
- Legend Bouncehome Grove runtime seed with spawn, camera, collision and future Echo Gate transition metadata.
- Zero-install Legend Bouncehome Grove runtime-preview builder and exported HTML.

## Evidence boundary
When final tile or sprite pixels are blank, Runtime Composer uses an explicitly labeled semantic-color map and preview hero silhouette. Those visuals are **not final art**, do not change Asset Forge readiness, and must not be represented as SNES gold-standard artwork.

## Validation
`npm run github:preflight` — **PASS**

Included gates: historical project tests, demo validation, both PocketGames lanes, mobile readability, visual doctrine, Asset Forge, community review/shelf, production candidate packaging, v5.8 capability retention, Sprite Studio, v5.9 retention, Tile Studio, v5.10 retention, Runtime Composer, zero-install Legend preview generation, v5.11 validation, and public-release validation.

## Browser note
The standalone preview JavaScript is syntax-checked and generated during preflight. A fresh Chromium screenshot attempt in this container did not terminate reliably, so no new browser-render screenshot is claimed in this receipt.
