# PixelForge v5.36 — Static GLB Geometry in VR Worlds

## What changes

The v5.35 world editor could stage a hash-bound asset record but rendered only a proxy box. **v5.36 decodes supported glTF 2.0 binary GLBs and renders their actual static triangles at the world object's placement**, without uploading or bundling marketplace assets.

There is **no new engine dependency**. The existing WebGL2 shader, scene transforms, desktop orbit camera and experimental WebXR eye view remain the render target. This is a **static geometry preview**, not permission to distribute, animate, collide with or commercially use a model.

## Supported first proof

- Operator-selected local `.glb` file, 28 bytes to 50 MB.
- GLB 2.0 JSON + embedded BIN only. No remote fetch or external buffers.
- Single embedded buffer, default or selected glTF scene, hierarchical node translation/rotation/scale or matrix.
- Static TRIANGLES primitives; `POSITION` FLOAT `VEC3`; indexed or non-indexed geometry.
- Uint8/Uint16/Uint32 triangle indices, bounded ranges and buffer views, optional strides.
- Static per-primitive `baseColorFactor`; face normals generated for basic shading.
- Maximum 150,000 preview vertices, 128 mesh primitives, 256 graph visits and eight distinct local assets per viewer session.
- Existing scene-object position, scale and yaw transform applies to the imported mesh.
- World JSON retains only governed asset ID, name, byte size and SHA-256, never source bytes.
- After browser reload, select the existing asset in the scene graph and choose **Rebind exact saved GLB**. File name, size and SHA-256 must match.

## Not supported or claimed

- External `.gltf` or remote asset URLs, mandatory glTF extensions, compressed geometry.
- Morph targets, animation, skins or runtime physics.
- Embedded textures or full PBR. Texture-bearing materials produce a warning; preview uses base color only.
- Collision, spatial audio, VR controllers, teleportation or navigation.
- VR headset performance, comfort or production GPU stability.
- License approval, approved source compatibility or publication of GLB binaries.

Imported GLB material colors replace the purple proxy while bound locally. The object's color field remains the proxy fallback color when source mesh is absent. Loaded geometry and GPU buffers remain session-memory only; JSON scene imports never trigger network fetch.

## How to run

Open `http://localhost:3690/vr-studio/` after `npm run start`, or use the deployed Pages route `/parallax-pixelforge/vr-studio/`.

1. Enter a governed `ASSET-000xxx` ID and select a simple locally exported GLB.
2. Supported mesh triangles render at the scene object's transform.
3. Use the existing inspector to move/scale/rotate the object.
4. Save/export JSON. Verify only asset reference/hash is saved, never source bytes.
5. Refresh, observe the fallback proxy, and rebind exactly the same local GLB.
6. Try a same-name different-byte GLB; SHA mismatch must reject the substitution.
7. Try invalid indices and unsupported extensions; parser must fail closed.
8. Manually inspect WebGL2 geometry and any WebXR experience separately from automated tests.

Commands: `npm run test:vr-glb`, `npm run test:vr`, and `npm test`.

The binary GLB fixture tests validate node transforms, geometry, bounds and color, and malformed-content rejection. CI cannot certify visual fidelity or a real headset.

## Next

Further rungs can qualify UV/texture support, geometric selection, simple physics colliders, VR controllers, agent proposals and PhiCade-controlled world interaction.
