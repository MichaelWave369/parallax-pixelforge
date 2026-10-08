# Parallax PixelForge

Parallax PixelForge is a local-first retro Creator OS for building, playtesting, packaging, and evolving small game worlds.

**Current integrated target:** PixelForge Studio **v5.34.0-alpha** plus the public **Runtime SDK v1** stack: Runtime Bridge, Shared Runtime Core, synchronous and asynchronous Runtime Hosts, bounded Agent Session v1, Model Policy v1, and the local Ollama provider.

The Studio and runtime layers stay deliberately separate. Creator tooling and game-specific rules remain in the Studio/game layer; controller, observation, action, transport, model-policy, and bounded-session contracts live in the reusable runtime layer.

## Current status

- Full PixelForge Studio v5.34 is integrated on `main`.
- The complete Studio + Runtime preflight runs in GitHub Actions.
- Runtime SDK tests, Studio validators, public-release validation, adaptation validation, and v5.27 Three-View Convergence validation are part of the qualification path.
- Python-backed generators use the cross-platform launcher in `scripts/run_python.mjs` and pinned dependencies in `requirements.txt`.
- Local Ollama qualification is optional and remains outside required CI.
- Human visual, pacing, combat-feel, commercial-depth, store-art, and value review remain separate from machine validation.

## v5.38 VR Studio — Click-to-select and transform gizmos

Worlds can now be edited from the 3D viewport: ray-to-bounding-box object selection, X/Y/Z move handles, configurable snapping, six accessible nudge controls and one-undo-entry drag gestures. Loaded GLB objects use their decoded bounds for coarse picking; unmatched local models remain selectable as proxies. This is **desktop scene editing**, not a qualified in-headset controller system.

See [v5.38 viewport controls and acceptance notes](docs/V5_38_VIEWPORT_GIZMOS.md). Run `npm run test:vr-viewport`.

## v5.37 VR Studio — Embedded GLB texture previews

v5.37 adds bounded browser-local **PNG/JPEG base-color textures** and FLOAT TEXCOORD_0 mapping to the real GLB world renderer. It preserves the original GLB's governed SHA-256 scene identity while uploading supported embedded images only to the browser's GPU memory. External image URLs, arbitrary material extensions, physics, animation, complete PBR/Unreal parity, and rights approval are not provided.

Run `npm run test:vr-textures`. See [the v5.37 texture acceptance and safety guide](docs/V5_37_VR_EMBEDDED_TEXTURES.md).

## v5.36 VR Studio — Native static GLB world import

VR Studio can now render **supported real static GLB triangles inside authored scenes**, with bounded geometry decoding, node transforms and basic material base colors. The original source file is never committed or embedded in scene JSON. After a refresh, use **Rebind exact saved GLB** to restore an in-memory mesh by SHA-256. Unsupported geometry fails closed.

This is **preview-only**: no texture parity, animation, physics, source-license approval, or certified VR performance. See [the v5.36 GLB World Import guide](docs/V5_36_VR_GLB_WORLD_IMPORT.md). Run `npm run test:vr-glb` for binary-import tests.

## v5.35 VR Studio — World Foundation

The experimental [VR Studio](vr-studio/) starts with a usable, local-first desktop 3D world composer. It includes a validated scene graph, primitive placement, transforms, undo, scene save/import/export, and locally hashed Unreal GLB **proxy** staging. Capability-gated WebXR can preview that geometric scene on supported headsets, but remains unqualified without physical testing.

**No claims of rendered GLB import, collisions, VR-controller interactions, headset compatibility or runtime/agent authority.** PixelForge's original external GLB renderer remains the asset inspection path. See [v5.35 VR World Foundation](docs/V5_35_VR_WORLD_FOUNDATION.md).

Open `http://localhost:3690/vr-studio/` after `npm run start`. Run `npm run test:vr` for the scene-contract tests.

## React GitHub Pages portal (proposed)

PixelForge now has a separate React/Vite public portal in [`site/`](site/) that launches the existing Studio, WebGL2 VR Studio and GLB Inspector. It is a navigational **React application**, not yet a React rewrite of the legacy Studio editor.

Once [GitHub Pages is enabled with GitHub Actions](docs/REACT_GITHUB_PAGES.md) and the deploy workflow passes on `main`, the planned link is **https://michaelwave369.github.io/parallax-pixelforge/**. PRs validate the site but do not publish it.

`npm --prefix site install --no-audit --no-fund && npm --prefix site test && npm --prefix site run build`

See [React GitHub Pages deployment, safety and route guide](docs/REACT_GITHUB_PAGES.md).

## Quick start

Prerequisites:

- Node.js 24
- Python 3.14
- a modern browser

Clone and prepare:

```bash
git clone https://github.com/MichaelWave369/parallax-pixelforge.git
cd parallax-pixelforge
python -m pip install -r requirements.txt
```

