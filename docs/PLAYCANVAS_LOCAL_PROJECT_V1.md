# PixelForge PlayCanvas Engine Local Project Bridge v1

**Scope:** A generated, editable standalone JavaScript project containing an actual glTF 2.0 GLB file exported from PixelForge's canonical VR world, a PlayCanvas Engine camera and lighting preview, and local npm/Vite development scripts.

## How to use

1. Open PixelForge VR Studio and create a world from its supported floor/block/pillar/portal cuboid primitives.
2. Select **Export PlayCanvas Project ZIP** under Engine Shelf. The existing universal GLB exporter provides the actual triangle meshes, right-handed Y-up transforms, simple colors, source object IDs and names.
3. If the world references privately imported GLBs, PixelForge requests explicit approval to export **cuboid placeholders only**. No original purchased models or bytes are exported.
4. Extract the ZIP into a new local project directory. Ensure Node.js 22+ is installed.
5. Run `npm install` once to obtain PlayCanvas Engine and Vite. This first step may need network access unless dependencies were previously cached.
6. Run `npm run dev` and visit the localhost URL printed by Vite. Drag the canvas to orbit, scroll to zoom, or click Reset camera. Use `npm run build` for a static build.

## Files and security

- `public/world.glb`: real standalone GLB containing **only PixelForge-authored cuboid geometry**. Actual local third-party asset bytes are never bundled.
- `src/main.js`: inspectable PlayCanvas Engine ESM code using `AppBase`, explicit component/resource handlers, local GLB container loading, and a read-only orbit camera.
- `package.json`: npm/Vite development/build scripts and PlayCanvas dependency. The app is not automatically installed, run or uploaded by PixelForge.
- `index.html`, `vite.config.js`: local-first viewer entry and relative output paths for static hosting.
- `manifest.json`: source object count, explicit limitation/qualification status and placeholder count.
- `README.md`: local start instructions, engine attribution and known limits.

The ZIP is generated in browser memory via PixelForge's existing bounded STORE-only archive writer, with deterministic file ordering. No server upload, remote code execution, account credential, auto-publishing or cloud Editor login.

## What this proves

CI validates the ZIP archive's exact listed files, a real GLB decoded by PixelForge's existing independent parser, deterministic output, Vite entry point and generated JS syntax, stable source scene immutability, and failure on unauthorized proxy conversion.

## What this DOES NOT prove

- No actual PlayCanvas Engine version compatibility is established until someone installs dependencies and runs the generated viewer.
- No WebXR/Quest 3 acceptance is claimed; no XR controls are generated.
- No collisions, player controller, NPCs, AI, quest scripting, animation, lighting/fog parity, terrain generation, save/load or engine-native behavior transfer.
- A source object name may remain as harmless glTF metadata, but its external model file and mesh data are NOT included.
- No redistribution grant for asset libraries, no automatic rights clearance, no royalty or subscription obligations imposed by this export.

## Upstream references

- https://developer.playcanvas.com/user-manual/engine/standalone/
- https://developer.playcanvas.com/user-manual/assets/loading-unloading/
- https://github.com/playcanvas/engine

## Next

Manually run the PlayCanvas zip project in a modern desktop browser and capture screenshot/import/performance evidence. If that passes, explore controlled WebXR entry as a separate feature with real Quest hardware acceptance. Continue separate GDevelop 2D event-system research, Stride native import, and Bevy ECS adapter, each with its own testable scope.
