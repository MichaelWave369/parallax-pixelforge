# PixelForge Engine Adapters v1 — Godot-first, evidence-first

PixelForge's current source-of-truth for 3D layout is the **pixelforge.vr-world.v1** JSON file.
This first engine adapter is a *bounded* one-way conversion from that existing schema to a
Godot 4 **text scene** (.tscn), not a new engine runtime and not a claim of game parity.

## Use it

1. Open PixelForge VR Studio and compose a scene with floor/block/pillar/portal objects.
2. Under **WORLD FILE**, select **Export Godot 4 (.tscn)**. Nothing is uploaded.
3. Open a Godot 4.x project, copy the downloaded .tscn into that project, and open it in
   the Godot editor. It is a static scene with individual MeshInstance3D nodes, materials
   and original transform/name/id metadata. An existing Godot project is required.
4. For locally loaded GLBs (asset-proxy), **the actual purchased asset bytes are NOT
   inside VR World JSON or this export**. The default export refuses to proceed. You can
   explicitly approve exporting *labeled placeholder boxes* for layout-only work.
5. Retain the PixelForge JSON as canonical, export it separately for backup.

The code is in vr-studio/engine-export.js and works offline; no Godot binary is launched
by the browser and no scripts or code are generated for Godot execution.

## Qualification boundary

| Feature | Godot adapter v1 |
|---|---|
| Existing scene validation | Passes canonical PixelForge validator |
| Cuboid scene geometry | Emits one native BoxMesh per object (PixelForge renders all four primitive kinds as cubes) |
| Positions, Y rotations, scales | Converted to Godot Vector3 fields with six-decimal rounding |
| Hex presentation colors | Approximate StandardMaterial3D albedo |
| Stable IDs, source object names and kinds | Stored in explicit metadata |
| Locally bound GLB mesh bytes | Not exported; explicit placeholders only |
| Lighting / fog | Not translated |
| Physics, navmesh, world AI, gameplay | Not translated |
| Quest 3 / OpenXR performance | NOT TESTED |
| Godot editor/import/physical runtime validation | PENDING: no Godot editor invoked by the static export |

No automatic conversion from unrelated PixelForge cartridges or runtime SDK games is
implied. No purchased assets, game binaries, account credentials, agents, or privileged
commands are bundled. Textual source scene export does not establish rights clearance.

## Multi-engine target registry

The machine-readable ENGINE_TARGETS array distinguishes:

- Godot 4: STATIC_SCENE_EXPORT (the actual implemented adapter).
- Unreal Engine 5: PLANNED_SCENE_ADAPTER. PixelForge already has a separate governed
  Unreal-to-GLB exporter, which is NOT a reverse PixelForge-world-to-Unreal scene importer.
- Unity: PLANNED_SCENE_ADAPTER, likely begin with verified glTF assets and a separately
  authored Unity scene importer.
- Bevy: PLANNED_SCENE_ADAPTER; verify actual scene/mesh representation before promising
  generated Rust/ECS gameplay.

Only Godot is selectable for native static scene export in v1. The existing PixelForge
browser/WebXR preview remains its own independent renderer.

## Acceptance and next development rung

CI: npm run test:engine-exports (also included under test:vr and therefore npm test).
These validate deterministic text emission, object count, transform conversion, safe
string quoting, source immutability, fail-closed proxy handling, and no false capability claims.

Separate human gate: install Godot 4.x, create an empty project, open exported .tscn, inspect
each object's transform and material; report any parser/import errors; compare the layout
against PixelForge's original preview. Do not mark runtime compatibility PASS until done.

Next: import known-rights GLB bytes through an opt-in local-only, hash-verified export pack
and verify the Godot import with the real editor. Later: multi-engine world semantics,
settlement systems, AI, quests, and controlled gameplay adapters.