On Windows, `py -3 -m pip install -r requirements.txt` is also fine.

Start the Studio:

```bash
npm run start
```

Then open:

```text
http://localhost:3690
```

## Qualification

Run the normal merged test suite:

```bash
npm test
```

Run the full Studio + Runtime release preflight:

```bash
npm run github:preflight
```

Run the current v5.31 gate directly:

```bash
npm run validate:v5.31
```

Optional local Ollama qualification:

```bash
npm run qualify:ollama
```

## Agent-native Runtime SDK v1

```text
Controller / Policy / Model
        ↓
Agent Session v1
        ↓
RuntimeHostV1 or AsyncRuntimeHostV1
        ↓
Runtime Bridge v1
        ↓
game-specific runtime
```

Public runtime pieces:

- `runtime/sdk-v1.js` — public Runtime SDK entry point.
- `runtime/core-v1.js` — shared descriptors and wire-safe envelopes.
- `runtime/bridge-v1.js` — small engine-facing bridge contract.
- `runtime/conformance-v1.js` — reusable conformance assertions.
- `runtime/host-v1.js` — synchronous in-process host.
- `runtime/async-host-v1.js` — Promise-capable host for transported/external runtimes.
- `runtime/agent-session-v1.js` — bounded multi-turn agent-session runner.
- `runtime/model-policy-v1.js` — provider-neutral model policy client.
- `runtime/providers/ollama-v1.js` — local Ollama provider adapter.
- `runtime/reference-counter.js` — deterministic reference runtime.

Core invariants:

- controller registration does **not** imply authority,
- model/provider calls stay outside deterministic game simulation,
- malformed model output fails closed before gameplay mutation,
- total intent budgets are enforced before submission,
- replay does not rerun the provider,
- game-specific combat, physics, rendering, rooms, shops, and authority remain game-owned.

Runtime design docs live under `docs/`, including the Runtime Bridge, Shared Core, Host, Async Host, Agent Session, Model Policy, and Ollama provider specifications.

## v5.34 SPARK External Runtime Bridge

v5.34 connects PixelForge to the canonical **SPARK: The Substrate v0.17.0** source tree without copying SPARK gameplay logic.

- pins SPARK revision `fae7879820bef63a550fea486b2defbc3cee5304`,
- dynamically loads SPARK's own Threshold bridge adapter,
- wraps it with PixelForge `createBridgeV1()`,
- serves it over the existing Runtime Bridge JSONL Transport v1,
- qualifies the real Threshold spawn at `(480, 390)` with starter Bark Ward health `112`,
- submits MOVE RIGHT through the external bridge and requires `SPARK_PLAYER_MOVED`,
- captures the returned semantic event, authority view and SHA-256 runtime hash,
- writes a cross-repository qualification receipt.

Run the local cross-repo proof with:

~~~bash
npm run qualify:spark -- --spark-root /path/to/SparkTheSubstrate
~~~

See `docs/V5_34_SPARK_EXTERNAL_RUNTIME_BRIDGE.md`.

## v5.33 First Real Cartridge Bridge

v5.33 moves the external runtime seam from the deterministic counter into an actual PixelForge cartridge artifact.

- bridges The Legend of More Bounce through its real Bouncehome Grove runtime-scene packet,
- uses the scene's real collision layer and player spawn,
- exposes deterministic MOVE intents through Runtime Bridge v1,
- emits PLAYER_MOVED, MOVE_BLOCKED, and ACTION_REJECTED semantic events,
- reuses the exact v5.32 JSONL transport without introducing a second protocol,
- provides a cartridge runtime server for external governed hosts such as PhiCade.

Run it with:

~~~bash
npm run runtime:serve:cartridge -- --cartridge the-legend-of-more-bounce
~~~

See `docs/V5_33_FIRST_CARTRIDGE_BRIDGE.md`.

## v5.32 Runtime Bridge JSONL Transport

v5.32 gives the public Runtime Bridge v1 a bounded local process transport intended for external governed hosts such as PhiCade.

- newline-delimited JSON request/response schemas,
- strict allow-list of the existing Runtime Bridge v1 methods,
- ordered request processing,
- bounded transport/bridge errors without remote eval or shell access,
- deterministic reference-counter stdio server,
- runtime SDK/package export and conformance tests,
- controller registration remains separate from game authority.

Run the reference bridge with:

```bash
npm run runtime:serve:reference
```

See `docs/RUNTIME_JSONL_TRANSPORT_V1.md`.

## v5.31 Native WebGL2 GLB Preview

v5.31 renders supported qualified GLB assets directly in PixelForge with a zero-dependency WebGL2 viewer.

