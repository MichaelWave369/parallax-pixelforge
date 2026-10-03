# PixelForge Runtime Composer

Runtime Composer is the v5.11 playable-scene bridge between authoring tools and cartridge runtime.

## What it binds

- Sprite Studio frame pixels and animation labels
- Tile Studio tiles and palette data
- Map Composer ground, decor, and collision layers
- player spawn, facing, speed, and camera-follow settings
- future scene-transition metadata

## Controls

Open **Runtime Composer** from the Studio sidebar. Click the stage, then use **WASD** or arrow keys. Collision comes directly from Map Composer. Use the collision overlay to audit blocked cells.

## Art boundary

Runtime Composer may show a semantic-color map or a simple preview silhouette when final art is blank. Those previews are explicitly non-production and do not change Asset Forge readiness.

## Export

**Export Runtime Scene** writes a portable `pixelforge.runtime-scene.v5.11` JSON packet containing map layers, tile metadata, sprite binding, camera/player settings, and the claim boundary.
