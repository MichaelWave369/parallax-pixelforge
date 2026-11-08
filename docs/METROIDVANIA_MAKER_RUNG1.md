# PixelForge Metroidvania Maker — Rung 1: World Atlas & Ability Gates

Status: **experimental editor with deterministic, data-only progression analysis**. This is a PixelForge creator mode, not a separate game engine or a Symphony of the Night remake.

## User goal

Create a connected, explorable action-platformer world once, prove that its route and progression are coherent, then attach existing PixelForge 2.5D/3D scenes and optionally export parts of that world into external runtimes.

**First original demonstration:** *The Ashen Belfry* — a cathedral, crypt, bell tower, moon library and sanctum. Names, world graph and gameplay premise are original placeholders. Do not redistribute Konami game assets, characters, art or music.

## What shipped in Rung 1

- New React portal card: **Metroidvania Maker**, at `?metroidvania=1`.
- An interactive room atlas that draws links between connected rooms, selects rooms, and distinguishes locked and reachable nodes.
- Named traversal abilities; choose which ability a room grants.
- Directed or two-way passages with optional required traversal abilities.
- Add rooms, connections and abilities, remove links/rooms, select the start room, edit world title.
- A fixed-point progression analyzer that starts with no abilities, discovers rooms, acquires room grants and expands reachable passages until no new locations unlock.
- A stage-by-stage progression preview showing the player-accessible subset and final unreachable rooms.
- Import/export of `pixelforge.metroidvania-world.v1` JSON. Browser-only. No server, dynamic plugins or remote asset access.
- Node regression tests for locked cycles, one-way travel, invalid gate IDs, unknown fields, size limits and nonmutation.

## Design boundaries

`pixelforge.metroidvania-world.v1` is an **atlas planning document**, not a replacement for:
- `pixelforge.layer-atlas.v1` (2.5D rooms, portals, relics, bosses, quests and playtest)
- `pixelforge.vr-world.v1` (desktop 3D scene authoring and experimental WebXR preview)
- `pixelforge.playable-world.v1` (Three.js/Rapier exploration and offline publishing)

Rung 1 stores at most 32 rooms, 96 passages and 16 abilities. Each room has a stable ID, display name, bounded 0–100 map coordinates and a list of abilities granted on entry. Each link specifies source, destination, required abilities and whether reverse traversal is allowed. No executable actions, URLs, game scripts, account authority, plugin code, proprietary asset data or music are part of the contract.

Atlas coordinates are **2D planning coordinates**, not Unreal transform coordinates. They deliberately must not be interpreted as physical room geometry.

The analyzer proves **logical eventual reachability under its assumptions only**: room entry reliably grants abilities; gates require all listed abilities; acquired abilities persist; rooms do not consume keys. It does not prove physical jumps are possible, a player can avoid death, complex quest requirements, collision correctness, controller comfort or that every one-way route has a safe return.

Browser-local import is bounded and validated. Export creates a portable plan, **not an executable cartridge or playable game**. Imported text is rendered by React, not evaluated.

## Planned pipeline: do not claim adapters are finished

```text
Metroidvania Maker graph (world design, room IDs, progression contract)
                   |
                   +--> Layer Studio / Room Atlas adapter (R2)
                   |       -> 2.5D playable room geometry, ability gates,
                   |          persistent moveset, combat and boss sessions
                   |
                   +--> PixelForge 3D scene adapter (R3+)
                   |       -> separated room scenes, colliders, event states
                   |
                   +--> Unreal 5 scene adapter (R4+)
                   |       -> cooked UE world assets and authored C++/Blueprint
                   |          runtime code; actual Unreal Editor qualification
                   |
                   +--> PCVR/OpenXR adapter (R5+)
                           -> independently tested locomotion, comfort,
                              physics-based weapon input, Quest 3 performance
```

**Shared semantic world** means the same room identities, connections, ability grants and gating rules. It does *not* mean that the same 2D movement/physics logic, geometry, cameras or animations are automatically interchangeable between classic, Unreal and VR gameplay.

External Unreal/Fab/Leartes assets remain in the private local library and require source-specific usage rights. The current Universal GLB handoff and Unreal-to-GLB exporter are not a scene/gameplay exporter from PixelForge into UE5. Plan Unreal integration as a dedicated new adapter with tested asset and behavior parity; do not imply this has shipped.

## Next rungs

1. **R2 – Playable 2.5D proof**: map 1–3 graph rooms to existing Layer Studio scenes and establish strict room-ID mapping. Implement one real traversal ability, a gated jump, a backtrack shortcut, a whip-like *original* weapon and one enemy. Verify the avatar cannot open the gate early.
2. **R3 – Room assembly & asset provenance**: link governed private static GLB assets to 3D room manifests. Qualify collision, lighting, doorway matching and privacy; keep editor data separate from runtime build data.
3. **R4 – UE5 pilot**: import a single original cathedral hallway to a real Unreal project. Build a tested character controller and animation/weapon loop; attach import receipts rather than claiming automated game parity.
4. **R5 – PCVR proof**: separately author a VR pawn/controller and comfort-tested interactions, share stable room state/asset mapping with the 2.5D project, benchmark on an actual Quest 3 via PCVR before discussing standalone deployment.
5. **R6 – Game POC**: release an original, legally distributable gothic action-adventure vertical slice, *The Ashen Belfry*, first in classic 2.5D, then optional UE/VR builds when independently qualified.

Each rung ships tests and manually verified acceptance evidence **before** advancing; never silently overwrite existing PixelForge saves or publish private asset catalog/bytes.

## Run and verify

From the repository root:

```bash
npm --prefix site install --no-audit --no-fund
npm --prefix site test
npm --prefix site run build
```

Serve the React Pages build locally (`npm --prefix site run dev`) and open `?metroidvania=1`. In the sample, the crypt grants Shadow Dash, the bell tower grants Wall Climb, the library grants Mist Form, and the sanctum becomes reachable last. Remove the crypt grant and confirm the progression analysis flags unreachable rooms. Import a modified JSON with an unknown ability requirement and confirm it is rejected without changing the current world.

**Qualification still needed:** manual Chromium visual acceptance, keyboard/touch usability, imported-file handling, and performance on physical devices. Automated unit tests do not certify the interactive editor's visual behavior.