- drag/drop, file picker, or same-origin local-vault URL loading,
- multiple mesh nodes and TRIANGLES primitives,
- indexed/non-indexed geometry and node TRS/matrix transforms,
- optional normals/UVs, base-color factors, and embedded base-color textures,
- orbit/zoom/reset controls plus automatic bounds framing,
- explicit static-preview warnings for animation, skinning, embedded cameras, extensions, and simplified PBR,
- downloadable preview receipts ending at **PREVIEW_RENDERED_VISUAL_REVIEW_PENDING**.

Open `http://localhost:3690/external-preview/` after `npm run start`.

See `docs/V5_31_NATIVE_WEBGL2_GLB_PREVIEW.md`.

## v5.30 Unreal Discovery + GLB Structural Qualification

v5.30 removes the blind Unreal object-path hunt and adds a dependency-free structural gate for exported GLB files.

- asks Unreal to scan `/Game` and return ranked candidate object paths for a governed asset record,
- records candidate asset classes without selecting or exporting one automatically,
- parses GLB/glTF 2.0 containers directly in Node without a third-party parser,
- verifies header/version/length/chunks plus scene, mesh, material, texture, animation, skin and extension structure,
- combines v5.29 byte/hash verification with GLB parsing,
- stops at **INTERCHANGE_STRUCTURAL_PASS_RUNTIME_IMPORT_PENDING** instead of claiming rendering or compatibility success.

The intended first physical proof remains **ASSET-000021 — Stylized Fantasy Environment**. See `docs/V5_30_UNREAL_DISCOVERY_GLB_QUALIFICATION.md`.

## v5.29 Unreal Export Executor

v5.29 turns the governed External Asset Forge plan into a local executable Unreal bridge.

- upgrades a v1 draft job into a bound local-only v2 job using a real `.uproject` and Unreal asset path,
- launches `UnrealEditor-Cmd` through the existing cross-platform Python launcher,
- runs a tiny Unreal-side Python executor using the GLTF Exporter plugin,
- writes GLB/glTF plus byte count, SHA-256, engine version, warnings/errors, and an execution receipt,
- verifies the returned file outside Unreal before PixelForge accepts the export as intact,
- stops at **EXPORT_VERIFIED_IMPORT_PENDING** rather than falsely granting compatibility PASS.

The first intended governed proof target remains **ASSET-000021 — Stylized Fantasy Environment**. See `docs/V5_29_UNREAL_EXPORT_EXECUTOR.md`.

## v5.28 External Asset Forge

v5.28 adds a governed bridge from local external asset libraries into PixelForge without committing purchased marketplace source files to the public repository.

- imports governed metadata while preserving stable `ASSET-000xxx` identities,
- routes assets through **PORTABLE**, **BAKEABLE**, or **REIMPLEMENT** lanes,
- emits rights-aware Asset Passports without changing source compatibility verdicts,
- creates operator-bound Unreal export-job manifests for eligible assets,
- keeps `local-assets/` and generated external registries outside Git,
- rejects the fiction that routing or export automatically means compatibility approval.

With the current UE Agent Office arsenal, the 263 governed records classify as **209 PORTABLE / 11 BAKEABLE / 43 REIMPLEMENT**; all remain unqualified until their source governance says otherwise.

See `docs/V5_28_EXTERNAL_ASSET_FORGE.md`.

## PixelForge Studio v5.27

The current Studio includes:

- Sprite Studio
- Tile Studio + Map Composer
- Runtime Composer
- Asset Forge
- community cartridge review/shelf tooling
- 369 PocketGames packaging and release evidence
- local-first validation and receipt workflows
- The Legend of More Bounce content through Chapter Five / Three-View Convergence

### Three-View Convergence

v5.27 adds the Mirrorfall chapter:

- **Mirrorfall Basin** — top-down prism alignment.
- **Splitlight Causeway** — side-view pulse progression.
- **Triune Observatory** — first-person shutter sequence.
- **The Blind Angle** — ordered three-phase cross-view boss.
- Save migration accepts v5.24, v5.25, and v5.26 state.
- The travel network expands to six earned landmarks.

Useful commands:

```bash
npm run legend:convergence:generate
npm run legend:convergence:preview
npm run legend:convergence:audit
npm run legend:convergence:test
npm run legend:convergence:check
```

## Retained Legend milestones

The root README keeps a compact retention index for the current forward version. Detailed milestone docs and historical receipts live under `docs/`.

### v5.19 Legend Audio Pass

Original local PCM16 scene music and gameplay SFX, deterministic generation, jukebox/playtest previews, machine audio audit, and human Gold-review boundary.

### v5.20 Legend Adventure Expansion

Old Tempo, Grove Key, Echo Hollow, Flatlings, Echo Shards, Beat Shrine progression, Rhythm Crest, and the larger gated adventure loop.

### v5.21 Legend Boss + Combat Pass

