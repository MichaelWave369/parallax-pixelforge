# Parallax PixelForge

Parallax PixelForge is a local-first retro Creator OS for building, playtesting, packaging, and evolving small game worlds.

**Current integrated target:** PixelForge Studio **v5.30.0-alpha** plus the public **Runtime SDK v1** stack: Runtime Bridge, Shared Runtime Core, synchronous and asynchronous Runtime Hosts, bounded Agent Session v1, Model Policy v1, and the local Ollama provider.

The Studio and runtime layers stay deliberately separate. Creator tooling and game-specific rules remain in the Studio/game layer; controller, observation, action, transport, model-policy, and bounded-session contracts live in the reusable runtime layer.

## Current status

- Full PixelForge Studio v5.30 is integrated on `main`.
- The complete Studio + Runtime preflight runs in GitHub Actions.
- Runtime SDK tests, Studio validators, public-release validation, adaptation validation, and v5.27 Three-View Convergence validation are part of the qualification path.
- Python-backed generators use the cross-platform launcher in `scripts/run_python.mjs` and pinned dependencies in `requirements.txt`.
- Local Ollama qualification is optional and remains outside required CI.
- Human visual, pacing, combat-feel, commercial-depth, store-art, and value review remain separate from machine validation.

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

Run the current v5.30 gate directly:

```bash
npm run validate:v5.30
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
