# Public Roadmap

## v5.33 — First Real Cartridge Bridge — Complete

- The Legend of More Bounce runs through Runtime Bridge v1 from its real Bouncehome Grove scene packet.
- Scene collision and spawn data govern movement.
- Existing JSONL transport remains unchanged.
- Intended next proof: PhiCade cross-repository qualification against this real cartridge.

## v5.32 — Runtime Bridge JSONL Transport — Complete

- bounded local JSONL transport for Runtime Bridge v1,
- strict method allow-list and ordered request processing,
- deterministic reference-counter stdio server,
- intended external governed-host handoff to PhiCade,
- no transport-level authority escalation.

## v5.3 — Public GitHub Launch Kit

- Public README and contribution kit.
- Starter cartridge template and first-cartridge tutorial.
- Public validation workflow.
- 369 PocketGames candidate lane.

## v5.3.1 — Runtime Bridge Foundation — Complete

- game-agnostic Runtime Bridge v1,
- deterministic counter reference cartridge,
- controller/observation/action conformance tests,
- external full-game adapter proof without moving game-specific rules into the core.

## v5.3.2 — Shared Runtime Core — Complete

- shared descriptor and wire-envelope contracts,
- Runtime SDK v1 public entry point,
- normalized external-step vs engine-clock semantics,
- reusable conformance assertions,
- gameplay, rendering, physics, and game-specific authority kept outside the shared core.

## v5.3.3 — Generic Runtime Host — Complete

- game-agnostic `RuntimeHostV1`,
- independent host receipt transcript and event cursor,
- descriptor-driven clock behavior,
- no provider- or game-specific logic in the host.

## v5.3.4 — Model Policy Client — Complete

- provider-neutral model policy client above the host,
- normalized provider request/response boundary,
- sync or async providers,
- fail-closed malformed model output,
- per-turn intent budgets enforced before submission,
- provider receipts kept separate from host/game ledgers.

## v5.3.5 — Local Ollama Provider — Complete

- first concrete local model-provider adapter,
- non-streaming structured `/api/chat` integration,
- normalized provider envelope,
- explicit transport/HTTP/shape failures,
- live-model qualification kept optional and outside required CI.

## v5.3.6 — Async Runtime Host — Complete

- Promise-capable host for transport-backed runtimes,
- same public semantics as the synchronous host,
- support for both sync and async bridge implementations,
- external-engine qualification path without embedding transport logic in game rules.

## v5.3.7 — Bounded Agent Session — Complete

- host-agnostic multi-turn session runner,
- hard total-intent and turn limits,
- consecutive-empty-turn guard,
- cancellation before action submission,
- custom stop conditions,
- same runner across sync and async hosts,
- session receipts separated from model, host, and game evidence,
- no hidden retries or authority expansion.

## v5.4 — Creator Onboarding Polish — Complete Candidate

- one-command cartridge generator,
- clearer starter UI components,
- screenshot/export helper,
- improved mobile readability checks,
- beginner-friendly docs pass,
- rights-clean starter asset pack.

## v5.5 — Community Cartridge Shelf — Candidate

Implemented in this candidate:

- local community cartridge index format,
- zero-install cartridge gallery,
- creator credits view,
- local JSON import/export flow,
- review badges for rights, credits, claim boundaries, mobile readiness, and local-first runtime,
- featured learning cartridges,
- explicit human and automated playtest receipt loop.

## v5.6 — 369 PocketGames Production Candidate — Complete Candidate

Implemented in this candidate:

