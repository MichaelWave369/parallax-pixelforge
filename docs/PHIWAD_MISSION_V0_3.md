# ΦWAD Mission Builder v0.3 (Michael & Ori content handoff)

This rung adds a creator-driven mission layer to ΦWAD, based on inspection of the publicly deployed **Michael Wave & Ori: Break the Matrix v0.2.1** source modules. It does not claim that the shipped game already loads custom levels.

## Why a mission profile?

The current game's normal campaign has fixed 29 × 25 tile worlds and checks for **two control relays**, a **golden key**, and a nearby **extraction portal**. A geometry-only file could look correct in the raycaster and still produce an unwinnable game. This rung explicitly validates those requirements rather than inventing missions silently.

## Use the editor

Open [ΦWAD Mission Builder](../phiwad/mission.html) from the original [ΦWAD workshop](../phiwad/index.html). Choose a previously exported .phiwad, then select a tool and click walkable cells to place:

- Relay 1 and Relay 2, key, and extraction portal: required
- Plugged hosts, repeaters, enforcers, crawlers and Wardens: optional
- Health, armor, energy and artifacts: optional
- Captive minds: optional

The editor shows a top-down tile grid. You can also focus the grid, use arrow keys to move the selection, and Enter to place. Erase removes authored objects at a cell.

**Validate mission** checks bounds, walkability, spawn reachability via a 4-direction flood fill, object overlap for critical objectives, recognized enemy/item types, and count limits. Unreachable objectives are rejected. Mission data remains JSON and is never executed as code.

When valid, export a `-mission.phiwad` file. It uses the existing ΦPACK 0.1 ZIP transport and profile `phi369.raycaster-level.v0.1`, with an optional `mission` object:

~~~json
{
  "profile": "michael-ori.relay-mission.v0.1",
  "relays": [{"x":4.5,"y":5.5},{"x":8.5,"y":6.5}],
  "key": {"x":10.5,"y":4.5},
  "exit": {"x":12.5,"y":8.5},
  "enemies": [],
  "items": [],
  "captives": []
}
~~~

Coordinates above are illustrative, **not guaranteed playable** on an actual map. The selected map determines legal placements.

## Runtime compatibility handoff

The editor can export a second JSON file, `-game-handoff.json`. It centers any level at most 29 × 25 inside a full 29 × 25 grid, with sealed walls, translated player spawn, relays, key, extraction, enemies and pickups. It includes an explicit false flag `gameRuntimeLoaderInstalled`.

This JSON **is not a complete Game snapshot**. The published game currently binds its gameplay logic, renderer, six campaign definitions, save system and progression to the existing sector indices. A safe game-owned importer must handle those bindings and separate community/custom checkpoints from the original campaign.

## Trust and limitations

- No game JavaScript is executed or embedded in packages. Package rights metadata stays author-provided, and imported rights declarations are preserved when re-exported.
- The validation ensures all mission points are in the spawn's connected floor component in the static binary map. It does not prove enemies can be defeated, that art is licensed, or that a game's actual interaction radius/camera has been qualified for every layout.
- Existing geometry-only ΦWAD archives and ordinary ΦPACK scenes remain supported by their original adapters.
- No door-lock/key gates, texture binding, custom AI scripting, dynamic hazards, campaign progression or in-game loader are added in this rung.
- Tests run with `npm run test:phiwad:mission` and are part of `npm test`, which is exercised by CI.

## Next integration rung

Patch the **original Michael & Ori source archive** with a guarded custom-level loader, explicit UI entry and isolated saves. Qualify a generated mission against the actual game's core, renderer, objective checks and Xbox controller on desktop. Keep the six original campaign sectors unchanged until parity tests pass.
