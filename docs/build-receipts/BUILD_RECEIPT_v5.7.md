# PixelForge v5.7 Build Receipt — SNES Style Lock

## Status

**Candidate:** PASS
**Package version:** `5.7.0-alpha`
**House default:** `16-bit / snes-adventure / expressive-pixel`
**Gold-standard source:** `PF_GOLD_STANDARD_001 — The Legend of More Bounce`

## What changed

- Froze SNES-first 16-bit as the default PixelForge visual lane.
- Added visual-profile metadata to the cartridge generator.
- Added `scripts/validate_visual_style.js` and deterministic visual-style receipts.
- Integrated the declared visual lane into community review.
- Added explicit human gold-standard visual signoff boundary.
- Added v5.7 public-release validation support.
- Upgraded Legend source with a title screen, richer overworld landmarks/foliage, additional Wobble Woods depth layers, and a furnished Larrina Tower scene.
- Added a new zero-install v0.2 SNES source-candidate HTML export while preserving the previously browser-tested v0.1 standalone and its evidence chain unchanged.

## Legend style audit

`npm run style:legend` passes all 14 deterministic checks:

- visual profile declared
- expressive presentation declared
- layered environment declared
- framed UI declared
- tile contract declared
- hero scale declared
- palette breadth source evidence
- layered background source evidence
- framed UI source evidence
- animation language source evidence
- rendered hero footprint
- responsive/mobile source evidence
- reduced-motion source evidence
- gold-standard identity

Status remains:

`source-contract-pass-human-visual-review-pending`

This is intentional. A source audit cannot declare artwork beautiful or commercially polished.

## Generator smoke test

A temporary cartridge generated through `npm run new:cartridge -- "SNES Lane Smoke Test"` inherited:

- `visualEra: 16-bit`
- `styleProfile: snes-adventure`
- `presentationTier: expressive-pixel`
- `environmentDensity: layered`
- `uiProfile: framed-16bit`
- `audioProfile: snes-inspired`
- `defaultTileSize: 16`
- `heroSpriteTarget: 32x48`

The smoke-test cartridge was deleted after verification.

## Regression result

`npm run github:preflight` — **PASS**

This includes the historical PixelForge validator suite, Journey validation, both PocketGames lanes, mobile checks, style audit, community reviews, shelf build, Legend production evaluation, candidate package build, v5.7 validation, and public-release validation.

## Browser-test boundary

The v0.2 standalone's embedded JavaScript passes `node --check`. In this session, Chromium navigation to both `file://` and localhost was blocked by the environment, so no new automated browser-playthrough receipt is claimed for v0.2. The prior v0.1 browser proof remains preserved unchanged and should not be treated as evidence for the v0.2 visual revision.

## Next gate

A named human should visually review the v0.2 build and decide whether it actually earns the PixelForge SNES gold-standard label. After that, the next implementation pass should move from source/CSS art scaffolding into a true sprite/tile asset pipeline and animation set.
