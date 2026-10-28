# PixelForge Portable Gameplay v2: PlayCanvas Key Visibility Adapter

## Why

PixelForge v1 authoring lets a creator select a scene object and define a bounded engine-neutral `pixelforge.gameplay.key-visibility.v1` sidecar. The GDevelop v1 translator emits native visual events. This rung adds a **second, independently compiled runtime target** for the same exact source rule: a local PlayCanvas Engine viewer.

## PixelForge workflow

1. Open PixelForge VR Studio and select an existing world object.
2. Choose E, F or Space; choose Hide or Show under GAMEPLAY RULES.
3. Click **Export PlayCanvas Interaction ZIP**. The ZIP contains a generated local PlayCanvas npm/Vite project, static glTF 2.0 geometry, and a separate `public/gameplay.json` compiled behavior manifest.
4. Extract to a fresh folder; run `npm install` (requires internet or pre-cached packages), then `npm run dev` and open the local URL.
5. Release the configured key. The generated listener finds the imported scene object using a **unique immutable PixelForge source ID** encoded into glTF node names as `PF_ID_obj-###`; it toggles PlayCanvas `GraphNode.enabled` without invoking source scripts.
6. Verify scene geometry, exact target, keyboard behavior, and console messages in a real PlayCanvas browser runtime. This actual-browser acceptance step remains **PENDING**.

## Behavior contract

- The same `createGameplayBlueprint` / `validateGameplayBlueprint` is used for GDevelop and PlayCanvas.
- Allowed: `on=keyReleased`, keys E, F, Space; actions Show or Hide on a source object ID.
- No arbitrary JavaScript or eval from the blueprint. The optional PlayCanvas adapter emits fixed generator-owned JavaScript with a strictly validated JSON rules payload.
- 1–12 nonconflicting rules supported in pure library API; the authoring UI creates one.
- Imported names are walked recursively; if any required ID is missing or ambiguous, **no keyboard listener is installed**. Never target arbitrary objects by the original display name.
- Repeated and modified key events are ignored, and input from text fields/buttons is skipped.
- For the opt-in behavioral package, the GLB node names use source IDs, not the human display names. The original PixelForge JSON, regular GLB output, and plain PlayCanvas ZIP remain unchanged.

## Files

- `public/world.glb`: original authored cuboid geometry only. Imported third-party GLB bytes are not bundled.
- `public/gameplay.json`: compiled, auditable rule, target ID, resolved unique entity name, allowed trigger and effect.
- `src/main.js`: standard camera viewer plus a small, fixed keyup listener attached only after assets load and targets resolve unambiguously.
- `manifest.json`: behavior payload and honest not-yet-browser-tested status.
- `README.md`: initial run and optional behavior notices.

## Test and acceptance

`npm run test:engine-exports` includes `tests/playcanvas-visibility.test.js`.
Tests assert GDevelop and PlayCanvas compile the same source rule, preserve scene immutability, retain deterministic ZIP and GLB identifiers, generate valid JS syntax, and refuse invalid rule targets and private asset substitution.
The tests also run the **actual generated handler source** against a synthetic entity graph, proving show/hide and no-listener-on-ambiguous-target behavior without a browser. They do not prove the PlayCanvas glTF importer retains node names exactly, browser keyboard delivery, or headset behavior.

## Explicit exclusions

No navigation, collision, physics, NPCs, quest system, spatial interactions, movement, save/load, multiplayer, Android/Quest native build or XR session support. The project is an editable, local browser viewer with one constrained gameplay primitive, not a finished game.

Upstream references:
- https://api.playcanvas.com/engine/classes/ContainerResource.html
- https://api.playcanvas.com/engine/classes/Entity.html
- https://developer.playcanvas.com/user-manual/engine/
