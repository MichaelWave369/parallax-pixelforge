# v5.10 — Tile Studio + Map Composer

## Goal

Close the second major authoring gap after Sprite Studio: PixelForge should be able to create the 16-bit world art and layered scene maps that its characters actually inhabit.

## Added

- full-screen 16×16 Tile Studio;
- PixelForge SNES palette library;
- pencil, erase, fill, pick, line, rectangle, mirror, undo/redo;
- semantic tile tags and walkability;
- explicit autotile-group metadata;
- tileset bank with duplicate/delete/new-tile workflow;
- blank SNES Grove production skeleton;
- layered Map Composer (`ground`, `decor`, `collision`);
- map paint/erase/fill tools;
- scene-size presets and zoom;
- native tileset PNG export;
- portable map JSON export;
- SHA-256 + rights-aware Asset Forge attachment;
- project map attachment registry;
- additive optional project-schema contract;
- v5.10 validation and regression gate.

## Claim boundary

Passing Tile Studio validation proves the data contracts and creator workflow are present. It does not prove that unfinished art is SNES-quality or that an autotile group contains complete visual variants.
