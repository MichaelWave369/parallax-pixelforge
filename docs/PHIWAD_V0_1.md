# ΦWAD v0.1: Raycaster Content Bridge

**Experimental interchange, not an original Doom WAD and not yet integrated into Michael & Ori.**

ΦWAD is a new scene profile inside the existing ΦPACK v0.1 ZIP container. It converts PixelForge Runtime Composer v5.11 collision scenes into portable 2.5D raycaster maps.

## Browser workflow

Open [ΦWAD Workshop](../phiwad/index.html) from PixelForgeStudio's topbar. Choose a Runtime Composer JSON scene, click **Convert and preview**, walk the map in the raycaster preview, then download a .phiwad archive. A downloaded archive can also be inspected and reopened.

Controls: WASD to move/strafe, left/right arrows to turn, and Xbox Bluetooth gamepad left stick for movement with right stick for horizontal looking. Gamepad support depends on the browser Gamepad API. Keyboard works offline.

## Developer workflow

- npm run test:phiwad
- npm run test:phipack

API in phiwad/level.js: convertRuntimeSceneToRaycaster(scene), buildPhiWad(scene, options), loadPhiWad(bytes), and validateRaycasterLevel(level).

On disk, .phiwad is still a ZIP with a ΦPACK manifest. The new kind is level, the profile is phi369.raycaster-level.v0.1, and the entry is levels/main.raycaster.json.

## Conversion contract

- Collision 0/1 maps to walkable/solid raycaster cells.
- A one-tile sealed boundary is inserted around the map, with authored coordinates offset +1.
- Player spawn keeps author position and cardinal facing; authored exit IDs and targets are retained for future campaign integration.
- Non-walkable spawn, invalid transition, oversized scene or malformed collision data fail closed.
- No textures, enemy encounters, quests, weapons, scripted doors, or audio are automatically transferred. The exported level lists omitted features.
- Generic ΦPACK v0.1 scene export is still supported. Per-engine adapters own validation of their supported content.
- CRC32 checks are not cryptographic authenticity. Importers must treat externally supplied game data as untrusted.
- Processing is local-only and rights declarations do not establish legal permission to redistribute assets.

## Michael & Ori follow-up qualification

1. Inspect the actual v0.2.1 game source and map/door/actor/objective formats.
2. Add a game-owned loader which reports incompatible package capabilities, rather than silently degrading gameplay.
3. Roundtrip a reference map and an original campaign level, verify collision and completion.
4. Add the in-game Load Custom Level UI and preserved save/checkpoint behavior.
5. Expand the schema for enemy spawns, interactive objects, secrets, audio and texture bindings.

**This milestone proves:** a real portable package, geometry conversion, browser test-walk, Xbox controller preview and CI coverage. It does not prove playable Michael & Ori integration yet.
