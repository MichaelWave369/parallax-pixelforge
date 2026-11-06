# PixelForge v6 · Rung 5 — Portable Playable Worlds

This rung makes construction results from PixelForge v6's Physics Lab **portable** and **playable in another browser** with the PixelForge World Player.

## Entry points

- **Builder:** Open `https://michaelwave369.github.io/parallax-pixelforge/?forge=1`, choose Physics, and load an existing VR World sample/save/JSON. If needed, add or move construction prefabs using the Rung 4 tools.
- **Preview:** Use **Play This World**. It uses the current validated editor profile, transitions into a standalone read-only player UI, and returns to the editor without changing the canonical scene.
- **Export:** Use **Export Playable World** to download `pixelforge-playable-world.v1.json`.
- **Shared player:** Open `https://michaelwave369.github.io/parallax-pixelforge/?play=1`. Choose **Import Playable JSON**, or explore the bundled public sample course without uploading anything. The user can restart/respawn and save another copy of the world document.

Sharing the World Player URL **does not share the JSON itself**. Share the JSON file separately. Browser imports operate on local files only.

## Wire format: `pixelforge.playable-world.v1`

The JSON contains a strict declarative structure:
- `format` and bounded `title`
- `source`: original `pixelforge.vr-world.v1` format and a SHA-256 **reference** to the exact source scene.
- `capabilities`: fixed `LOCAL_BROWSER_ONLY / RAPIER_PREVIEW / NONE(network) / NONE(scripts)` constants, validated on import.
- `gravity`: finite value in `[-20,0]`
- `spawn`: finite 3-component world position within `[-100,100]`
- `objects`: up to 160 unique, bounded cuboid records: `id,name,kind,color,body,friction,restitution,position,scale,yaw`

Every imported field is checked; extra root, source, capability or object keys are rejected. There are no URLs, asset payloads, code, script hooks, network permissions or privileged actions. Imported JSON is parsed and validated, **never evaluated**. The player imports at most 160 KB per file and retains the loaded world in the current React session.

The exporter reads the existing canonical VR World and validated Physics sidecar. It:
1. Applies declared scene-bound collision and transform edits.
2. Adds Rung 4's bounded construction prefabs.
3. Excludes **all** `asset-proxy` objects rather than serializing an unqualified private GLB or claiming mesh collider parity.
4. Requires an authored fixed floor, picks a spawn point above it and validates the final materialized manifest.

The `source.sha256` is **provenance metadata, not a signature**. The portable JSON intentionally does not embed private or purchased model bytes or the authoritative source world, so importers cannot cryptographically independently verify that reference. User-provided files may misstate it.

## Runtime

The World Player shares the already bundled, lazy-loaded Three.js + Rapier stage used by the Creator Forge. It renders authored primitive cuboids, creates fixed and dynamic collision bodies, instantiates a basic capsule avatar at the manifest's spawn and uses a 60 Hz fixed physics step.

Controls: WASD or arrow keys for level-plane movement, mouse drag for orbit, wheel for zoom, Pause/Resume and Restart/Respawn. A reset creates a fresh Rapier world; no browser-local existing v5 scene is modified.

This is a **collision-based 3D walk-through prototype**, not a full game/cartridge or a guaranteed installable offline export. Advanced character locomotion, jumping, win states, quests, enemy AI, audio/VFX gameplay, production GLB meshes, signed provenance, external engines, multiplayer, Quest 3 performance, and standalone self-contained HTML packaging remain future work.

## Testing

```bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
```

Node tests in `site/scripts/playable-world.test.mjs` verify the demo contract, build/export from canonical scenes and construction sidecars, strict import parsing, gravity and spawn validation, refusal of added network/code fields, missing fixed floors, stale source fingerprints, duplicate IDs, bounded size and geometry, and exclusion of private GLB identifiers and filenames.

Manual browser acceptance:
1. Open the World Player `?play=1`; verify the sample course renders, character falls onto the floor and WASD moves with Rapier collisions.
2. Restart and Pause/Resume, orbit and zoom. Check that a restart returns the capsule to the exact declared spawn.
3. Open `?forge=1` → Physics → Load VR sample → + Block on a fixed floor. Use Play This World; verify the added block appears in the World Player and collides with the player.
4. Return to Forge; export the playable JSON and open it via Import Playable JSON at `?play=1`. Compare object positions, colors, body modes and gravity.
5. Try a malformed JSON, a file exceeding 160 KB, a file containing unknown fields, script URLs, privileged capabilities or duplicate IDs. Verify rejection without data execution.
6. Import an original VR scene containing a private asset proxy. Ensure neither its asset ID, source filename nor SHA-256 appears in the playable export.
7. Confirm original VR Studio and existing Pages routes still work and private folders were not published.
8. Run desktop WebGL2 tests and accessibility/responsive checks; Quest hardware remains an **unqualified** target.

## Next rungs

- Save/load portable worlds through an explicit file workflow in the Creator Portal and reusable packaged/runtime versioning.
- Add authored gameplay rules (events, collectibles, goals) with a deterministic, capability-bounded runtime.
- Optional self-contained offline packaging with licensed dependencies explicitly included, not a CDN-only HTML facade.
- Qualified input/controller and physical-headset benchmarks.
