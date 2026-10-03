# PixelForge v5.16 Build Receipt — SNES UI Kit Pass

## Candidate

- Package: `parallax-pixelforge` `5.16.0-alpha`
- Milestone: SNES UI Kit Pass
- Legend machine-side final art: **7 / 8 READY**
- Final factory gate: `npm run github:preflight` — **PASS**

## Added original assets

- `shared-ui-frames.v0.1.png` — 256×96 native atlas
- three 48×48 frame families using a 16px nine-slice contract
- 14 native 16×16 UI icons
- HUD frame, Rune chip, transition card, inventory slot
- atlas metadata + original-rights art receipt with SHA-256 provenance

## Runtime integration

- The React cartridge consumes original dialogue-frame and Rune-chip assets.
- v5.16 Tower runtime includes an explicit ready `uiBinding`.
- The standalone runtime preview uses repository art for HUD, transition cards, Rune state, and Tower dialogue.
- v5.15 Tower validation was converted to a capability-retention gate so later art can advance without erasing the historical milestone.

## Validation evidence

- v5.16 dedicated content validation: PASS
- 256×96 UI atlas: PASS
- 14 icon atlas entries: PASS
- 3 nine-slice frame families: PASS
- original rights + SHA bindings: PASS
- Runtime UI binding: PASS
- React source binding: PASS
- required final-art roles: **7 / 8 READY**
- historical PixelForge regression/preflight stack: PASS

## Evidence boundary

`bounce-effects` remains `awaiting-art`. Human visual-gold-standard approval remains separate from machine validation.

A direct headless Chromium screenshot attempt in this container timed out and produced no usable screenshot. No fresh browser-render claim is made for v5.16; the standalone inline JavaScript passes syntax validation and the full PixelForge preflight passes.
