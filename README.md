# Parallax PixelForge

Parallax PixelForge is a local-first retro Creator OS for building, playtesting, shelving, sharing, and evolving tiny heartfelt game worlds.

**Current integrated target:** PixelForge Studio **v5.27.0-alpha** plus the public **Runtime SDK v1** stack: Runtime Bridge, Shared Runtime Core, synchronous and asynchronous Runtime Hosts, bounded Agent Session v1, Model Policy v1, and the local Ollama provider.

The Studio and runtime layers are intentionally separate: creator tooling and game-specific rules stay in the Studio/game layer, while controller/observation/action boundaries, transport-safe envelopes, model policy, and bounded agent sessions live in the reusable runtime layer.

## v5.27 Three-View Convergence — Chapter Five

- Adds **Mirrorfall Basin**, where three top-down prism pylons align one persistent world beam.
- That beam changes **Splitlight Causeway** in side-view by enabling reflected platform geometry; three Pulse Nodes there power the next viewpoint.
- Adds **Triune Observatory**, whose `ROOT → PULSE → LENS` shutter sequence consumes the side-view state and produces the View Sigil.
- Adds **The Blind Angle**, a three-phase boss whose progression order is top-down prism → side-view pulse → first-person lens.
- Advances Legend saves to `pixelforge.legend-save.v5.27` schema version 4 while accepting v5.24, v5.25, and v5.26 saves.
- Expands the local-first travel network to **six earned landmarks** with Mirrorfall Observatory.
- Cross-view causality clarity, switching friction, boss readability, pacing, commercial depth, and $3.69 worthiness remain human review gates.

```bash
npm run legend:convergence:generate
npm run legend:convergence:preview
npm run legend:convergence:audit
npm run legend:convergence:test
npm run legend:convergence:check
```

## Agent-native Runtime SDK v1

The repository also carries the reusable runtime substrate proven outside the original Studio scaffold.

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

- `runtime/sdk-v1.js` — Runtime SDK v1 public entry point.
- `runtime/core-v1.js` — shared descriptors, controller/tick/intent envelopes, and wire-safe helpers.
- `runtime/bridge-v1.js` — the small engine-facing bridge contract.
- `runtime/conformance-v1.js` — reusable bridge conformance assertions.
- `runtime/host-v1.js` — synchronous in-process host.
- `runtime/async-host-v1.js` — Promise-capable host for transported/external runtimes.
- `runtime/agent-session-v1.js` — bounded multi-turn agent-session runner.
- `runtime/model-policy-v1.js` — provider-neutral model policy client.
- `runtime/providers/ollama-v1.js` — local Ollama provider adapter.
- `runtime/reference-counter.js` — deterministic reference runtime used by the conformance suite.

Key invariants:

- controller registration does **not** imply authority,
- model/provider calls stay outside the deterministic game simulation,
- malformed model output fails closed before gameplay mutation,
- total intent budgets are enforced before submission,
- replay does not rerun the provider,
- game-specific combat, physics, rendering, rooms, shops, and authority rules remain game-owned.

Runtime documentation:

```text
docs/RUNTIME_BRIDGE_V1.md
docs/RUNTIME_SHARED_CORE_V1.md
docs/RUNTIME_HOST_V1.md
docs/RUNTIME_ASYNC_HOST_V1.md
docs/RUNTIME_AGENT_SESSION_V1.md
docs/MODEL_POLICY_V1.md
docs/OLLAMA_PROVIDER_V1.md
```

The public preflight runs the Runtime SDK tests together with the full Studio/Legend validation pipeline:

```bash
npm run github:preflight
```

Python-backed content generators use the repository launcher and pinned requirements:

```bash
python -m pip install -r requirements.txt
```

## v5.26 Stormglass Coast — Chapter Four

