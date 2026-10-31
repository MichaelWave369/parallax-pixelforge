# PixelForge Layer Studio: Rung 03 / Living Worlds

## What this rung actually connects

The first two rungs added a layered canvas compositor and a playable petrification puzzle. Rung 3 adds a **real, browser-local import bridge** for the repository's established authoring contracts:

| Native origin | Supported input | Rung 3 result |
| --- | --- | --- |
| PixelForge Tile Studio | \`pixelforge.tile-studio.v5.10\` JSON state | Authored 16×16 tile pixels, ground/decor map, solid collision flags, walkability, hazard tags |
| Tile Studio exported map | \`pixelforge.tile-map.v5.10\` \`.tile-map.json\` | Tile references, collision and semantic metadata. Uses colored placeholder tiles because the map export does not include the pixels |
| PixelForge Sprite Studio | \`pixelforge.sprite-studio.v5.9\` JSON state | Authored per-pixel character frames, named idle/walk/jump/damage/victory modes and frame durations |
| PixelForge Creator Studio project | JSON with top-level \`tileStudio\` and \`spriteStudio\` fields | Both formats imported together, in one step |

Everything is normalized into the existing \`pixelforge.layer-scene.v1\` scene's optional \`playable\` property: \`tileWorld\` (\`pixelforge.layer-tiles.v1\`) and \`actor\` (\`pixelforge.layer-actor.v1\`). Old scenes and the original Stonebridge challenge still work, because both imported fields default to \`null\`.

## Browser-first use

1. Open the existing **Creator Studio**, create tile art, paint your map and collision cells, and make a hero sprite with meaningful frame labels. Save the Creator Studio project with its normal **Save Local** button.
2. Open **Layer Studio** in the same browser and website origin. In **Living World Pipeline**, press **Import from saved PixelForge Creator Studio**. If you have a downloaded native project instead, use **Import tile map JSON** and **Import actor JSON** individually.
3. Set **Tile Scale** (1–4), **Map Origin X/Y**, and optionally **Show solid tiles** to see the authoring grid on the canvas. Set the gameplay spawn, key, gate and platforms in the existing Stonebridge Puzzle Builder to match your imported layout.
4. Press **Play Stonebridge** to play with your own map collision and animated character. **Export JSON** includes the normalized imported art for portable offline use.

The direct handoff is intentionally **opt-in** and only reads the existing \`parallax.pixelforge.v5.0.project\` same-origin localStorage key. It does not transfer files or publish creator artwork. When browser storage is unavailable or too large, the user can use the bounded JSON file import instead.

## Real gameplay behavior

Tile Studio's explicit collision booleans and non-walkable/wall tiles become real square world-space solid cells. Players land on floors, stop at walls, and hit ceilings. Hazard-tagged tiles inflict health damage and honor the existing invulnerability interval. Platforms and petrified enemies from Rung 2 still work alongside imported map tiles. Imported actor frames are drawn at the existing player hitbox and switch between available named animations; missing labels fall back gracefully.

The play route still draws distant scenery before the gameplay plane and the frontmost layer after it; UI is last. Imported tile pixels are cached in 16×16 canvases for efficient viewport-cropped rendering. For metadata-only map exports, the renderer uses restrained tag-dependent placeholder colors rather than pretending pixels are available.

## Security, limitations and boundaries

- Local files only. No URL imports, scripts, HTML assets, remote APIs, telemetry or privileged file access.
- Tile Studio maps are bounded to 64×48 cells, 128 tile types, and up to 4× scale. Actor imports are bounded to 64 frames of at most 128×128 pixels. Colors must be \`#RRGGBB\`; unrecognized values are discarded.
- Import file size is capped at 12 MB in the browser; a big painted project can exceed browser localStorage quotas. Use Export JSON and avoid oversized assets.
- Importing a Tile Studio map **does not automatically author a completed level**, move the key/gate to safe positions, or remove existing Rung 2 platforms. Use the Puzzle Builder to align actors and level objects.
- Collision is rectangular and discrete at 60 Hz. Fast movers, slopes, advanced tile autotiling, enemy navmeshes, per-pixel combat, sprite pivots and commercial physics fidelity remain out of scope.
- Rung 3 integrates native artwork and physics into Layer Studio. It does not claim a full adapter into every other PixelForge runtime or game cartridge yet.
- Human visual/physical browser testing (desktop, touch, controller) remains separate from CI assertions.

## CI

The required \`test:studio\` command includes \`tests/layer-living-worlds.test.js\` alongside Rung 1 and Rung 2 tests. Run:

\`\`\`sh
node --test tests/layer-studio.test.js tests/layer-puzzle.test.js tests/layer-living-worlds.test.js
\`\`\`

The tests cover pixel and map contract fidelity, metadata-only export behavior, legacy project imports, actor labels/duration, tile floors/walls/ceilings/hazards, persistence, bounds, local-only rendering and editor controls.

**Next rung direction:** camera regions, scene transitions, reusable authored trigger zones, attack frames, occlusion and static-light masks, then links into the broader PixelForge runtime. Not shipped in Rung 3.
