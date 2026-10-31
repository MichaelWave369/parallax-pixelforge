# PixelForge Layer Studio — Rung 06: Adventure Journal

## Your connected worlds can remember their own story

Rung 06 is an additive extension of the browser-local Layer Scene v1 / Room Atlas v1 system. It adds **collectible relics**, **relic-gated doors**, a **discovered-room world map**, and **three explicit browser save slots**. No server, identity account, remote asset or executable event action is involved.

### 1. Author the relic trail

Open **Layer Studio → Room Atlas**. Create a two-room adventure if you do not have one already. Rung 06 adds a **Collectible Relics** section for each room. A collectible has a stable ID, name and world-space X/Y. Add up to eight collectibles per room, rename and move them, then enable **Show door guides** to view glowing collectible markers in the editor. An atlas supports six rooms, so the bounded maximum is 48 collectible placements.

When editing a door, choose its **Required Relic**, or leave the field on **No relic required**. A requirement references a specific relic by room ID + relic ID and is checked against the global player inventory. The existing **Requires this room's key** toggle still works independently. Doors can require both, either, or neither.

The starter two-room adventure now contains a **Lantern Shard** in the Lantern Vault and an **Echo Seal** in the Forgotten Reliquary. Both are visible glowing pickups. They join the global inventory on player overlap and do not reappear after backtracking. Unlike the room key, relics travel with the player.

Unresolvable relic requirements never silently unlock the door. An invalid linked destination remains blocked as before.

### 2. Explore the map and inventory

In **Play Stonebridge**:

- **M** or the **Map** button opens the Room Map, showing discovered rooms, room-to-room passages, relic collection counts, and the current location. Unvisited rooms stay unnamed. The map is read-only and cannot bypass locked doors.
- **I** or **Inventory** opens the relic pouch: current room key state, global collected relics and where each was found.
- **J** or **Saves** opens the Save Journal. Pressing any journal toggle freezes gameplay until it is closed. **Escape** or the close button returns to play.

These controls work with keyboard and browser touch controls. The play screen retains the existing A/D, jump, petrification, E-door, pause and controller handling. The new HUD is ordinary HTML layered over Canvas 2D, with no executable script content imported from creator data.

### 3. Save and load on your terms

The Save Journal has **three explicit local save slots**, each with Save, Load and Delete controls. Saving while a slot is occupied asks before overwriting; deletion asks before removal.

Each slot persists a bounded \`pixelforge.layer-save.v1\` record to browser **localStorage**, keyed by the fingerprint of the authored Layer Scene JSON plus slot number. The record includes:

- active room and player position;
- current health, deaths, transitions and (single-room) victory state;
- discovered rooms and global relic inventory;
- room-local keys, petrified enemies, triggered once-only World Director events, and activated checkpoints.

Loading validates the version, selected slot, current world fingerprint, room IDs, known collectible keys, bounded coordinates, known enemy IDs, and known event/checkpoint IDs. Invalid records or changed world data fail safely. Loading restores the current room and all saved backtracking progress with a brief invulnerability window.

**A world fingerprint is only a change-detection identifier**, not a cryptographic signature or anti-cheat protection. The browser is the user-owned storage boundary.

### Scope and limitations

- Saves are *not* synced across browsers or devices. Browser cache/site-data clearing deletes them. Export your **authored Layer Scene JSON** separately, since the manual game-save slots are not included in that file.
- Editing the authored world changes its fingerprint and intentionally starts an independent set of slots. Previous saves are not migrated automatically.
- Game-save slots persist play progress, **not** the underlying authored art files. They are intentionally small (200 KB maximum per save record). If browser storage is full or disabled, the UI reports failure.
- Rung 06 does not include stackable consumables, item use/equip, quests, crafting, item art import or a persistent cross-device cloud profile. Relics are unique global progression flags with visible collection feedback.
- The world map is a discovered graph, not free travel or a navigable minimap. Room Atlas bounds remain six rooms and eight doors per room.
- The demo's native WebXR support, full production gamepad focus management, and real headset/browser playtesting are not implied by passing unit tests.

### Regression suite

\`tests/layer-adventure-journal.test.js\` is added to the mandatory \`npm run test:studio\` command. It exercises:

1. Legacy single-room victory and new starter relic metadata.
2. Pickup de-duplication, room backtracking, and inventory/map discovery.
3. Relic-gated door denial and successful passage.
4. Metadata normalization and strict no-silent-unlock behavior.
5. Three-slot save/load, cross-room state restoration and single-room compatibility.
6. World-fingerprint isolation, deliberate deletion and forged save input bounds.
7. Rendering hooks and functional editor/play UI surfaces.

\`\`\`bash
node --test tests/layer-studio.test.js tests/layer-puzzle.test.js tests/layer-living-worlds.test.js tests/layer-world-director.test.js tests/layer-room-atlas.test.js tests/layer-adventure-journal.test.js
\`\`\`

### Next direction

A natural Rung 07 would be authored quests, named global conditions, checkpoint-aware save ergonomics, and a real encounter/event sequence graph. Preserve the current save schema and backwards-compatible scene model rather than inventing another game framework.
