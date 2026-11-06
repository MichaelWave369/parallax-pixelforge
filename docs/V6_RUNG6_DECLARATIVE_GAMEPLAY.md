# PixelForge v6 · Rung 6: Declarative Gameplay Logic

Rung 6 extends the **opt-in** PixelForge v6 workflow with a deterministic, data-only, browser-local rule system. The existing VR Studio v1 format, original PixelForge runtime composer, source scene authority and protected GLB asset pipeline remain unchanged.

## Build a small quest

1. Open `?forge=1` → **Game Logic**. Load the canonical VR sample, or import an existing scene through Physics first.
2. Select an eligible primitive from **Attach near primitive**. Choose a display name and optional checkpoint/victory message.
3. Create **Collectible**, **Checkpoint**, or **Finish**. Collectibles and checkpoints can appear in any order; the finish becomes active only after all other objectives have fired.
4. Edit the X/Y/Z location and activation radius (0.3–4 meters) of each marker, remove markers or use Undo/Redo.
5. Export the separate **source-bound gameplay rules sidecar** if you want to edit it later. Import is validated against the exact source scene SHA-256 and rejects foreign sidecars.
6. Choose **Play With Rules** or **Export Playable World**, then open the standalone `?play=1` player.

This first rung provides simple **proximity** triggers, not line-of-sight, interaction buttons, combat, scripted quests or programmable event graphs.

## Data contract

Optional gameplay within the existing `pixelforge.playable-world.v1` JSON:

```json
{
  "gameplay": {
    "format": "pixelforge.gameplay.v1",
    "source_sha256": "<64-character source scene hash>",
    "collectibles": [
      {
        "id": "pickup-1", "name": "Field Spark",
        "position": [0, 1, -4], "radius": 1.25,
        "color": "#f9ce6d"
      }
    ],
    "triggers": [
      {
        "id": "trigger-1", "name": "Parallax Gate",
        "position": [2, 1, -4], "radius": 1.25,
        "message": "Checkpoint reached."
      }
    ],
    "goal": {
      "id": "goal-1", "name": "Finish Line",
      "position": [3, 1, -4], "radius": 1.5,
      "message": "World complete!"
    }
  }
}
```

All fields, ID patterns, colors, source SHA, name/message lengths, coordinates, radii, and array counts are validated before a world can run. Up to 24 pickups, 12 checkpoints, one goal. Marker definitions cannot contain URLs, scripts, arbitrary trigger actions, executable content or new capabilities.

Legacy playable-world.v1 JSON without `gameplay` still imports in **exploration mode**. Exported Rung 6 rules retain the same `pixelforge.playable-world.v1` format for backward compatibility; older unmodified code may reject optional gameplay fields, so use a Rung 6-capable World Player to load them.

## Simulation

The existing `PhysicsStage` exposes the **actual Rapier capsule rigid body's** measured position at a bounded cadence (about 10 times per second) to a separate pure function, `advanceGameplaySession`. It operates only on validated declarative rules:

1. Mark uncollected pickups within their spherical radius as collected.
2. Mark unvisited checkpoints within radius as activated.
3. Unlock victory only once every pickup and checkpoint is completed and the capsule enters the goal radius.
4. Return zero or more ordered `collect`, `trigger`, `win` **data events**.

Events cannot dispatch network calls, execute JavaScript or access the private vault. The React player shows collectible progress, checkpoint messages and a win banner. 3D glowing pickup and ring markers are non-collidable visual hints; collected markers disappear without resetting Rapier.

Restart resets gameplay session progress as well as the player's spawn. No gameplay progress is saved to a browser account or the original v5/VR Studio storage.

## Tests

```bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
```

`site/scripts/gameplay-rules.test.mjs` covers data-only imports, source preservation, source hash rejection, deterministic state progression, duplicate suppression, goal gating, simultaneous marker ordering, immutable authoring edits, capacity limits and legacy worlds.

### Manual browser checklist

1. Open `?play=1`; collect the two sample objects, visit the trigger ring and enter the goal. Confirm HUD changes and one-time victory.
2. Return to sample and restart; confirm collectibles reappear and progress is reset.
3. Pause the game within a marker radius and verify no objectives advance while paused.
4. Open Forge → Game Logic; load VR sample, attach a collectible to a primitive and edit its position. Add a checkpoint and finish marker; preview and export.
5. Reimport the exported playable JSON into a separate browser player and verify the same goals appear and complete.
6. Export the authoring sidecar, re-import against the same scene and try importing it against a different source world: only matching hashes should load.
7. Load an older Rung 5 JSON with no gameplay and confirm plain exploration still works.
8. Try invalid colors, oversized rule files, foreign source SHA-256, executable fields, unknown marker types, extreme coordinates and duplicate IDs. All must reject.
9. Verify responsive controls, WebGL error handling, and the original studio routes. Real Quest 3, controller and performance qualification is separate.

## Known limits and follow-up

These are **position/radius objectives**, not complex branching quests, inventory systems, navmesh, NPC AI, damage, multiplayer synchronization, audio, multiplayer scores, entity scripts or save-game serialization. The underlying world still uses simple cuboid proxy collision and a basic capsule controller without advanced steps or jumping. Private GLB geometry remains excluded from portable worlds.

A later rung can add a constrained event graph with declarative conditions/actions and deterministic state snapshots, but should retain the same explicit validation, no-execution boundary, and source-scene provenance.
