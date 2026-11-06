# PixelForge v6 Rung 2 — The Living World (VR World physics sandbox)

Rung 2 joins two existing, deliberately separate worlds:
- The **canonical PixelForge VR Studio v1** scene, with format `pixelforge.vr-world.v1` and `runtime.physics = "UNSUPPORTED"`.
- The opt-in **PixelForge v6 / Three.js / Rapier** Physics Lab, which can simulate *cuboid approximations* of the VR scene's authored objects.

## What is implemented

Open `?forge=1` → **Physics**. The Living World controls can:
1. **Load VR sample**: bring the actual `vr-studio/world.js` `newWorld()` seed into the Rapier sandbox.
2. **Read VR Studio save**: read (never overwrite) `pixelforge.vr-world.v1.local` from the same browser origin.
3. **Import VR scene JSON**: validate the existing schema with canonical `parseWorld`, including object limits, identities, bounds, and unqualified-runtime safeguards.
4. Click an authored 3D object or pick it from the list, assign fixed/dynamic/no collider, adjust friction and restitution, and change its sandbox position, scale and yaw.
5. Drop more rigid bodies and observe their collision behavior. Optional **Walk test** uses a Rapier capsule and WASD/arrow keys for basic movement; it is **not** a production character controller.
6. Export/import a `pixelforge.physics-sandbox.v1` sidecar that contains bounded collider profiles and a SHA-256 fingerprint of the **exact** source scene JSON.

### Preservation rules

- **Never** change `vr-studio/world.js`, `pixelforge.vr-world.v1` format, VR Studio localStorage state, or the v5 runtime capability claims.
- Keep scene-to-physics translation in `site/src/vr-physics-bridge.js`, which imports the canonical validator. Reject unknown formats, invalid transforms/modes, stale sidecars, mismatched source SHA-256 and unapproved fields.
- Source objects with `kind: "asset-proxy"` are **visual placeholders only**. They have **no physics collider** because the actual private GLB bytes, licensing and real geometry are not available to the public Pages app.
- Imported meshes are **not** rendered as actual GLBs. Supported VR Scene primitives and proxy markers are approximated by boxes of their authored scale/position/yaw, with optional box colliders.
- All profile changes live in React memory until explicit sidecar export. Importing or simulating a scene never edits its original JSON or grants runtime privileges.
- Existing v6 2D demonstration map remains separate. The physics sidecar is not exported into a cartridge or native engine project.

## Verification

```bash
npm --prefix site install --no-audit --no-fund
npm --prefix site test
npm --prefix site run build
```

New Node tests in `site/scripts/vr-physics-bridge.test.mjs` verify canonical compatibility, source preservation, profile editing, source hash binding, bounded transforms, invalid capabilities, duplicate IDs and asset-proxy exclusion.

**Human browser checks:**
- Load the canonical sample and confirm floor, pillar and portal placeholders appear.
- Make the pillar dynamic, reset, and observe it fall and collide with the floor.
- Change the pillar's position and scale, verify preview changes, export a sidecar and import it again.
- Export a different source scene from VR Studio, import it here, and confirm the previous sidecar is rejected by source hash.
- Try a saved VR Studio world from the same origin; verify no write to the original storage key.
- Use Walk test with WASD/arrow keys; check collisions on solid blocks, camera motion and that disabling walk restores the scene.
- Ensure private GLB model data and Unreal asset bytes never enter the built public bundle.
- Benchmark in desktop and Quest hardware separately; **no** headset qualification or performance claim exists yet.

## Known next steps

The editor currently provides numeric transform staging and click-to-select, *not* interactive drag gizmos. The walk capsule has basic physics, not production locomotion, jumping, navmesh, slope/step handling or XR comfort. Future rungs should add an authored collision overlay/gizmo tool, better controllers, deterministic replay and a verified scene/cartridge export path while preserving original runtime authority.
