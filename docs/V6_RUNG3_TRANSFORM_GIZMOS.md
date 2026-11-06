# PixelForge v6 · Rung 3: Direct 3D Transform Gizmos

**Status:** opt-in browser physics-sandbox editor rung, with CI schema coverage and browser acceptance still required. This does **not** qualify the original VR Studio, model licensing, physical Quest 3 runtime, or game-cartridge gameplay.

## Overview

In the live PixelForge v6 portal (`?forge=1`), choose **Physics**, load a canonical PixelForge VR Studio v1 world or the built-in sample, and select an object using the scene list or by clicking its 3D cube.

The viewport now has a real Three.js `TransformControls` editor on eligible objects:

- **Inspect** hides handles but highlights the selection.
- **Move (W)** shows X/Y/Z axis handles to translate the selected object.
- **Rotate Y (E)** shows only the Y-axis rotation ring, matching the canonical VR World v1 yaw-only model.
- **Scale (R)** shows X/Y/Z handles for resize; editable preview boxes preserve their original full-dimension base geometry.
- **Snap** offers Off or bounded increments (Move 0.1, 0.25, 0.5, 1 m; Rotate 5, 15, 30, 45°; Scale 0.05, 0.1, 0.25, 0.5 units). Transform commit quantizes against this selected increment.
- **Esc** cancels an active drag. OrbitControls stop moving the camera while a handle is being dragged.
- One pointer-drag generates **at most one** validated profile change at mouse release, not an uncontrolled stream of physics-world resets.
- **Undo/Redo** applies to at most 40 recent sandbox-sidecar edits; the source world file remains read-only.

## Working model

The imported source remains `pixelforge.vr-world.v1`; the editor modifies only a `pixelforge.physics-sandbox.v1` sidecar bound to the source scene's SHA-256 fingerprint.

All transforms go through `site/src/vr-gizmo-contract.js`, which checks the supported mode, numeric finiteness, snap choice, canonical VR World bounds, and eligibility for this source's physics sidecar. Rejected edits restore the last valid preview on the next renderer update. Private asset proxies are selectable but have **no physics collider, no editable gizmo**, and no imported GLB bytes.

The Three.js helper lives entirely inside the lazy-loaded PhysicsStage. Its React controller runs in paused edit mode; switching to running physics hides transform handles until the simulation is paused again. Walk test is a separate simulation mode and does not permit authoring.

The UI's physics material inspector remains active; new history handling records those edits, too. Gizmometer settings never grant an agent execution authority, change the canonical scene schema, or authorize asset redistribution.

## Test

```bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
```

The Node tests check immutable source preservation, translation snapping, yaw normalization, scale bounds, invalid input, foreign hashes, and asset-proxy exclusion. The existing Pages publication allowlist and full Studio/Runtime preflight remain in CI.

Browser acceptance checklist:

1. Open `?forge=1` → Physics → Load VR sample. Confirm the existing scene loads, its floor/pillar/portal are visible and the first eligible object shows a selection outline.
2. Select the pillar, use Move/W, drag along one axis and release; confirm the sidecar numeric position updates *once* and the source world remains unchanged.
3. Rotate/E and Scale/R; test angle and dimension snap settings, including Off. Check that only Y rotation is exposed and invalid sizes are rejected.
4. Undo and Redo two edits; export/import a sidecar and verify transforms persist and the fingerprint matches.
5. Press Esc while dragging and confirm original transform and physics state are restored, with no history entry.
6. Start/stop Walk test; verify gizmos disappear while walking, WASD controls the capsule, and imported source data is not changed.
7. While the physics simulation runs, click a scene object; confirm the preview pauses before the user edits it.
8. Import a VR World file with an asset proxy: ensure it is visual-only and cannot gain a collider or editable gizmo.
9. Verify on narrow screens and real desktop WebGL2 browsers. Validate headset performance only with separate Quest hardware tests.

## Limitations and later work

The gizmos edit sidecar previews, not authoritative VR Studio geometry. The current 3D renderer still uses boxes as visual stand-ins for authored primitives; it does not import real GLB triangle geometry or generate accurate mesh colliders. Advanced floor alignment, parenting, multi-object selection, drag handles on a headset, complex constraints, snapping to other objects, animation timelines, multiplayer and cross-engine runtime export remain future work.
