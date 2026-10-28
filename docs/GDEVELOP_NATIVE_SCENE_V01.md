# PixelForge GDevelop Native Scene Adapter v1

**Status:** Native GDevelop 5 project JSON generated and validated structurally in CI; actual GDevelop Editor import remains UNTESTED.

## What PixelForge exports

Under ENGINE SHELF select **Export GDevelop Native Project ZIP**. The ZIP includes:

- `game.json`: editable GDevelop 5 `PixelForgeWorld` scene with one native `Scene3D::Cube3DObject` and scene instance per PixelForge authored object.
- `assets/neutral-white.png`: an original one-pixel RGBA PNG used by all six cuboid faces, tinted per object with its PixelForge hex RGB color.
- `pixelforge-manifest.json`: canonical source IDs, labels, object kinds, source colors and explicit placeholder-only flags.
- `README.md`: open/import instructions, coordinate mapping, limitations.

The source scene is NEVER changed. Objects can be moved, resized, edited and given no-code behaviors/events inside GDevelop after a successful editor import. The starting visual event sheet is deliberately empty.

## Coordinate mapping

PixelForge positions are XYZ with **Y vertical**, while GDevelop 3D uses **Z vertical**. This v1 conversion maps:

`GDevelop X = 640 + 100*PF X`, `GDevelop Y = 360 - 100*PF Z`, `GDevelop Z = 100*PF Y`.

These center coordinates are adjusted by half the corresponding box dimension to fit the native object's instance origin. Cube dimensions are `[width = PF X scale, height = PF Z scale, depth = PF Y scale] * 100`. Source yaw is transferred to GDevelop `angle` in degrees. Native pivots and camera framing have NOT been visually qualified; the mapping is provisional for editor acceptance.

All four PixelForge primitive types are cuboids in the current WebGL2 source renderer. This exporter intentionally preserves cuboids rather than inventing shapes it has never seen.

## Security and rights

The exporter never bundles private GLB mesh files, purchased textures, extensions, scripts, executable assets or cloud credentials. Scenes containing asset proxies FAIL CLOSED by default. Only explicit user consent permits a **cube placeholder**, and the manifest identifies that placeholder. The only asset in the ZIP is PixelForge's original, shared neutral image.

No GDevelop binaries, cloud account, behaviors or event-system instructions are downloaded or bundled. The operator remains responsible for assets and later publishing rights.

## What works / what is pending

- Generates deterministic ZIP and GDevelop JSON using the native `Scene3D::Cube3DObject` and `instances` structures observed in the official GDevelop example.
- CI checks object counts, unique identifiers, transforms, color/tint, actual PNG bytes, manifest identity, source immutability, and private asset safety.
- **Pending:** open `game.json` in the actual GDevelop desktop editor; inspect scene rendering, cube positions, pivot rotation, color, preview, and event-sheet editing.
- **Not included:** generated 2D gameplay, no-code events, player controller, collisions, physics, interactions, NPCs, terrain, actual VR, or original GLB mesh imports.

## Reference

Official GDevelop structural fixture: https://github.com/GDevelopApp/GDevelop-examples/blob/main/examples/3d-light-playground/3d-light-playground.json

Editor: https://gdevelop.io/

## Next

1. Manually import the ZIP into GDevelop and compare it against the PixelForge source scene.
2. Qualify a separate 2D overhead projection mode with actual native sprite assets and collision policy.
3. Add visual events through a documented action/condition schema only after extracting an official conforming example. Do not fabricate GDevelop event identifiers.