The Flat Note rhythm boss, four-heart combat loop, Resonance Seal progression, original boss art/audio, and deterministic combat audit.

### v5.22 Eastern Road / Chapter Two

Eastwind Road, Mira Reed, Glassgrass Pass, Static Sprites, Echo Boots, Signal Mill, relay progression, and Eastern Beacon Lens.

### v5.23 The Iron Orchard

Rivet Row, Tessa Coil, Bram Gearroot, Rustroot Cavern, Resonance Bracer combat, Rustlings, and the Rustbloom Warden chapter boss.

### v5.24 Save / Inventory / Equipment

Three manual local save slots plus autosave, safe checkpoint resume, portable save import/export, inventory/equipment journal, quest logs, discovered locations, and boss records.

### v5.25 World Map / Fast Travel / Checkpoint Shrines

Progression-bound world-map landmarks, earned fast travel, additive save migration, and no bypass of puzzles, bosses, items, or quest gates.

### v5.26 Stormglass Coast

Stormglass Coast, Sable Current, Tideglass Shells, Gale Mantle traversal, Tide Engine puzzle, Undertow Bell boss, Stormglass Compass, and save/travel expansion.

### v5.27 Three-View Convergence

Mirrorfall Basin, Splitlight Causeway, Triune Observatory, The Blind Angle, cross-view causal progression, save schema v4 migration, and six earned travel landmarks.

## Bundled games

### Journey to the Parallax Pyramid

A local-first React/Vite adventure and learning cartridge.

```bash
cd games/journey-to-parallax-pyramid
npm install
npm run dev
```

### The Legend of More Bounce

PixelForge's larger SNES-first showcase cartridge, used to prove authoring, runtime, save, travel, combat, asset, audio, and cross-view workflows.

See:

```text
games/the-legend-of-more-bounce/
```

## Create a cartridge

Generate a starter cartridge:

```bash
npm run new:cartridge -- "My Tiny Game"
```

Then:

```bash
cd games/my-tiny-game
npm install
npm run dev
```

Useful creator checks:

```bash
npm run check:mobile -- games/my-tiny-game
npm run asset:check -- games/my-tiny-game
```

Start with the smallest complete loop:

```text
1 room + 1 mechanic + 1 feeling + 1 ending
```

## Repository map

```text
.github/               issue templates and CI
assets/                shared Studio asset packs and profiles
community/             local cartridge shelf and community evidence
data/                  Studio/demo project data
docs/                  architecture, workflows, release docs, history
  build-receipts/      historical Studio build receipts
  release-evidence/    review cards, audits, and release manifests
exports/               generated previews, QA evidence, packages, receipts
games/                 starter template and bundled cartridges
pocketgames/           369 PocketGames manifests and production lane
porch_sources/         reference/source material only; not production-network-qualified
runtime/               reusable Runtime SDK v1
scripts/               Node tooling, validators, builders, qualification scripts
tests/                 Runtime SDK and Studio tests
tools/                 Python content generators
```

Root files are intentionally limited to the Studio entrypoint/assets, package metadata, schema, legal/community files, and project-level configuration.

## Evidence and release boundaries

Machine validation can prove things such as schema validity, hashes, deterministic contracts, asset bindings, migrations, and reproducible package structure. It does not automatically grant subjective approval.

The following remain explicit human gates where relevant:

- visual quality,
- control feel,
- combat fairness,
- pacing,
- narrative clarity,
- commercial depth,
- store art,
- production publishing,
- $3.69 value/worthiness.

`porch_sources/` is included as reference/source material only. Review and test it before production or public-network use.

## History and evidence

- `CHANGELOG.md` — version history.
- `docs/PUBLIC_ROADMAP.md` — public roadmap and completed runtime milestones.
- `docs/build-receipts/` — historical build receipts.
- `docs/release-evidence/` — review cards, audits, and release manifests.
- `exports/` — generated qualification artifacts and previews.

## 369 PocketGames promise

A 369 PocketGame should be small but complete, paid once, playable offline, and free of ads, subscriptions, loot boxes, energy timers, and predatory in-app purchases.

The signature target price is **$3.69** for polished premium micro-games.

## License and content rights

PixelForge engine/source code is MIT licensed. Demo game content, names, characters, story text, art, audio, logos, brand assets, and final commercial cartridge material may have additional rights boundaries.

Read:

- `LICENSE`
- `LICENSE-CONTENT-NOTICE.md`
- `docs/LICENSING_AND_RIGHTS.md`
- each cartridge's `RIGHTS.md`

Contributors should only add material they created, own, or have permission to use.

## Contributing

Start with `CONTRIBUTING.md`, `docs/MAKE_YOUR_FIRST_CARTRIDGE.md`, and `docs/CARTRIDGE_SUBMISSION_RULES.md`.

Before opening a pull request:

```bash
npm run github:preflight
```
