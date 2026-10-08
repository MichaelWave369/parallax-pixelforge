# PixelForge v5.38 — Desktop world selection and move gizmos

## Goal

Turn VR Studio into a more direct world-authoring interface: select visible primitives or imported GLB objects **in the viewport**, and move them along visible X, Y or Z axes with optional snapping. Preserve the v5.37 renderer, local-only asset binding, versioned scene contract, operator-only authority and desktop-orbit navigation.

## Implemented

- Click a world object to select the closest ray/AABB hit; objects without loaded GLB sources use their existing proxy box.
- For hash-rebound GLB geometry, use the decoded model's bounds (not an arbitrary 1x1 cube). Selection remains **box-based**, not per-triangle or mesh-hole precise.
- Transform-handle overlay uses 3D camera projection and colors: X red, Y green, Z blue. Handle visibility depends on camera orientation and occlusion of the axis in screen space.
- Drag a handle to translate that axis; visible preview is validated via the existing `editObject` scene contract, with ±100-meter coordinate limits.
- Snap options: 0.1, 0.25, 0.5 and 1 meter, default 0.25. Inspector offers keyboard-accessible +/- nudge buttons on each axis.
- One completed drag creates **one undo entry**. Cancelled drags restore the pre-drag world; JSON export and local save continue to work unchanged.
- Click-and-drag on empty viewport space or drag on a selected object after the click threshold to orbit. Mouse wheel zooms. The overlay responds to viewport resizes.
- Existing renderer/material/texture code, WebXR session, and Pages React portal are unchanged except for an in-memory bounds accessor on the renderer.

## What is deliberately not claimed

- This is **desktop viewport editing**, not in-headset hand tracking or VR-controller editing.
- Picking uses coarse bounding-box intersections, not triangles. Overlapping objects may need selection via the scene list.
- No collision response, gravity, physics, material fidelity, network multiplayer, agent permission, asset-license approval, or immersive-headset usability certification.
- No change to the serialized `pixelforge.vr-world.v1` scene shape, no local GLB data embedded in scene saves.

## Manual review

1. In the live React PixelForge portal, enter VR Studio, click pillar/portal/floor separately, and confirm scene graph/inspector selection changes.
2. Drag red X, green Y and blue Z handles. Verify a single Undo restores the original position after each drag.
3. Set snap to 0.1, 0.5 and 1 m and verify the inspector coordinates follow the selected grid.
4. Use keyboard Tab navigation to reach the six nudge controls; confirm changes are undoable.
5. Import a supported local GLB and select it at its actual mesh bounds; refresh and confirm the unloaded proxy remains selectable.
6. Orbit with a drag away from the colored handles. Zoom and resize. Check that the overlay stays aligned to the object.
7. Export and reimport the world file; verify no new binary fields or permissions and that local GLB source remains SHA-bound.
8. Test physical VR separately; editing overlays are not a VR interaction contract.

## Tests

`npm run test:vr-viewport` verifies projection/ray consistency, nearest-hit selection, GLB extended bounds, rotated bounding boxes, gizmo handle hit-testing, snapping, and no hidden mutation of versioned scene data.

`npm test` includes this rung alongside the older runtime, Studio, v5.35 scene, v5.36 mesh, and v5.37 texture tests.