- Adds **Stormglass Coast**, a fourth Legend region with original coastal overworld, side-view cliffs, first-person Tide Engine, and Undertow Bell boss arena.
- Adds **Sable Current**, three Tideglass Shells, and the permanent **Gale Mantle** midair-dash upgrade.
- Stormglass Cliffs contains three upgrade-gated gaps that the old movement kit cannot clear.
- Adds a four-step `TIDE → WIND → LIGHT → BELL` Tide Engine puzzle and five-health Undertow Bell boss whose vulnerability requires Gale Mantle surge-phasing.
- Adds the **Stormglass Compass** chapter reward and a fifth world-map landmark: Stormglass Lighthouse.
- Legend saves advance to `pixelforge.legend-save.v5.26` schema version 3 while accepting both v5.24 and v5.25 saves.
- Human air-dash feel, cliff readability, puzzle clarity, boss fairness, chapter pacing, commercial depth, and $3.69 worthiness remain separate review gates.

```bash
npm run legend:chapter4:generate
npm run legend:chapter4:preview
npm run legend:chapter4:audit
npm run legend:chapter4:check
```

## v5.25 World Map / Fast Travel / Checkpoint Shrines

- Adds a native 320×180 Legend world map with four progression-bound landmarks.
- Bouncehome Shrine starts active; Larrina Tower and Iron Orchard activate on first earned arrival; the Eastern Beacon activates when its quest restoration completes.
- Fast travel only targets activated, already-earned safe scenes and cannot bypass puzzles, bosses, items, or quest gates.
- Legend saves advance to `pixelforge.legend-save.v5.25` schema version 2 while importing v5.24 saves with additive travel-network defaults.
- Travel state remains local-only and portable inside the existing save JSON.
- Human review remains required for map readability, shrine placement, and exploration-vs-convenience balance.

> **v5.21 house default:** SNES-first 16-bit expressive pixel adventures with explicit asset-pack contracts. Primitive 8-bit/Atari-style presentation remains opt-in, not the default.

Parallax PixelForge is a local-first retro Creator OS for building, playtesting, shelving, sharing, and evolving tiny heartfelt game worlds.

v5.21 retains Legend at 8/8 machine-side art readiness and the original audio foundation, then adds The Flat Note: a timing-gated six-hit rhythm boss, four-heart combat loop, Resonance Seal progression reward, and boss-specific original art/audio.

- **PixelForge Studio** — the free/open-source forge.
- **Sample cartridges** — runnable learning examples for new creators.
- **Community cartridges** — user-created tiny worlds that can be shared, reviewed, and improved.
- **369 PocketGames** — the polished premium mobile output label for complete micro-games.

The dream is simple: help people finish small games with soul.




## v5.21 Legend Boss + Combat Pass

- Adds **The Flat Note**, a six-hit side-view rhythm boss beneath the Beat Shrine.
- Boss vulnerability opens on one GOLD beat in a four-beat cycle; off-beat strikes cost a heart.
- Adds original 64×64 boss animation art, 672×180 arena art, Resonance Seal reward art, and three original boss audio cues.
- Larrina Tower now requires both the Rhythm Crest and Resonance Seal.
- Adds local boss-run telemetry and a deterministic combat audit while keeping difficulty/fun/visual/audio/value approval human-only.

```bash
npm run legend:boss:generate
npm run legend:boss:preview
npm run legend:boss:audit
npm run legend:boss:check
```

## v5.20 Legend Adventure Expansion

- Adds Old Tempo, Grove Key, Echo Hollow, Flatlings, Echo Shards, Beat Shrine and Rhythm Crest progression.
- Expands Legend beyond the original vertical slice while keeping commercial-depth review human-controlled.


## v5.19 Legend Audio Pass

- Adds four original loopable scene themes and six original gameplay SFX.
- Audio is local PCM16 WAV with no external samples or network dependency.
- Adds runtime music/SFX bindings for Bouncehome, Wobble Woods, Larrina Tower, Rune, Gate, bounce, hit, dialogue and ending events.
- Adds a zero-install audio jukebox for human listening review.
- Removes the machine-side “no audio assets” blocker while preserving human audio/visual/control/content/value review.

