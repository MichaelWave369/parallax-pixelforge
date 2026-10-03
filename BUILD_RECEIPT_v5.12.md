# PixelForge v5.12 Build Receipt — Legend SNES Content Pass

## Scope

This checkpoint proves that PixelForge-authored art can move from source assets into Asset Forge status, cartridge source, runtime packets, and a zero-install cross-mode preview.

## Added

- 23-frame 32×48 More Bounce hero sprite sheet.
- Animation-map JSON and Sprite Studio source packet.
- Eight-tile 16×16 Bouncehome Grove set.
- Tile Studio v5.12 source packet with populated pixels.
- Real-art Bouncehome runtime-scene packet.
- Wobble Woods side-view runtime seed.
- Cross-mode standalone preview builder and output.
- v5.12 content/asset validation.

## Asset readiness

- `more-bounce-hero`: READY
- `bouncehome-overworld`: READY
- remaining required final-art slots: PENDING

Required final assets ready: **2 / 8**.

## Evidence boundary

The repository can prove file presence, dimensions, hashes, declared provenance, animation/tile contracts, and runtime binding. It does not automatically certify artistic quality or authorize retail release.

## Final acceptance

- `npm run github:preflight`: **PASS**
- `npm run legend:content:check`: **PASS**
- `npm run validate:v5.12`: **PASS**
- Required final art ready: **2 / 8**
- Bouncehome → Wobble cross-mode packet: **PASS**

### Content hashes

- More Bounce hero PNG: `0b8ae496533333ac66dab4dfee9fdfbd797f051f1104070bf1d9361d2f276cd7`
- Bouncehome Grove tiles PNG: `34a4f4ad888707edb48253cf15a03af5659c20a78c249ea20630185e30196be3`
- Zero-install v5.12 preview HTML: `2004c7c82666ee540989d385402aa4681eea9549c0637a1fdec85a77213cbd97`