- PocketGames release evaluator and promotion gate,
- The Legend of More Bounce production manifest (Candidate #2),
- declared-rights receipt with hashed inventory,
- app-store metadata packet,
- PWA-style mobile wrapper research build,
- four-screenshot production package and asset checklist,
- mobile QA matrix with physical-device tests explicitly pending,
- reproducible production-candidate package with SHA-256 ledger,
- explicit human price-worthiness and final store-art retail gates.

Current Legend status: `production-candidate-human-signoff-pending`.

## v5.7 — SNES Style Lock — Complete Candidate

Implemented in this candidate:

- SNES-first 16-bit house default,
- explicit visual profile metadata for newly generated cartridges,
- deterministic style audit receipts,
- community-review visual-lane badge,
- human gold-standard signoff boundary,
- The Legend of More Bounce designated `PF_GOLD_STANDARD_001`,
- upgraded Legend title/overworld/side-view/tower source presentation.

Legend style status: `source-contract-pass-human-visual-review-pending`.

## v5.8 — SNES Asset Forge — Complete Candidate

Implemented in this candidate:

- reusable SNES House Foundation asset-pack contract,
- four 16-color house palettes,
- per-cartridge asset profiles,
- hero/NPC/portrait/tileset/interior/UI/effects/audio slot vocabulary,
- deterministic asset-profile receipts,
- generated asset catalog,
- SNES asset profile inheritance for new cartridges,
- PocketGames asset-contract production gate and required-asset retail gate.

Legend asset status: `asset-contract-pass-content-pending`. Final original pixel-art sheets remain intentionally unclaimed until supplied and reviewed.

## v5.9 — Sprite Studio — Complete Candidate

Implemented:

- built-in SNES-first pixel editor,
- 32×48 hero baseline and other game-art presets,
- animation timeline, labels, onion skinning, FPS and live preview,
- sprite-sheet PNG + animation JSON export,
- rights-aware SHA-256 Asset Forge sprite attachment.

## v5.10 — Tile Studio + Map Composer — Complete Candidate

Implemented:

- native 16×16 tile editor,
- semantic tags, walkability and explicit autotile-group metadata,
- reusable tileset bank,
- layered ground/decor/collision Map Composer,
- map paint/erase/fill tools and scene-size presets,
- tileset PNG and portable map JSON export,
- rights-aware Asset Forge tileset attachment and project map packets,
- additive project persistence and v5.10 validation.

## v5.11 — Runtime Composer — Complete Candidate

Implemented:

- playable scene binding from Sprite Studio + Tile Studio + Map Composer,
- camera-follow viewport and keyboard movement,
- collision sourced directly from authored collision layers,
- live idle/walk sprite-frame selection,
- semantic preview fallback that remains explicitly non-final art,
- collision/grid debug overlays,
- portable runtime-scene JSON export,
- additive project persistence and attached runtime-scene registry.

## v5.12 — Legend SNES Content Pass — Complete Candidate

Implemented:

- original 23-frame More Bounce 32×48 hero sheet,
- original eight-tile Bouncehome Grove 16×16 set,
- real-art Asset Forge promotion for two required slots,
- v5.12 top-down Bouncehome runtime packet,
- Wobble Woods side-view layout with bounce pads and rune goal,
- zero-install cross-mode transition preview,
- Legend source binding to real hero/map assets,
- explicit remaining-art boundary and v5.12 validation.

Legend required-art progress: **2 / 8 READY**.

## v5.18 — Gold Standard Playtest — Complete Candidate

- deterministic playtest audit and local run receipts,
- movement-feel instrumentation including coyote time and jump buffering,
- explicit separation between machine readiness and human Gold Standard approval.

## v5.21 — Flat Note Boss + Combat Pass — Complete Candidate

- timing-gated boss combat loop,
- boss-specific original art/audio,
- progression reward and deterministic combat audit,
- human combat-feel review remains separate.

## v5.22 — Eastern Road / Chapter Two — Complete Candidate

- second-region progression,
- Echo Boots movement upgrade,
- Signal Mill relay puzzle,
- Eastern Beacon Lens reward,
- human pacing and value review remain separate.

## v5.24 — Save / Inventory / Equipment — Complete Candidate

- manual local save slots plus autosave,
- safe checkpoint resume,
- portable save JSON import/export,
- inventory/equipment journal, quest logs, discovered locations, and boss records,
- local-first persistence with no account or cloud requirement.

## v5.25 — World Map / Fast Travel / Checkpoint Shrines — Complete Candidate

- progression-bound world-map landmarks,
- earned fast travel only,
- additive save migration from v5.24,
- no bypass of puzzles, bosses, items, or quest gates.

## v5.27 — Three-View Convergence / Chapter Five — Complete Candidate

- Mirrorfall Basin top-down prism alignment,
- Splitlight Causeway side-view pulse progression,
- Triune Observatory first-person shutter sequence,
- The Blind Angle three-phase cross-view boss,
- save schema v4 with v5.24/v5.25/v5.26 migration,
- six earned travel landmarks,
- machine validation complete while human readability, pacing, commercial-depth, and value review remain separate gates.

## Later

Possible lanes:

- Legend gold-standard sprite/tileset production,
- autotile placement once complete edge/corner art exists,
- Writers Studio quest/dialogue helper,
- Chiptune Studio,
- local AI playtest bench,
- cartridge bundle builder,
- web export polish,
- optional mobile wrapper.

Public networking, accounts, chat, remote save sync, and app-store signing remain gated until separately reviewed.


## v5.13 — Wobble Woods Art Pass
- original 16×16 Wobble environment tiles,
- four-layer side-view parallax environment,
- Tile Studio art seed + rights/hash receipt,
- runtime binding and standalone cross-mode preview,
- Legend required final art reaches 3/8 ready.

## Next content target
- Larrina character sheet + portrait set,
- then Larrina Tower interior, shared UI and effects.

## v5.14 — Larrina Character + Portrait Pass
- original 24-frame 32×48 Princess Larrina gameplay sheet,
- original four-expression 96×96 portrait set,
- runtime-bound dialogue expressions,
- Wobble Echo Gate → first-person Tower transition,
- Tower interior remains explicitly pending final art,
- Legend required final art reaches 5 / 8 ready.


## v5.15 — Larrina Tower Interior Pass — Complete Candidate
- original 16×16 Tower interior kit,
- original 320×180 first-person room composition,
- Tile Studio seed + rights/hash receipt,
- Runtime Composer environment binding,
- Legend React + standalone preview binding,
- Legend required final art reaches **6 / 8 READY**.

## Next content target
- shared SNES UI frames,
- bounce/rune/gate effects,
- then human visual-gold-standard review of the complete tri-view cartridge.


## v5.16 — SNES UI Kit Pass — Complete Candidate

- Original shared PixelForge SNES UI kit.
- Dialogue/menu/status nine-slice frames plus HUD, Rune chip, transition card and inventory slot.
- Native icon atlas and explicit UI runtime binding.
- Legend required final art reaches **7 / 8 READY**.
- Next content milestone: bounce/rune/gate effects to complete 8 / 8 machine-side art readiness.


## v5.17 — Bounce Effects Pass — Complete Candidate
- Original 20-frame 32×32 effects sheet.
- Bounce impact, Rune pickup, Echo Gate opening, sparkle and hit states.
- Runtime bindings in Wobble Woods and Larrina Tower.
- Legend required final art reaches **8 / 8 READY**.
- Next milestone is human visual/playtest review, not another machine-generated art slot.

## v5.19 — Legend Audio Pass — Complete Candidate
- four original loopable scene themes,
- six original gameplay SFX,
- reproducible local audio generator + rights/hash receipts,
- React + standalone audio bindings,
- zero-install listening jukebox,
- human audio-quality review remains mandatory.

## Next product target
- human Gold Standard playtest with audio enabled,
- then expand commercial content depth rather than adding more machine-ready asset categories.


## v5.20 — Legend Adventure Expansion — Complete Candidate
- expanded Bouncehome overworld with six named nodes,
- Old Tempo NPC clue + Old Ruin key/treasure beat,
- Echo Hollow second side-view route,
- three Flatling encounters + three Echo Shards,
- Beat Shrine first-person three-step puzzle,
- Rhythm Crest gated Tower payoff,
- local playtest receipt + machine content-depth audit,
- commercial depth and $3.69 worthiness remain human review gates.


## v5.23 — The Iron Orchard / Chapter Three
- hub-and-branch adventure structure,
- required and optional shop quests,
- permanent combat upgrade,
- ability-gated dungeon,
- chapter boss,
- human hub/sidequest/value review.

## v5.26 — Stormglass Coast / Chapter Four — Candidate

- Fourth Legend region with coastal overworld, air-dash traversal, Tide Engine puzzle and Undertow Bell boss.
- Permanent Gale Mantle movement upgrade.
- Save schema v3 with v5.24/v5.25 migration.
- Fifth world-map travel landmark.
- Human movement/pacing/boss/value review remains open.