```bash
npm run legend:audio:generate
npm run legend:audio:jukebox
npm run legend:audio:preview
npm run legend:audio:audit
```

## v5.18 Gold Standard Playtest

- Adds a true `legend-complete` run state after all four Larrina dialogue beats.
- Tunes Wobble Woods with acceleration/deceleration, 100 ms coyote time, 120 ms jump buffering, and variable jump height.
- The standalone playable can download a local-only run receipt with time, jumps, bounce-pad hits, falls, Rune timing, dialogue advances, and restarts.
- Adds deterministic playtest audit + explicit human Gold Standard review recorder.
- v5.18 originally found zero real audio assets. v5.19 resolves that machine blocker; human control feel, visual/audio approval, content depth, $3.69 worthiness, and store-art approval remain pending.

```bash
npm run legend:gold:preview
npm run legend:gold:audit
```

## v5.17 Bounce Effects Pass

- Added an original 20-frame 32×32 effects sheet.
- Five animation states: bounce impact, Rune pickup, Echo Gate opening, sparkle, and hit.
- Effects are runtime-bound in Wobble Woods and reused for Tower Rune emphasis.
- Required Legend final art reaches **8 / 8 READY**.
- Machine-side art readiness is complete. Human visual-gold-standard review, playtest/value signoff, store-art approval, and physical-device QA remain separate.

## v5.16 SNES UI Kit Pass

- Original `pf-ui-frame-v1` art pack with three 48×48 nine-slice frame families.
- Native 256×96 UI atlas with 14 reusable 16×16 icons.
- Dialogue, HUD, Rune counter, transition card, menu and inventory components.
- Runtime and React cartridge bindings use repository UI art instead of CSS-only frames.
- Required Legend final art reaches **7 / 8 READY**.
- Only `bounce-effects` remains pending; human visual-gold-standard review remains separate.

## v5.15 Larrina Tower Interior Pass

- Added 16 original reusable 16×16 Larrina Tower interior tiles.
- Added a composed 320×180 first-person Tower room using the same house palette as Larrina's character/portrait art.
- Bound the Tower interior into Tile Studio, Asset Forge, Runtime Composer, the Legend React cartridge, and the zero-install preview.
- Required Legend final art ready: **6 / 8**.
- Shared SNES UI frames and bounce effects remain pending.

## v5.14 Larrina Character + Portrait Pass

- Princess Larrina now has an original 24-frame 32×48 gameplay sprite sheet.
- Four original 96×96 dialogue portraits are bound: neutral, smile, concern and surprised.
- Wobble Woods Echo Gate now targets a first-person Tower runtime with real Larrina art.
- Tower interior art remains explicitly pending and does not count as final environment art.
- Required Legend final art ready: **5 / 8**.

## v5.13 Wobble Woods Art Pass

Legend now carries a third ready required art role: **Wobble Woods environment art**. The side-view scene binds a 16-tile 16×16 environment sheet plus four original 672×180 parallax layers (far canopy, mist, near forest, foreground). Runtime geometry, bounce pads and the Rune/Echo Gate loop remain data-driven.

- Required final art ready: **3 / 8**
- More Bounce hero: ready
- Bouncehome Grove tiles: ready
- Wobble Woods environment: ready
- Larrina, Tower, UI and effects: pending

Human visual-gold-standard review remains a separate gate.

## v5.12 Real SNES Content + Runtime Authoring

Open **Sprite Studio** to draw and animate 32×48-class SNES heroes, NPCs, effects, and portraits.

Open **Tile Studio + Map Composer** to draw native 16×16 environment tiles, label semantic/collision roles, organize explicit autotile groups, and paint layered maps. Tilesets and maps remain local in project JSON; exports are ordinary PNG/JSON; Asset Forge attachments record declared rights state plus SHA-256 evidence. Human visual review remains required for SNES gold-standard approval.


