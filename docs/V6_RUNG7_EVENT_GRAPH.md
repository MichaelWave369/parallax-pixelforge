# PixelForge v6 · Rung 7: Declarative Event Graph

Rung 7 builds on the merged Rung 6 Quest Engine with **switches, proximity secrets, locked colliders and branching AND/OR conditions**. This is a bounded dependency editor and deterministic state reducer, **not** a JavaScript/visual scripting execution engine.

## Launch

- Open `?forge=1` → **Game Logic**.
- Load the VR Studio sample or another validated, existing VR scene. If you need a door, use Physics to build a fixed **block**, **pillar**, or **platform** as a gate, or select an existing solid of those kinds.
- Author regular collectibles, checkpoints and the Finish marker in the Rung 6 editor.
- In **Rung 7 / Event Graph**, add **Interactive Switch** (press E inside its radius) or **Hidden Secret** (approach within its radius to discover).
- On each card, choose **Require ALL (AND)** or **Require ANY (OR)** of the available pickup, checkpoint, switch or secret events. These are visible and editable directed connections. No evaluation of authored text occurs.
- Choose a fixed solid door target and an initial prerequisite, then select additional AND/OR connections for opening it.
- Enable an **Alternative Route** goal condition to change winning from the legacy all-pickups/all-checkpoints rule to a specific AND/OR dependency set.
- Export the source-bound game-rules sidecar, or preview and export the portable playable world (same `pixelforge.playable-world.v1` outer format).
- Open the World Player at `?play=1`, import or play the bundled sample. Press **E** near glowing switches, approach hidden secret markers, observe door unlocks and alternate victory paths.

The graph editor is **card-and-link based**, with dependency checkboxes. A freeform canvas of draggable Bézier wires, script blocks, custom action plugins, advanced puzzles and visual debugger are **not implemented**.

## Wire contract

Rung 7 introduces an optional `graph` under `gameplay`:

```json
{
  "graph": {
    "format": "pixelforge.event-graph.v1",
    "nodes": [
      {
        "id": "switch-1", "kind": "switch", "name": "Gate Switch",
        "position": [1, 1, 0], "radius": 1.4,
        "message": "Switch activated.",
        "requires": { "mode": "all", "ids": [] }
      },
      {
        "id": "secret-1", "kind": "secret", "name": "Hidden Route",
        "position": [-5, 1, -5], "radius": 1.4,
        "message": "Secret discovered.",
        "requires": { "mode": "all", "ids": [] }
      }
    ],
    "doors": [
      {
        "id": "door-1", "objectId": "placed-2", "name": "Gate",
        "message": "Door unlocked.",
        "requires": { "mode": "any", "ids": ["switch-1", "secret-1"] }
      }
    ],
    "goalRequires": { "mode": "any", "ids": ["switch-1", "secret-1"] }
  }
}
```

- Up to 12 switch/secret nodes, 8 door references, and 8 dependencies per condition.
- Each graph dependency refers to an existing pickup/trigger or switch/secret event **ID**. Unknown IDs, duplicate IDs, self-links and cycles are rejected. Dependencies on doors are not supported, to avoid complex actions and feedback loops.
- Door targets must refer to a **fixed**, playable, non-proxy block, pillar or platform (never a floor, visual portal, moving rigid body, unqualified GLB mesh or private asset proxy).
- Door condition cannot be empty, so deletion of its final prerequisite removes that door rule instead of silently opening it.
- By default, absent `graph.goalRequires` preserves Rung 6 victory semantics (all pickups and checkpoints, then enter finish). Enabling a graph goal condition **replaces** that default prerequisite set and permits alternate routes; designers should select all required events explicitly.
- Legacy Rung 5 exploration worlds and Rung 6 gameplay without `graph` remain importable.
- All graph content is bounded declarative data: identifiers, message/name strings, coordinates, activation radius, and `all`/`any` lists. No URLs, arbitrary expressions, code execution, network calls, agent tools or access grants.
- Graph content is nested inside the existing `pixelforge.gameplay.v1` authoring sidecar, bound to the original scene SHA-256. As before, imported source hash is descriptive provenance, **not** independent signature verification.

## Runtime

The `PhysicsStage` samples the actual Rapier capsule player position about 10 times per second. Within each tick:

1. Collect pickups and activate legacy proximity checkpoints exactly once.
2. Activate unlocked and nearby secret nodes automatically; activate nearby switches only when the player explicitly presses **E**. A bounded fixed-point pass resolves linked events even if authored in reverse dependency order.
3. Check each door's AND/OR prerequisites. Once its dependencies are satisfied, remove the specified **fixed Rapier rigid body and collider** and hide the corresponding placeholder cube. This is a discrete disappearance, not an animated door.
4. Enter the Finish radius after satisfying the declared goal conditions to win.
5. Update the World Player's activity log, objective HUD, lock status and single-fire victory display.

The full event state is held in the React session as collected/triggered/activated IDs, openedDoor IDs and won status; **Restart** resets all of them and re-creates the Rapier world. Imported JS scripts never execute. This player does not use persistent account saves.

The public sample course demonstrates a switch path **or** a hidden secret path to unlock a fixed pillar and reach the finish, with pickups and checkpoints available as optional exploration objectives.

## Automated checks

```bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
```

`site/scripts/event-graph.test.mjs` tests valid source-bound graph JSON, legacy imports, gated switches, secret discovery, fixed-point dependency chains, single-fire doors, branch victory, cycle rejection, invalid/missing references, prohibited unsafe fields, exact door target safety, source scene immutability and marker deletion cleanup.

## Browser acceptance checklist

1. On `?play=1`, collect a pickup and visit a checkpoint; verify the old rules still fire once only.
2. Approach the starter Pillar Switch without pressing E; confirm the switch does not activate. Press E within range; expect a switch message and the Pillar Gate to disappear and lose its Rapier collider.
3. Restart, take the alternative secret route and confirm the same gate opens without using E. Then enter Finish and win.
4. Check that Objective progress, Door LOCKED/OPEN state and activity log update and don't duplicate events.
5. Restart again and verify the door collider reappears, switches re-arm, secret markers return and all progress resets.
6. From Forge → Game Logic, create two switches, a secret and a door on fixed block geometry; author both AND and OR dependencies, then preview and export. Verify imported JSON reproduces the same outcomes.
7. Attempt a graph cycle, unknown prerequisite, empty door dependency, dynamic door target, floor door target, fake GLB proxy and executable/URL fields; all must reject.
8. Confirm **Play With Rules** now includes authored gameplay, that older no-graph files still explore, and that original VR Studio v1 and v5 saves remain unchanged.
9. Test on a desktop WebGL2 browser; Quest 3 input, controls, performance and animation are **not qualified**.

## Remaining limitations

The editor is a linked-card visual graph, not yet a full node canvas. The player has primitive cuboid colliders and a basic WASD capsule controller. It does not provide smooth door animation, key inventories, health/combat, interactive NPCs, timed/branching dialogues, per-user save games, exportable stand-alone offline game packages, multiplayer, or external-runtime authority. Those should be separate future rungs with their own contracts and tests.
