# PixelForge v5.10 — Tile Studio + Map Composer Build Receipt

## Candidate

- Package: `parallax-pixelforge@5.10.0-alpha`
- Engine marker: `5.10.0-tile-studio`
- Project storage/schema compatibility remains `pixelforge.project.v5.0`.

## Added

- `tile-studio.js` first-class world-art module.
- Full-screen 16×16 Tile Studio.
- Pencil, eraser, bucket fill, eyedropper, line, rectangle, mirror, undo/redo and custom color tools.
- PixelForge SNES palette library.
- Tile semantic tags, walkability, and explicit autotile-group metadata.
- Tileset bank with new, duplicate, delete, and blank Grove production-skeleton workflow.
- Layered Map Composer with `ground`, `decor`, and `collision` layers.
- Map paint, erase, flood-fill, zoom, and size presets.
- Native tileset PNG export.
- Portable `pixelforge.tile-map.v5.10` JSON export.
- Rights-aware Asset Forge tileset attachment with SHA-256 receipt.
- Project tile-map registry attachment.
- First Legend world seed at `games/the-legend-of-more-bounce/world/`: Bouncehome Grove 24×16 layout + Tile Studio seed with eight blank `awaiting-art` slots.
- Optional additive `tileStudio` project-schema contract.
- Dedicated `tile:check` and `validate:v5.10` gates.

## Acceptance evidence

`npm run tile:check` — PASS

`npm run validate:v5.10` — PASS

`npm run github:preflight` — PASS

The complete preflight also passed historical project-validator tests, v5.0 demo validation, Journey cartridge validation, both PocketGames lanes, mobile-readability checks, SNES visual-style audit, Asset Forge audit/brief/catalog generation, community reviews/shelf generation, PocketGames evaluation/package assembly, v5.8 capability retention, Sprite Studio validation, v5.9 capability retention, and public-release validation.

## Evidence boundary

This receipt proves the source/data contracts and regression gates passed in the build environment. It does **not** claim unfinished tile art is visually SNES-quality. Autotile groups are metadata only until the required edge/corner tiles are actually drawn and human-reviewed. Fresh interactive browser rendering was not used as acceptance evidence in this pass.
