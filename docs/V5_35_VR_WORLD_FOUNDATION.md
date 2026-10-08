# PixelForge v5.35 — VR Studio World Foundation

**Status:** desktop WebGL2 prototype + capability-gated WebXR visual proof. This is not a release-qualified headset experience or a full imported-asset 3D editor.

## Launch

From repository root:

```bash
npm run start
```

Open **http://localhost:3690/vr-studio/**. The existing Studio has a direct **VR Studio** entry link, while **External 3D Preview** remains the dedicated qualified static GLB inspection lane.

The VR Studio page is a static module workspace with no third-party runtime dependency. WebGL2 and ES modules are required; WebXR is optional and feature-detected.

## Desktop editing rung

- Three-dimensional WebGL2 shaded scene of simple cube geometry, with a seeded floor, pillar and portal marker.
- Bounded deterministic scene document `pixelforge.vr-world.v1`, maximum 128 objects.
- Add a block, floor, pillar or portal marker.
- Scene-graph selection, inspector fields (name, color, position, scale, yaw), remove, undo.
- Mouse drag orbits the editor camera; wheel zooms.
- Browser-local explicit save and JSON export/import. Each imported JSON is validated before mutation.
- Scene import never executes scripts, follows remote URLs or grants provider authority.

**World export includes JSON descriptors only.** Scene edits do not automatically save. The operator must save to local browser storage or export the JSON scene explicitly.

## Unreal/Fab asset staging, not importing

This rung can **stage** a local GLB file with an operator-entered existing `ASSET-000xxx` identifier:

1. Accept an operator-selected `.glb` file under 50 MB.
2. Check the GLB v2 container header and JSON asset version, and that mesh definitions exist.
3. Compute its SHA-256 using browser WebCrypto.
4. Bind an identity-only asset reference (`asset_id`, `source_name`, `byte_length`, `sha256`) to an **asset-proxy** scene object.
5. Render a visible purple proxy block in the world and expose the actual GLB to the separate `external-preview/` inspector workflow.

No asset binary or marketplace content is copied into the repository, localStorage scene, or exported scene JSON. A staged GLB cannot be rediscovered from the exported scene without the source file and approved local asset vault. Valid GLB structure and hashes **do not prove** source rights, material compatibility, animation, collision or headset performance. The prior Asset Passport policy remains authoritative.

### Next mesh-loading rung

Use the existing `external-preview/` renderer's bounded GLB import/qualification contracts rather than silently treating a proxy as imported geometry. Add a shared renderable interchange layer, preserve source identity and runtime claim boundaries, then make scene-local placement of qualified real GLB meshes possible.

## Experimental WebXR path

If the browser supports WebXR immersive VR, the **Enter Experimental VR** button requests a headset session via user gesture. The renderer uses the same world data and shader, with each eye's XR projection and inverse viewer transform, and returns to desktop when the session ends.

**Not qualified:** physical headset tests, sustained framerate, controller binding, grab, teleport, locomotion comfort, boundaries/guardian integration, occlusion, eye-height consistency, collision/physics, animation and networked world state. Where WebXR is not supported, the desktop editor remains usable. A GitHub Pages HTTPS site may display this UI but cannot access the user's private local Unreal asset vault or launch local Unreal.

## Authority boundary and PhiCade

This rung has no agent proposal API, no remote mutation endpoint, no untrusted executable world scripts and no PhiCade runtime import. World documents explicitly declare `OPERATOR_ONLY` authority plus `UNSUPPORTED` physics and multiplayer. Never equate registration, file import, XR session existence or an agent suggestion with permission to mutate the world. The eventual bridge should reuse PixelForge Runtime Bridge v1 / PhiCade's Agent Driver policy and only let the editor apply approved proposals.

## Verification

```bash
npm run test:vr
npm test
```

Manual review matrix:

1. Desktop Chrome/Edge with WebGL2: orbit, zoom, add, edit, delete, undo, save and reload.
2. JSON roundtrip, malformed JSON rejection and illegal-world claim rejection.
3. GLB proxy appears with the SHA-256 digest; source bytes do not appear in world export.
4. Unsupported headset/browser: no offered immersive VR button.
5. Supported headset: inspect actual stereo view, end session, verify desktop returns. **Mark hardware results separately**, not CI PASS.

**Current evidence claim:** the repository's tests can validate deterministic world data. Rendering quality and physical headset readiness need human/hardware evidence.
