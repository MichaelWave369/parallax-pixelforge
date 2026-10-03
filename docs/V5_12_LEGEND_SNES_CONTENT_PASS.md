# PixelForge v5.12 — Legend SNES Content Pass

v5.12 changes the proof target from **tools exist** to **real game content flows through the tools**.

## Production assets now present

### More Bounce hero

- Slot: `more-bounce-hero`
- Native frame: 32×48
- Frames: 23
- FPS target: 8
- Animations: idle, walk, run, bounce, interact, damage, victory
- Source: `games/the-legend-of-more-bounce/assets/snes-v512/more-bounce-hero.v0.1.png`
- Animation map: `more-bounce-hero.anim.v0.1.json`
- Rights state: original project content

### Bouncehome Grove tiles

- Slot: `bouncehome-overworld`
- Tile size: 16×16
- Tile count: 8
- Tiles: Grass, Golden Path, Tree Edge, Moon Pond, Bounce Flowers, Old Stone, Echo Gate, Rune Accent
- Source: `games/the-legend-of-more-bounce/assets/snes-v512/bouncehome-grove-tiles.v0.1.png`
- Tile Studio source: `world/bouncehome-grove.tile-studio-seed.v5.12.json`
- Rights state: original project content

## Runtime proof

Bouncehome Grove now binds the real hero and tiles to the authored 24×16 map/collision packet.

A second scene packet defines Wobble Woods as a side-view stage with:

- authored platform geometry,
- bounce pads,
- gravity/jump parameters,
- Bounce Rune goal,
- Echo Gate endpoint,
- transition back to Bouncehome.

The standalone v5.12 preview proves a real **top-down → side-view** scene transition while keeping Wobble Woods environment art visibly pending.

## Truth boundary

Two required art slots are READY. Six required final-art slots remain pending: Larrina character, Larrina portraits, Wobble Woods environment, Larrina Tower interior, shared UI frames, and bounce effects.

A playable scene or valid asset hash does not equal human visual-gold-standard approval or retail authorization.
