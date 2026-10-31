# PixelForge Layer Studio — Rung 05: Room Atlas

## A connected adventure without a new engine

Rung 05 adds the optional **Room Atlas** to the existing \`pixelforge.layer-scene.v1\` browser-first scene format. Single-room scenes from Rungs 1–4 remain valid. An atlas contains at most six independently editable rooms, each carrying its own Layer Scene v1 content (animated layers, the Sprite Studio/Tile Studio imports, authorable puzzle objects and World Director triggers/lighting). Each room can have up to eight declarative door links.

This is deliberately a small *local* world graph, not an MMO, file loader, script engine, or complete new cartridge runtime.

### Build a two-room demo

1. Open Layer Studio and choose **Create two-room adventure** in the **Room Atlas** dock. The original Lantern Vault is preserved as room one. A second chamber, **The Forgotten Reliquary**, starts with varied effects, lights and a return portal.
2. Select **Current Room** to switch editing surfaces. Every existing Layer Studio inspector and puzzle/Director control edits the selected room's data. Switching rooms saves the current room into the in-memory atlas. Use **Room Title** to rename it.
3. **Add New Room** creates another chamber and adds a two-way door connection where capacity permits. Edit the doorway coordinates, label, destination, arrival position and whether the current room's key is required. Up to six rooms / eight doors per room are supported.
4. Set a different **Play Start Room** if desired. **Show door guides** overlays edit-time door bounds. **Save Local** or **Export JSON** keeps all authored rooms together.
5. Press **Play Stonebridge**. Move to the door. For a locked door, collect that room's key first. Press **E** (keyboard), **X** (Xbox controller) or **Enter** (touch button) to travel.

In a Room Atlas, the previous single-room victory gate is treated as a doorway destination, not a win condition. In a legacy single-room scene, the existing key and victory behavior is unchanged.

### World state and travel

- \`pixelforge.layer-atlas.v1\` is an optional \`atlas\` on the outer Layer Scene v1. It consists of \`startRoom\` and up to six \`rooms\` with \`id\`, \`title\`, self-contained scene payload and bounded portal links.
- Travel is an explicit user interaction. Overlapping a door does not silently teleport the player. A portal references an existing destination room ID, an arrival position, and an optional key requirement. Invalid destinations are visually blocked and cannot load a remote URL or run scripts.
- Each room's key, petrified enemies, checkpoint and once-fired World Director triggers are snapshotted upon exit and restored on re-entry. Global health and death count carry between rooms for the current play session.
- The destination player spawns at the authored door arrival, with a brief invulnerability interval. Movement, Sprite Studio animations, Tile Studio walls, World Director lighting, checkpoints and camera zones continue to work per room.
- The number of room transitions is tracked by the runtime. The system does not yet persist active *play session* progress across browser reloads. The authored **world** is persisted when exported/saved.

### Why not rewrite the file format?

The outer scene keeps its v1 schema, and the atlas field is an additive extension. Each room is normalized through the existing Layer Scene v1 validators with its nested atlas stripped to prevent accidental recursion. A scene without an atlas follows the same single-room game path as before. Old scenes do not gain unwanted doors.

Import files are still bounded at 12 MB by the browser editor. Asset image rules are unchanged. Room count, portal geometry, labels, travel coordinates and destinations are bounded and validated at import. There is no network import, remote asset source, eval or arbitrary event action.

### Testing

The required \`npm run test:studio\` includes \`tests/layer-room-atlas.test.js\`. It covers old-scene victory, starter atlas normalization and roundtrip, denied/allowed keyed travel, backtracking and per-room progress restoration, invalid destination bounds, visual drawing hooks, and browser input/editor contract surfaces.

\`\`\`sh
node --test tests/layer-studio.test.js tests/layer-puzzle.test.js tests/layer-living-worlds.test.js tests/layer-world-director.test.js tests/layer-room-atlas.test.js
\`\`\`

## Current boundaries

This rung ships multi-room navigation, not production-grade streaming or complete adventure tooling. It does not yet provide authored endgame sequences, enemies that roam across rooms, full save-slot persistence, procedural world generation, persistent player inventory beyond the current room keys, or multi-user/networked sessions. Camera and gameplay remain 2D Canvas and physics uses the established 60 Hz step. Manual phone, desktop and controller playtesting remains an independent acceptance gate.

**Next potential rung:** inventory and save slots, conditional global doors, map/room overview and more robust scene transition animations.
