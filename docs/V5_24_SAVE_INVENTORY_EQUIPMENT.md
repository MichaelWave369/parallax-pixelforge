# PixelForge v5.24 — Legend Save / Inventory / Equipment

v5.24 gives **The Legend of More Bounce** a real multi-session adventure state without adding accounts, cloud sync, tracking, or server infrastructure.

## Save contract

- Three manual save slots.
- One automatic local autosave.
- Versioned schema: `pixelforge.legend-save.v5.24`.
- Additive forward migration for missing fields.
- Portable JSON export/import.
- Local browser storage only.
- Safe checkpoint resume: volatile movement/combat states resume at a stable scene boundary instead of restoring mid-jump or mid-boss-frame.

## Journal contract

The in-game Journal derives its contents from saveable progress and exposes:

- inventory,
- equipped upgrades,
- three chapter quest logs,
- discovered scene history,
- boss records,
- current safe checkpoint.

## Equipment

- **Echo Boots** — second-bounce / high-route access.
- **Resonance Bracer** — breaks iron armor and boss guards.
- **Heart Rivet** — optional +1 maximum heart in Warden encounters.

## Evidence boundary

Machine validation can prove the schema, migration, safe-resume rules, item/quest derivation, local-only storage contract, and standalone bindings. It cannot decide whether the save menu feels convenient, checkpoint placement feels fair, the journal is readable, or the game is worth $3.69.
