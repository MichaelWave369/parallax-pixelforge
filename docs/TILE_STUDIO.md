# PixelForge Tile Studio + Map Composer v5.10

Tile Studio is the SNES-first world-art companion to Sprite Studio. It is intentionally small: draw true 16×16 tiles, classify them, compose layered maps, record collision, then export or attach the results without leaving PixelForge.

## Tile authoring

The tile editor includes pencil, eraser, bucket fill, eyedropper, line, rectangle, undo/redo, horizontal/vertical mirror, house palettes, custom colors, and a visible pixel grid. Each tile records a semantic tag, walkability, and optional autotile-group label.

The **Seed Grove Skeleton** action creates named blank production slots for grass, path, tree edge, water, flowers, stone, gate, and rune accent. It does not generate fake final art.

## Map Composer

Maps use 16×16 authored tiles and three explicit layers:

- `ground` — base world tiles
- `decor` — transparent-detail / foreground tiles
- `collision` — explicit blocked cells

Map tools include paint, erase, and flood fill. Presets cover 16×12 rooms, the 24×16 SNES scene baseline, 32×18 wide scenes, and 40×24 large areas.

## Exports

- **Tileset PNG** — native-pixel packed sheet.
- **Map JSON** — dimensions, layers, collision, tile metadata, palette, scene ID, and Asset Forge slot.
- **Asset Forge attachment** — local PNG, SHA-256, declared rights state, semantic tile inventory, and receipt.
- **Project map attachment** — stores the map packet in PixelForge's project asset registry.

## Autotile boundary

v5.10 records autotile groups such as `forest-edge`, `path`, or `water-edge`, but it does not claim edge/corner variants exist until they are actually authored. Future tooling can automate placement only after the necessary variants are present and reviewed.

## Rights boundary

A hash and declared rights state are provenance evidence, not a legal determination. Human rights review and visual approval remain release gates.
