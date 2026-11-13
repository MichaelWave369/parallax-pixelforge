# PixelForge Procedural Map Generator v1

The first procedural map generator lives **inside the existing Tile Studio + Map Composer**. It generates real editable v5.10 tile maps, not a decorative screenshot, external preview, or replacement game engine.

## Using it

1. Open PixelForge and select **Open Tile Studio + Map Composer**.
2. Choose a map size from the existing selector.
3. Select **Connected dungeon**, **Organic cavern**, or **Forest trails**.
4. Enter any seed (up to 80 characters), then select **Generate Map**.
5. Edit the generated ground, decor, or collision layers using the normal tools.
6. Export Map JSON or attach the map to the project as before. The export contains optional `generation` metadata.

Generating replaces the active **map layers** and is undoable. Existing authored tile artwork is retained. When the project contains only the single empty starter tile, PixelForge installs six deterministic 16×16 placeholder tiles so the generated world is visible and uses semantic tile tags.

## Supported generators

| Mode | Method | Guarantees |
| --- | --- | --- |
| Dungeon | Bounded rooms joined by orthogonal corridors | Walkable entrance-to-exit route |
| Cavern | Random initialization and four cellular-automata smoothing passes | Walkable route through organic cave geometry |
| Forest | Seeded tree obstacles, water pockets, and winding trails | Walkable entrance-to-exit route |

The generator is seed-deterministic for the same mode, map dimensions, and seed. It supports the current four Map Composer sizes and the underlying 8–64 by 8–48 tile-map bounds.

A collision-grid breadth-first search verifies that the entrance can reach the exit with four-directional movement. Borders remain blocked. This is **grid reachability**, not proof of game balance, visuals, quest logic, enemy placement, VR comfort, collision physics, or navigation for every possible agent.

## Integration and compatibility

- Module: `procedural-map.js`
- UI and map serialization: `tile-studio.js`
- Styles: `styles.css`
- Test suite: `tests/procedural-map.test.js`
- Run: `npm run test:procedural`, also included in `npm run test:studio`
- Optional map export field: `generation` containing mode, seed, entrance/exit coordinates, dimensions, and route verification.
- Manual map edits and resizes clear the prior generation receipt so an older route check is not represented as a fresh verification.

Generator tiles are simple original placeholder patterns. The system **does not** currently implement room-level gameplay rules, locked doors, key placement, bosses, multistory Metroidvania graphs, infinite chunk streaming, or 3D/VR procedural world generation. Those are appropriate follow-on versions once this 2D layer contract is qualified.
