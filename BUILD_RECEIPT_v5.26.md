# PixelForge v5.26 Build Receipt — Stormglass Coast / Chapter Four

**Status:** PASS — machine contract complete; human play/feel/value review remains pending.

## Release identity

- PixelForge package: `5.26.0-alpha`
- Legend cartridge: `1.7.0`
- Chapter: 4 — Stormglass Coast
- Save schema: `pixelforge.legend-save.v5.26` / schema version 3
- Accepted legacy saves: v5.24 and v5.25
- Travel network: 5 landmarks
- Network sync / telemetry: none

## Chapter Four progression

Stormglass Coast → Sable Current → 3 Tideglass Shells → Gale Mantle → Stormglass Cliffs → 3 mandatory air-dash gaps → Pressure Prism → Tide Engine → TIDE / WIND / LIGHT / BELL → The Undertow Bell → Stormglass Compass → Stormglass Lighthouse.

## New authored media

### Pixel art / scene media
- Sable Current NPC sheet — 4 × 24×32 frames
- Stormglass item atlas
- Stormglass Coast overworld — 640×360
- Stormglass Cliffs side-view stage — 672×180
- Tide Engine first-person room — 320×180
- Undertow Bell boss sheet — 8 × 64×64 frames
- Undertow Bell arena — 672×180
- Legend world map v0.2 — 320×180 with Stormglass extension

All v5.26 art is declared original project content and covered by the v5.26 art SHA-256 receipt.

### Audio
Six original local WAV cues:
- Stormglass Coast theme
- Stormglass Cliffs theme
- Tide Engine theme
- Undertow Bell theme
- Gale Mantle upgrade cue
- Stormglass Compass victory cue

No external samples or streamed music are required.

## Machine evidence

- Chapter number: 4
- Named NPC: Sable Current
- Tideglass Shells: 3
- Permanent upgrade: Gale Mantle
- Upgrade mechanic: one midair dash between landings
- Mandatory air-dash gaps: 3
- Tide Engine puzzle inputs: 4
- Boss: The Undertow Bell
- Boss health contract: 5
- Boss required ability: Gale Mantle
- Chapter reward: Stormglass Compass
- Travel landmarks after expansion: 5
- New audio cues: 6
- Minimum authored interaction beats: 24
- v5.24 save migration: supported
- v5.25 save migration: supported
- Local-only save/travel: retained

## Validation

Targeted v5.26 validators passed before release freeze:
- `node scripts/analyze_legend_v526.js`
- `node scripts/validate_legend_v526.js`
- `node scripts/validate_v526.js`

The complete historical `npm run github:preflight` passed on the v5.26 working tree **and again from the exact renamed `parallax-pixelforge-v5.26` release tree**. After this receipt was finalized, the same complete preflight was run once more; packaging is permitted only if that post-receipt run also passes.

## Historical retention fixes made during v5.26

Two stale historical validators were converted to forward-compatible retention semantics without weakening their original capability requirements:

- v5.24 Save / Inventory: requires at least the original 3 equipment slots, 3 quest chapters and 2 boss records while allowing Chapter Four to add more.
- v5.25 World Map / Fast Travel: requires at least the original four-landmark/activation baseline while allowing Stormglass Lighthouse to become landmark five.

The frozen v5.24/v5.25 profiles remain intact.

## Human review still required

PixelForge does **not** promote these machine checks into a human quality verdict. The following remain pending:

- Gale Mantle / air-dash feel
- Stormglass Cliffs readability and gap telegraphing
- Tide Engine puzzle clarity
- Undertow Bell timing / fairness
- Chapter Four pacing
- world-map / fifth-landmark readability
- commercial content depth
- $3.69 worthiness

## Evidence boundary

The standalone v5.26 HTML has machine-validated embedded JavaScript and progression contracts. This receipt does not claim a fresh human or automated browser completion playthrough unless separately recorded.
