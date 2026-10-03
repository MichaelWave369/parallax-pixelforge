# Parallax PixelForge v5.8 — SNES Asset Forge Build Receipt

## Result

**PASS — v5.8 SNES Asset Forge candidate**

PixelForge now separates visual doctrine, asset contracts, finished art, and human visual approval into distinct evidence states.

## Added

- `pf-snes-house-foundation-v1` reusable asset-pack contract.
- Four 16-color house palette definitions:
  - Bouncehome Grove
  - Wobble Woods
  - Larrina Tower
  - PixelForge Framed UI
- Per-cartridge `asset-profile.json`.
- Required asset-slot vocabulary for hero/NPC sprite sheets, portraits, environment tiles, interiors, UI frames, effects, and optional audio.
- Deterministic `asset:check` JSON/Markdown receipts.
- `asset:catalog` inventory generation.
- `asset:briefs` production brief generation.
- Safe `asset:attach` flow with explicit rights state, no-overwrite behavior, SHA-256 hashing, and named slot binding.
- New cartridges inherit the SNES asset profile automatically.
- 369 PocketGames production evaluation now requires an audited asset contract.
- Paid retail release additionally requires every required final in-game asset slot to be ready.

## Legend status

- Visual source doctrine: **PASS**
- Asset contract: **PASS**
- Required final asset content: **0 / 8 ready**
- Human visual gold-standard signoff: **PENDING**
- Production candidate: **PASS**
- Retail release: **NO**

Current asset status:

`asset-contract-pass-content-pending`

This is intentional. No final More Bounce/Larrina sprite sheet, environment tileset, portrait set, UI art, or effects sheet is falsely claimed to exist.

## Legend required slots

1. More Bounce hero sprite sheet — 32x48 target
2. Larrina character sprite sheet — 32x48 target
3. Larrina portrait set — 96x96 target
4. Bouncehome Grove overworld tileset — 16x16 grid
5. Wobble Woods side-view tileset — 16x16 grid
6. Larrina Tower interior kit — 16x16 grid
7. Shared framed SNES UI kit
8. Bounce effects sheet — 32x32 target
9. Optional SNES-inspired audio cue pack

## Acceptance evidence

`npm run github:preflight` passed end-to-end after the v5.8 changes, including all historical validators, PocketGames tooling, mobile checks, SNES style audit, asset audit, asset briefs, asset catalog, community review, shelf generation, production evaluation/package, v5.8 validation, and public release validation.

Generator smoke test passed: a temporary cartridge inherited the v5.8 SNES visual and asset profiles and passed `asset:check` before cleanup.

Asset intake smoke test passed: an original starter asset was attached to a disposable cartridge slot, copied without overwrite, hashed, rights-tagged, revalidated, then the disposable test cartridge was removed.

## Boundary

PixelForge may verify asset roles, files, hashes, declared rights state, dimensions/targets, and readiness flags. It may not claim visual beauty, originality, legal license validity, or commercial worth without the appropriate human review.
