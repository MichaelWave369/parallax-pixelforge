# PixelForge v5.9 Sprite Studio — Build Receipt

## Scope

v5.9 adds a real built-in pixel sprite editor on top of the v5.8 SNES Asset Forge. The goal is to let creators author animation-ready 16-bit art inside PixelForge rather than only specifying or importing it.

## Implemented

- First-class `sprite-studio.js` module integrated with project state.
- 32×48 SNES hero default plus tile/NPC/portrait presets.
- Pencil, eraser, fill, eyedropper, line, rectangle, mirror, clear.
- Local undo/redo stack.
- Adjustable editor zoom plus horizontal and vertical frame mirroring.
- One-click SNES Hero Set seeding: 23 blank 32×48 frames across idle/walk/run/bounce/interact/damage/victory labels.
- PixelForge SNES house palettes and custom colors.
- Multi-frame timeline with labels and frame duplication/deletion.
- Previous/next onion skin controls.
- Live 1–24 FPS animation preview.
- Horizontal PNG sprite-sheet export.
- JSON animation-map export.
- Project Sprite Gallery attachment.
- Asset Forge attachment PNG + JSON receipt with SHA-256 and declared rights state.
- Optional additive project-schema contract for saved Sprite Studio state.
- Human visual-review boundary preserved.

## Compatibility

The frozen v5.0 project schema identifier and storage keys remain unchanged. `spriteStudio` is additive/optional in the JSON schema, so older projects remain importable; browser normalization creates the new state when absent.

## Acceptance target

`npm run github:preflight` must remain green. `npm run sprite:check` must verify the Sprite Studio contract independently.

## Browser-test boundary

A fresh Chromium launch was attempted through the container, but the session-level browser policy replaced local HTTP navigation with an address-blocked page. No rendered-browser interaction claim is made for v5.9 from this environment. Module syntax, pure Sprite Studio contract checks, project-schema checks, and the full PixelForge `github:preflight` all pass.