### Legend v5.12 content proof

```bash
npm run legend:content:preview
npm run legend:content:check
```

Current required-art progress: **2 / 8 READY** — `more-bounce-hero` and `bouncehome-overworld`. Wobble Woods layout is playable, while its final environment art remains explicitly pending.

Useful creator checks:

```bash
npm run sprite:check
npm run tile:check
npm run runtime:check
```

Open **Runtime Composer** after authoring a sprite/map to test movement and collision immediately with WASD or arrow keys.

## Quick start

Run the PixelForge Studio shell:

```bash
npm run start
```

Then open:

```text
http://localhost:3690
```

Run the root checks:

```bash
npm test
npm run validate:demo
npm run validate:journey-cartridge
npm run pocketgames:all
```

Run the public GitHub preflight:

```bash
npm run github:preflight
```


## Fastest creator path

Create a new cartridge without manually copying folders:

```bash
npm run new:cartridge -- "My Tiny Game"
```

Then run it:

```bash
cd games/my-tiny-game
npm install
npm run dev
```

Back at the repo root, check phone readability:

```bash
npm run check:mobile -- games/my-tiny-game
```

Check the cartridge asset contract too:

```bash
npm run asset:check -- games/my-tiny-game
```

New cartridges inherit the SNES-house asset profile automatically. Missing real art remains explicitly `awaiting-art` until supplied and reviewed.

Capture a clean Studio screenshot (Chrome/Chromium/Edge required):

```bash
npm run screenshot -- . exports/screenshots/pixelforge-studio.png
```



## SNES Asset Forge

Inspect the Legend asset contract and generate production briefs:

```bash
npm run asset:legend
npm run asset:legend:briefs
npm run asset:catalog
```

Attach a real original/licensed/public-domain asset to a declared slot:

```bash
npm run asset:attach -- games/my-game hero /path/to/hero-sheet.png --rights original --source-note "Created for this cartridge"
npm run asset:check -- games/my-game
```

The attach command refuses silent overwrites, records a SHA-256 hash, and requires an explicit rights state. A slot is not considered ready just because the art direction document exists.

## Community Cartridge Shelf

Build the local cartridge shelf:

```bash
npm run check:mobile -- games/the-legend-of-more-bounce
npm run community:review -- games/the-legend-of-more-bounce
npm run community:shelf
```

Then open:

```text
community/index.html
```

The shelf works without an account or server. It supports local JSON import/export, creator credits, separate rights/claim/mobile/runtime badges, and playtest receipt summaries.

Record an explicit local human playtest:

```bash
npm run community:playtest -- the-legend-of-more-bounce --tester "Local Tester" --fun 5 --clarity 4 --difficulty 3 --replay 5 --notes "Short and fun."
npm run community:shelf
```

Automated browser QA and subjective human ratings are stored as different receipt kinds.

## 369 PocketGames production lane

Promote the first packaged production proof:

```bash
npm run pocketgames:promote
```

Current result for **The Legend of More Bounce**:

```text
production candidate: PASS
retail release ready: NO
status: production-candidate-human-signoff-pending
```

That is intentional. PixelForge may assemble and verify the production package, but a paid public release still requires explicit human **$3.69 worthiness** and **final store-art** signoff. See `docs/369_POCKETGAMES_PRODUCTION_GATE.md`.

## Flagship sample cartridge

**Journey to the Parallax Pyramid**
Source title: **Parallax Trail: The Pyramid at Shasta**

```text
games/journey-to-parallax-pyramid/
```

Run the demo locally:

```bash
cd games/journey-to-parallax-pyramid
npm install
npm run dev
```

This is the first learning cartridge and the first 369 PocketGames candidate.

## Create your first cartridge

Start here:

```text
docs/MAKE_YOUR_FIRST_CARTRIDGE.md
games/_template/
pocketgames/templates/pocketgame_manifest.template.json
```

Suggested path:

1. Copy `games/_template/` into `games/my-game-slug/`.
2. Rename the title and starter text.
3. Add original or clearly licensed assets only.
4. Add a small complete game loop.
5. Add rights notes.
6. Add a PocketGames manifest only when it is mobile/premium-ready.
7. Run validators before opening a pull request.

## 369 PocketGames promise

A 369 PocketGame should be:

- small but complete,
- paid once,
- no ads,
- no predatory in-app purchases,
- no subscriptions,
- no loot boxes,
- no energy timers,
- playable offline,
- charming in the first minute.

The signature target price is **$3.69** for polished premium micro-games. The **$0.99** tier is reserved for tiny minis, experiments, or limited launch sales.

## Public release boundary

This repository is prepared for public collaboration, but production publishing still requires review.

Locked/off by default:

- public BBS,
- public relay networking,
- free-text co-play chat,
- hidden profiling,
- automatic tester outreach,
- remote save overwrite,
- unreviewed public asset publishing,
- app-store production signing.

## Important docs

```text
docs/V5_5_COMMUNITY_CARTRIDGE_WAVE.md
docs/COMMUNITY_CARTRIDGE_REVIEW_CHECKLIST.md
docs/V5_4_CREATOR_ONBOARDING_POLISH.md
docs/V5_3_PUBLIC_GITHUB_LAUNCH_KIT.md
docs/MAKE_YOUR_FIRST_CARTRIDGE.md
docs/CARTRIDGE_SUBMISSION_RULES.md
docs/OPEN_SOURCE_COMMUNITY_WAVE.md
docs/LICENSING_AND_RIGHTS.md
docs/MAINTAINER_RELEASE_PLAYBOOK.md
docs/PUBLIC_ROADMAP.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
LICENSE-CONTENT-NOTICE.md
```

## License notes

PixelForge engine/source code is MIT licensed. Demo game content, names, characters, story text, art, audio, and brand assets may have additional rights boundaries. Read `LICENSE-CONTENT-NOTICE.md` and each cartridge's rights notes before reusing content commercially.

## Community tone

Build like this is a creative porch, not a clout arena. Be kind, credit people, keep assets clean, and make the next creator feel brave enough to ship a tiny finished thing.


## v5.20 Adventure Expansion

Legend of More Bounce now has a larger gated adventure loop: Old Tempo at Moon Pond, the Old Ruin Grove Key, Wobble Woods Rune recovery, Echo Hollow with three Flatling encounters and three Echo Shards, a Moon → Rune → Bounce Beat Shrine puzzle, the Rhythm Crest, and a revised Larrina Tower payoff. Machine counts prove the expansion exists; commercial content depth and the $3.69 value judgment remain human-only gates.

## v5.22 Eastern Road / Chapter Two
Legend now continues after The Flat Note into Eastwind Road, adding Mira Reed, Glassgrass Pass, two-hit Static Sprites, three Relay Sparks, the permanent Echo Boots movement upgrade, Signal Mill, a three-step relay puzzle, and the Eastern Beacon Lens. Machine validation does not promote Chapter Two pacing, upgrade feel, or commercial value into human approval.


## v5.23 The Iron Orchard / Chapter Three
PixelForge's Legend showcase now includes a hub-and-branch chapter: Rivet Row, Tessa Coil's Gear Apple trade, Bram Gearroot's optional Heart Rivet side quest, Rustroot Cavern, armored Rustlings, the Resonance Bracer combat ability, and the Rustbloom Warden boss. Human hub-flow, side-quest value, combat-feel, pacing and retail-value review remain separate gates.


## v5.24 Save / Inventory / Equipment
Legend now supports three manual local save slots, one autosave, safe checkpoint resume, portable save JSON import/export, an in-game inventory/equipment journal, three chapter quest logs, discovered-location history and boss records. Persistence remains local-first with no account, cloud sync, analytics, or network telemetry. Save-menu usability, checkpoint feel, journal readability, commercial depth and $3.69 worthiness remain human-only review gates.
