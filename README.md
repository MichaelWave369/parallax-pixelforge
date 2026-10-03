# Parallax PixelForge

Parallax PixelForge is a local-first retro Creator OS for building, playtesting, packaging, and evolving small game worlds.

**Current integrated target:** PixelForge Studio **v5.27.0-alpha** plus the public **Runtime SDK v1** stack: Runtime Bridge, Shared Runtime Core, synchronous and asynchronous Runtime Hosts, bounded Agent Session v1, Model Policy v1, and the local Ollama provider.

The Studio and runtime layers stay deliberately separate. Creator tooling and game-specific rules remain in the Studio/game layer; controller, observation, action, transport, model-policy, and bounded-session contracts live in the reusable runtime layer.

## Current status

- Full PixelForge Studio v5.27 is integrated on `main`.
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

Run the current v5.27 gate directly:

```bash
npm run validate:v5.27
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
