# PixelForge v6 · Rung 4: World Construction

**Status:** Opt-in Physics Lab construction preview, not an authoritative VR World v1 editor or qualified XR runtime.

## Purpose

PixelForge v6's Three.js/Rapier sandbox can now **create** its own bounded block, platform, and pillar geometry in addition to previewing canonical VR Studio world objects. The user can place these shapes directly on the *top face of an existing fixed collider*, position or resize them with the Rung 3 gizmos, simulate them with Rapier, and remove them.

No original VR Studio files or `pixelforge.vr-world.v1.local` storage are modified.

## Launch and use

1. Open `?forge=1` → **Physics**.
2. Select **Load VR sample**, **Read VR Studio save**, or **Import VR scene JSON**.
3. Use the World Construction toolbar and choose **+ Block**, **+ Platform**, or **+ Pillar**.
4. Hover over a fixed object's upper surface: a translucent ghost indicates the intended placement position, including the Move snap increment.
5. Click the upper face to place a new object. Repeated clicks place additional objects, up to 32 in this sandbox.
6. Select an object from the 3D view or the object list, use Move/Rotate Y/Scale gizmos, change material/body properties, and undo/redo changes.
7. Only objects labeled `placed-*` can be removed with the **Delete this sandbox object** button.
8. Export the physics sidecar as JSON and import that sidecar again against the **same** source VR scene.

## Contract

The existing `pixelforge.physics-sandbox.v1` format is extended with optional `placed: []`. Old Rung 2/3 sidecars without `placed` validate and normalize to an empty array.

Placed objects have a bounded set of declarative fields: a monotonically enumerated `placed-N` ID, template kind, name, color, rigid-body mode, bounded friction and restitution, position, scale, yaw. No executable scripts, model URLs, asset paths or private GLB bytes are introduced.

Placement is accepted only when all of these are true:
- The target ID resolves to an existing *fixed* non-proxy physics descriptor belonging to the canonical scene or sidecar.
- The hit point lies on the target's upper horizontal face (including yaw rotation) within a small numeric tolerance.
- The hit's normal is upward-facing; walls, side faces, moving objects and private asset proxies are rejected.
- The destination obeys the same [-100,100] coordinate bounds as VR World v1; scale uses the template's bounded dimensions.
- The optional 2D X/Z snap is one of the existing gizmo translation snap values.
- No more than 32 placed objects exist.

The Raycaster's world-space hit and normal are translated into this strictly validated transaction. A translucent box preview uses the same preset size and snap settings, but is only a visual aid: the pure contract revalidates the exact target surface at commit.

## Tests

```bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
```

New `site/scripts/vr-construction.test.mjs` tests cover source immutability, snapped placement, stacking, edits through the existing gizmo contract, removal, legacy profile imports, strict placement surface checks, rejection of dynamic colliders and private asset proxies, and the 32-object cap.

### Browser acceptance

- Load the canonical VR World sample and place a block on the floor; confirm a ghost appears while hovering and no new source scene object is written.
- Place a platform on a previously placed block; try placing into empty space, onto a wall side, or atop a moving object. Expect rejected/hidden placement.
- Select newly placed geometry; move it, rotate it and resize it using the direct viewport handles. Undo/redo and export/import the sidecar.
- Remove one placed object. The original VR floor/pillar/portal should have **no** deletion control.
- Start the walk test; ensure the placement palette is disabled and the preview avatar collides with the new fixed prefabs.
- Use a VR Studio scene containing a private asset proxy; it must never gain a mesh collider or permit placement onto itself.
- On small screens, verify the palette wraps and inspector remains usable. Verify WebGL errors, out-of-range coordinates and hit misses do not corrupt state.

## Remaining limits

The system still uses **cuboid geometry proxies**, not imported real GLB meshes or accurate concave physics shapes. No terrain painting in 3D, arbitrary tilted-surface alignment, navmesh, glTF authoring, native engine export, multiplayer or Quest 3 framerate qualification is implied. This rung is browser-only, based on validated opt-in sidecar files.
