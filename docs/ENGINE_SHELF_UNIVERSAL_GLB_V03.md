# PixelForge Engine Shelf and Universal GLB — v3

PixelForge remains an independent, local-first creator. This milestone adds a real glTF 2.0 binary export for its own bounded 3D cuboid world objects, and a research-grade registry of other engines with explicit statuses.

## Use
1. Open PixelForge VR Studio. Author or import a valid pixelforge.vr-world.v1 world.
2. Under ENGINE SHELF choose a target. Official links point to the engine's real site. Export Engine Handoff JSON produces a portable advisory manifest for planning the manual handoff. It is not an executable native engine project.
3. Export Universal GLB downloads an actual binary glTF 2.0 (.glb) of cuboids and transforms with basic PBR colors, flat normals, stable ID/kind extras and world metadata.
4. Import the GLB into your installed destination engine using its own supported glTF importer or plugin. Every engine must be tested individually. Keep the PixelForge JSON as the canonical editable source.
5. If the world contains privately imported GLB assets, the universal export FAILS by default. Explicitly approve placeholders if only a rough layout is acceptable. For an actual asset-containing Godot bundle, use the separate hash-verified private Godot ZIP route from v2.

## Currently implemented vs planned

| Engine | Real PixelForge handoff | Native/verified gameplay | Licensing note |
| --- | --- | --- | --- |
| Godot 4 | Existing .tscn and private GLB project ZIP, plus new universal GLB | Editor and Quest acceptance pending | MIT, free |
| GDevelop | Advisory manifest, generic geometry file | Native visual events adapter planned | MIT core and editor; services may have limits |
| Defold | Advisory manifest, generic geometry file | Lua/toolchain adapter planned | Free, source-available, custom Defold license |
| Bevy | Universal GLB asset candidate and advisory manifest | ECS scene adapter planned | MIT OR Apache-2.0 |
| Stride | Universal GLB asset candidate and advisory manifest | Native import test pending | MIT |
| O3DE | Universal GLB asset candidate and advisory manifest | Asset Processor adapter planned | Apache-2.0, check bundled components |
| PlayCanvas | Universal GLB asset candidate and advisory manifest | Editor import test pending | MIT runtime/editor; hosted services distinct |
| Unreal 5 | Universal GLB asset candidate and advisory manifest | Native scene adapter planned | Proprietary, royalty terms |
| Unity | Universal GLB asset candidate and advisory manifest | External glTF plugin and editor validation planned | Proprietary with Personal eligibility |
| GameMaker / GMRT | Advisory manifest only | 2D content adapter planned | Proprietary; 2027 GMRT change not all features |
| BRUTAL | Advisory manifest only | Custom C# low-level framework research | MIT-based custom attribution and logo/notice |
| Summer Engine | Godot-based advisory reuse and universal GLB candidate | Vendor-specific compatibility not tested | Verify current service terms |

GLB format means interchange candidate, not verified vendor-native integration. PixelForge's output is static polygon geometry only. The v1 viewer renders floor, block, pillar and portal primitives as boxes; therefore this exporter does not invent full 3D terrain, characters or NPCs. No asset licenses, model files, scripts, shaders, physics, collisions, navigation, persistence, sounds, game authority or lighting/fog are exported. No proprietary editor is bundled.

## Verified official upstream references (reviewed October 2026)

- Godot: https://godotengine.org/download/archive/
- GDevelop: https://github.com/4ian/GDevelop
- Defold: https://defold.com/license/
- Bevy: https://github.com/bevyengine/bevy
- Stride: https://www.stride3d.net/
- O3DE: https://o3de.org/
- PlayCanvas: https://github.com/playcanvas/engine
- Unreal: https://www.unrealengine.com/license
- Unity: https://unity.com/products
- GameMaker / GMRT: https://gamemaker.io/en/blog/gmrt-update
- BRUTAL: https://github.com/ahwootech/BRUTAL
- Summer Engine: https://summer.games/build

## Tests

`npm run test:engine-exports` checks an actual binary GLB roundtrip through PixelForge's own original GLB decoder; deterministic geometry and metadata; source immutability; fail-closed proxies; malformed inputs; 12 verified registry entries; and the prior Godot packaging tests. Full preflight continues to run by `npm test`.

## Next increments

1. Manually validate standalone GLB in Godot and PlayCanvas, record objective import receipts.
2. Add GDevelop visual-events, Defold sprite maps and GameMaker 2D conversions from dedicated 2D source structures, not this 3D scene.
3. Qualify native scene/asset adapters for Bevy, Stride, Unity and Unreal separately, per-source license and engine version.
4. Evaluate BRUTAL and Summer as optional integrations without contaminating MIT distribution or shipping proprietary binaries.
