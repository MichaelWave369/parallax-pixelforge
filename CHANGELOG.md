# Changelog

## 5.33.0-alpha — First Real Cartridge Bridge
- Added a Runtime Bridge v1 adapter for The Legend of More Bounce using the real Bouncehome Grove runtime-scene packet.
- Movement now resolves against the scene's real collision layer and emits semantic movement/block/refusal events.
- Added a cartridge JSONL server that reuses the v5.32 transport contract unchanged.
- Added cartridge bridge tests, SDK/package export, public-release retention, and the v5.33 validation gate.
- Kept framebuffer/audio, save semantics, exact replay, SPARK, and Unreal claims explicitly outside this rung.

## 5.32.0-alpha — Runtime Bridge JSONL Transport
- Added a bounded newline-delimited JSON transport for the existing Runtime Bridge v1 method set.
- Added ordered local stdio serving with explicit request/response schemas and fail-closed malformed/unknown request handling.
- Added a deterministic reference-counter server for external hosts such as PhiCade.
- Added public SDK/package export, transport tests, documentation, and a v5.32 release gate.
- Preserved the authority boundary: transport and controller registration do not grant gameplay authority.

## 5.31.0-alpha — Native WebGL2 GLB Preview
- Added a zero-dependency browser WebGL2 viewer for structurally qualified GLB/glTF 2.0 assets.
- Added drag/drop, file-picker and same-origin local-vault URL loading plus orbit, zoom, reset and auto-framing.
- Added static mesh/node rendering with indexed/non-indexed TRIANGLES, base-color factors and embedded base-color textures.
- Added explicit warnings for animation, skinning, embedded cameras, required extensions, missing normals and simplified metallic/roughness.
- Added machine preview plans and receipts ending at PREVIEW_RENDERED_VISUAL_REVIEW_PENDING.
- Added four preview-plan tests, browser-module syntax checking and a v5.31 release gate.

## 5.30.0-alpha — Unreal Discovery + GLB Structural Qualification
- Added Unreal `/Game` asset discovery with ranked candidate object paths and asset-class receipts.
- Kept candidate selection operator-controlled; discovery never auto-binds or exports a path.
- Added a dependency-free GLB/glTF 2.0 container inspector for headers, chunks, scenes, meshes, materials, textures, animations, skins, buffers and extensions.
- Added combined export-integrity + GLB structural qualification ending at INTERCHANGE_STRUCTURAL_PASS_RUNTIME_IMPORT_PENDING.
- Added four GLB qualification tests, Unreal discovery Python syntax coverage and a v5.30 release gate.

## 5.29.0-alpha — Unreal Export Executor
- Added v1→v2 binding for real Unreal project and content paths without committing local paths or assets.
- Added Windows/Linux UnrealEditor-Cmd planning/execution wrapper using the repository Python launcher.
- Added Unreal-side GLB/glTF export through the GLTF Exporter Python API.
- Added export receipts with engine version, warnings/errors, byte count and SHA-256.
- Added PixelForge-side receipt verification ending at EXPORT_VERIFIED_IMPORT_PENDING rather than automatic compatibility approval.
- Added five executor governance tests, Python syntax checks and a v5.29 release gate.

## 5.28.0-alpha — External Asset Forge / Unreal Arsenal Bridge
- Added local governed intake for external asset registries while keeping purchased source files out of the public repository.
- Added deterministic PORTABLE / BAKEABLE / REIMPLEMENT routing and rights-aware Asset Passports.
- Added operator-bound Unreal export-job manifests with GLB/PNG target requests, source hashes, and local-only staging policy.
- Added six external-asset governance tests plus a v5.28 release gate.
- Qualified no marketplace assets by assumption: compatibility and lane verdicts remain source-governed and human-reviewable.

## 5.27.0-alpha — Three-View Convergence / Chapter Five
- Added Mirrorfall Basin, Splitlight Causeway, Triune Observatory, and The Blind Angle.
- Made top-down, side-view, and first-person state causally interdependent through prism, Pulse Node, and lens-shutter progression.
- Added Perri Prism, original Mirrorfall/Observatory/Boss art, six original local audio cues, and a sixth earned travel landmark.
- Advanced Legend saves to schema version 4 with v5.24/v5.25/v5.26 migration and persistent convergence state.
- Added deterministic convergence tests/audit while preserving human clarity, switching-friction, boss-readability, pacing, depth, and value review boundaries.

## 5.26.0-alpha — Stormglass Coast / Chapter Four
- Added Stormglass Coast, Sable Current, Tideglass Shells, permanent Gale Mantle air-dash, Stormglass Cliffs, Tide Engine puzzle, Undertow Bell boss and Stormglass Compass reward.
- Expanded the world-map network from four to five landmarks.
- Advanced Legend saves to schema version 3 while retaining v5.24/v5.25 migration.
- Added six original Chapter Four audio cues and eight original Chapter Four/world-map art assets.
- Preserved human control/readability/puzzle/boss/pacing/value review boundaries.

## v5.25.0-alpha — World Map / Fast Travel / Checkpoint Shrines

- Added a four-landmark persistent travel network and native SNES-style world map.
- Added activated checkpoint shrines/beacons and safe-scene fast travel.
- Advanced Legend portable saves to v5.25 schema version 2 with v5.24 migration support.
- Added machine travel audit plus explicit human map/balance review boundaries.

## v5.24.0-alpha — Save / Inventory / Equipment
- Added three manual Legend save slots plus local autosave and Continue Game.
- Added versioned `pixelforge.legend-save.v5.24` schema with safe checkpoint resume and additive migration.
- Added inventory, equipment, quest log, discovered locations and boss records to the in-game Journal.
- Added portable save JSON import/export; no cloud account or network sync.
- Added machine save-schema tests/audit while preserving human usability/value review boundaries.

## v5.23.0-alpha — The Iron Orchard / Chapter Three
- Added Iron Orchard hub, branching shop/sidequest progression, Resonance Bracer, Rustroot Cavern, Rustlings and Rustbloom Warden.
- Added six original local audio cues and v5.23 machine/human evidence boundaries.

# v5.22 — Eastern Road / Chapter Two

- Added Eastwind Road second chapter, Mira Reed, Glassgrass Pass, Static Sprites, Relay Sparks, Echo Boots permanent upgrade, Signal Mill puzzle, Beacon Lens, and five original audio cues.
- Retained all prior creator/runtime/production systems.
- Human pacing, upgrade feel, difficulty and commercial-value gates remain open.

# v5.21.0-alpha — Legend Boss + Combat Pass

- Added The Flat Note six-hit rhythm boss and 4-heart player combat state.
- Added 25% timed vulnerability window (700 ms GOLD beat in a 2800 ms cycle).
- Added original boss sprite sheet, arena, Resonance Seal reward art and boss-specific audio pack.
- Added Resonance Seal progression gate before Larrina Tower.
- Added deterministic boss combat audit and local standalone boss playtest.
- Human difficulty, combat feel, boss presentation, audio quality and commercial-value review remain pending.

# v5.20.0-alpha — Legend Adventure Expansion

- Added Old Tempo NPC, Grove Key treasure beat, Echo Hollow, Flatling encounters, Echo Shards, Beat Shrine puzzle and Rhythm Crest progression.
- Added original v5.20 expansion assets and rights/hash receipt.
- Added zero-install adventure expansion playtest + local run receipt.
- Added commercial-depth audit that retains human value review.
- Retained 8/8 final art and 10/10 audio readiness.


## 5.19.0-alpha — Legend Audio Pass
- Added four original loopable scene themes and six original event SFX.
- Added deterministic local audio generator, cue manifest, rights receipt and SHA-256 provenance.
- Bound audio to React and standalone runtime events with explicit user sound enablement.
- Added zero-install audio jukebox and v5.19 audio/Gold audit.
- Removed the machine-side missing-audio blocker; human listening/control/visual/content/value approval remains separate.

## 5.18.0-alpha — Gold Standard Playtest
- Adds a true completed-run state to the Legend standalone.
- Tunes Wobble Woods with acceleration/deceleration, 100 ms coyote time, 120 ms jump buffer, and variable jump height.
- Adds local-only downloadable run telemetry.
- Adds deterministic Gold Standard audit and explicit human review recorder.
- Records real blockers: no audio assets yet, commercial content depth unproven, human visual/control/value approval pending.

# 5.17.0-alpha — Bounce Effects Pass

- Added original 20-frame 32×32 PixelForge effects sheet.
- Bound bounce impact, Rune pickup, Echo Gate opening, sparkle, and hit effects into Legend runtime.
- Legend machine-side required final-art readiness reaches 8/8.
- Human visual-gold-standard review remains a separate mandatory gate.
- Converted v5.16 checks to capability-retention semantics for forward versions.

# 5.16.0-alpha — SNES UI Kit Pass

- Added original nine-slice SNES UI art, icon atlas, HUD/Rune/transition components, runtime binding, and 7/8 final-art readiness.

## 5.15.0-alpha — Larrina Tower Interior Pass
- Added 16 original reusable 16×16 Tower tiles.
- Added original 320×180 first-person Larrina Tower room composition.
- Bound Tower art into Tile Studio, Asset Forge, Runtime Composer, React cartridge source, and standalone preview.
- Legend final-art readiness advanced from 5/8 to 6/8.
- Converted v5.14 and public-release version checks into forward-compatible capability-retention gates.
- Shared UI kit and bounce effects remain pending.


## 5.14.0-alpha — Larrina Character + Portrait Pass
- Added original 24-frame 32×48 Princess Larrina gameplay sheet.
- Added four original 96×96 Larrina dialogue portraits.
- Bound both assets into Asset Forge with hashes and original-rights status.
- Added first-person Larrina Tower runtime packet and Wobble→Tower transition.
- Legend final-art readiness advanced from 3/8 to 5/8.
- Tower interior, UI kit and effects remain pending.

# Changelog

## 5.19.0-alpha — Legend Audio Pass
- Added four original loopable scene themes and six original event SFX.
- Added deterministic local audio generator, cue manifest, rights receipt and SHA-256 provenance.
- Bound audio to React and standalone runtime events with explicit user sound enablement.
- Added zero-install audio jukebox and v5.19 audio/Gold audit.
- Removed the machine-side missing-audio blocker; human listening/control/visual/content/value approval remains separate.

## 5.13.0-alpha — Wobble Woods Art Pass
- Added original 16×16 Wobble Woods terrain/object tiles.
- Added four original 672×180 parallax layers: far canopy, mist, near forest and foreground.
- Bound Wobble environment art into the side-view runtime and standalone preview.
- Promoted Legend required final-art readiness from 2/8 to 3/8.
- Preserved the human visual-gold-standard review boundary.

## v5.12.0-alpha — Legend SNES Content Pass

- Added the first real original production art to Legend: a 23-frame 32×48 More Bounce hero sheet.
- Added the first real original Bouncehome Grove 16×16 tileset and Tile Studio seed.
- Promoted `more-bounce-hero` and `bouncehome-overworld` to READY with repository paths, rights state, and SHA-256 provenance.
- Added v5.12 Bouncehome runtime packet bound to real hero/tile art.
- Added Wobble Woods side-view runtime seed with platform geometry, bounce pads, Bounce Rune goal, and return transition.
- Added a zero-install cross-mode preview: top-down Bouncehome → side-view Wobble Woods.
- Updated Legend React source to use the real hero sprite sheet and real Bouncehome map art.
- Preserved the truth boundary: Wobble environment art, Larrina, Tower, UI, and effects remain pending.
- Added v5.12 validation and full-preflight integration.

## v5.11.0-alpha — Runtime Composer

- Added first-class Runtime Composer modal workstation.
- Binds Sprite Studio animation frames to Tile Studio / Map Composer scenes.
- Added WASD / arrow movement with normalized diagonal speed.
- Added collision blocking from authored collision layers.
- Added camera-follow viewport, grid/collision debug overlays, and runtime-scene export.
- Added semantic preview boundary when final art is blank; placeholder visuals never count as Asset Forge readiness.
- Added additive runtimeComposer project persistence and runtime scene registry.
- Added v5.11 validation and full-preflight integration.

## v5.10.0-alpha — Tile Studio + Map Composer

- Added a full-screen 16×16 Tile Studio as the world-art companion to Sprite Studio.
- Added pencil, eraser, fill, eyedropper, line, rectangle, mirror, clear, undo, and redo tile tools.
- Added PixelForge SNES house palettes, semantic tile tags, walkability, and explicit autotile-group metadata.
- Added a tileset bank with new/duplicate/delete workflow and a blank SNES Grove production skeleton.
- Added the first Legend world-authoring seed: a 24×16 Bouncehome Grove layered map with explicit collision and eight deliberately blank SNES art slots.
- Added a layered Map Composer with `ground`, `decor`, and `collision` layers.
- Added map paint, erase, flood-fill, zoom, and scene-size presets.
- Added native tileset PNG export and portable map JSON export.
- Added rights-aware SHA-256 Asset Forge tileset receipts and project map attachment packets.
- Preserved the human-art boundary: autotile groups and valid map contracts do not imply finished or beautiful art.
- Preserved v5.0 project-storage compatibility by making `tileStudio` an additive optional contract.

## v5.9.0-alpha — Sprite Studio

- Added a built-in pixel-art editor as a first-class PixelForge module.
- Added pencil, eraser, fill, eyedropper, line, rectangle, mirror, clear, undo, and redo tools.
- Added SNES-oriented canvas presets from 16×16 tiles through 96×96 portraits, with 32×48 as the hero baseline.
- Added four PixelForge SNES house palettes plus custom color selection.
- Added multi-frame animation timeline, frame labels, duplication/deletion, onion skinning, FPS control, and live animation preview.
- Added horizontal sprite-sheet PNG export and animation-map JSON export.
- Added project Sprite Gallery attachment plus Asset Forge slot receipt with SHA-256 and declared rights status.
- Preserved the human visual-review boundary: tooling can prove structure/provenance, not artistic quality.

## v5.8.0-alpha — SNES Asset Forge

- Added the reusable PixelForge SNES House Foundation asset-pack contract.
- Added four explicit 16-color house palette files for overworld, forest, tower interior, and framed UI work.
- Added per-cartridge `asset-profile.json` with hero, NPC, portrait, tileset, interior, UI, effects, and audio slots.
- Added deterministic asset-profile validation and generated asset catalog receipts.
- Added per-slot production brief generation and a safe asset-attachment command with SHA-256 hashing and explicit rights state.
- Made newly generated cartridges inherit the SNES asset profile automatically.
- Added PocketGames asset-contract evidence for production candidates and a required-asset-content retail gate.
- Preserved the truth boundary: Legend is contract-ready, while final pixel-art content remains pending.

## v5.7.0-alpha — SNES Style Lock

- Froze SNES-first 16-bit as the default PixelForge visual lane.
- Added visual profile metadata and deterministic source-level style audit receipts.
- Added human visual-gold-standard signoff boundary.
- Upgraded Legend of More Bounce source toward PF_GOLD_STANDARD_001.

# Changelog

## 5.19.0-alpha — Legend Audio Pass
- Added four original loopable scene themes and six original event SFX.
- Added deterministic local audio generator, cue manifest, rights receipt and SHA-256 provenance.
- Bound audio to React and standalone runtime events with explicit user sound enablement.
- Added zero-install audio jukebox and v5.19 audio/Gold audit.
- Removed the machine-side missing-audio blocker; human listening/control/visual/content/value approval remains separate.

## v5.6.0-alpha — 369 PocketGames Production Candidate

- Added evidence-backed PocketGames release evaluation and production-candidate promotion.
- Added The Legend of More Bounce PocketGame manifest as Candidate #2 while preserving Journey as Candidate #1.
- Added declared-rights receipt generation with SHA-256 inventory.
- Added structured app-store metadata packet generation.
- Added PWA-style mobile-wrapper research build with offline cache manifest/service worker.
- Added mobile QA matrix that keeps physical-device tests explicitly pending.
- Added reproducible candidate packages with screenshots, playable build, evidence, governance files, candidate manifest, and SHA-256 ledger.
- Added optional human price-worthiness rating to local playtest receipts.
- Added explicit human store-art approval receipt command.
- Enforced the authority boundary: automation can grant production-candidate status, never paid retail release authorization.

Current Legend decision: **production-candidate-human-signoff-pending**. Machine gates pass; human price-worthiness and final store-art signoff remain open.

## v5.5.0-alpha — Community Cartridge Shelf

- Added a generated local-first cartridge catalog at `community/catalog.json`.
- Added a zero-install `community/index.html` shelf with local JSON import/export.
- Added visible rights, creator-credit, claim-boundary, mobile-readiness, and local-runtime review badges.
- Added deterministic per-cartridge community review receipts.
- Added explicit `CREDITS.md` provenance for the first featured learning cartridges.
- Added local human playtest receipt tooling with optional 1–5 ratings and notes.
- Kept automated browser evidence separate from subjective human ratings.
- Featured Journey to the Parallax Pyramid and The Legend of More Bounce as the first learning cartridges.
- Added v5.5 validator coverage and folded community review/shelf generation into `github:preflight`.

Boundary: v5.5 is a portable local catalog/receipt layer, not a hosted social network. Accounts, remote submissions, public chat, engagement ranking, hidden profiling, remote saves, and automatic publishing remain gated.

## v5.4.0-alpha — Creator Onboarding Polish

- Added `npm run new:cartridge -- "Game Title"` for safe one-command cartridge creation.
- Refreshed the starter cartridge UI with reusable, accessible React components and clearer first-minute guidance.
- Added a no-dependency Chrome/Chromium/Edge screenshot helper for Studio and built cartridge pages.
- Added mobile readability heuristics with a machine-readable QA receipt.
- Added an original starter SVG asset pack with explicit rights notes.
- Rewrote the first-cartridge tutorial around a Windows/macOS/Linux-friendly Node workflow.
- Added v5.4 validator coverage and included it in the public preflight.
- Aligned visible Studio branding and engine metadata to v5.4 while retaining the v5.0 project schema/storage keys for compatibility.

Boundary: networking, public accounts, free-text chat, remote saves, app-store signing, hidden profiling, and unreviewed public publishing remain gated.

## v5.3.0-alpha — Public GitHub Launch Kit

- Reframed PixelForge as a public-ready open-source forge with sample cartridges and a 369 PocketGames premium output lane.
- Rewrote the public README with quick start, creator path, launch boundaries, and license/content notes.
- Added first-cartridge tutorial at `docs/MAKE_YOUR_FIRST_CARTRIDGE.md`.
- Added cartridge submission rules at `docs/CARTRIDGE_SUBMISSION_RULES.md`.
- Added maintainer release playbook and public roadmap.
- Added starter cartridge template at `games/_template/`.
- Added GitHub issue templates, pull request template, and validation workflow.
- Added public release validator and repo index generator.
- Added `LICENSE-CONTENT-NOTICE.md` to clarify the source-code/content rights split.
- Added `npm run github:preflight` as the public launch acceptance command.

Boundary: this release prepares a public GitHub repository. It does not enable production multiplayer, public chat, account systems, hidden profiling, remote save sync, app-store signing, or automatic public publishing.

## v5.2.0-alpha — 369 PocketGames Export Alpha

- Added the 369 PocketGames mobile micro-game export lane.
- Added the Journey to the Parallax Pyramid PocketGame manifest.
- Added PocketGame manifest template and schema notes.
- Added PocketGame validator, store-page generator, and mobile QA receipt generator.
- Added GitHub launch checklist, open-source community wave plan, contributing guide, code of conduct, and licensing/rights notes.
- Added PWA/mobile manifest metadata and a placeholder SVG app icon for the Journey demo.
- Updated README and package metadata for public/community positioning.

## v4.8 — Final RC Assembly Alpha

- Added Final RC Assembly Desk.
- Added Release Packet Index.
- Added Checksum Manifest.
- Added Beta Release Notes.
- Added Launch Guide.
- Added Signoff Checklist.
- Added Human Review Queue.
- Added v5 Candidate Packet.
- Added tiles: finalrc, packetindex, checksum, releasenote, launchguide, signcheck, reviewqueue, v5packet.
- Updated schema, validator, tests, README, roadmap, docs, package metadata, and demo JSON.

# Changelog

## 5.19.0-alpha — Legend Audio Pass
- Added four original loopable scene themes and six original event SFX.
- Added deterministic local audio generator, cue manifest, rights receipt and SHA-256 provenance.
- Bound audio to React and standalone runtime events with explicit user sound enablement.
- Added zero-install audio jukebox and v5.19 audio/Gold audit.
- Removed the machine-side missing-audio blocker; human listening/control/visual/content/value approval remains separate.

## v4.7 — RC Hardening Alpha

- Added RC Hardening Dashboard.
- Added Artifact Verification Ledger.
- Added Blocker Closure Board.
- Added Beta Receipt Quorum.
- Added Final Regression Sweep.
- Added Build Provenance Manifest.
- Added Release Owner Signoff Gate.
- Added v5 RC Hardening Manifest.
- Added tiles: rcharden, verifyledger, closureboard, receiptquorum, finalsweep, provenance, signoffgate, rcmanifest.
- Updated schema, validator, tests, README, roadmap, and demo JSON.

# Changelog

## 5.19.0-alpha — Legend Audio Pass
- Added four original loopable scene themes and six original event SFX.
- Added deterministic local audio generator, cue manifest, rights receipt and SHA-256 provenance.
- Bound audio to React and standalone runtime events with explicit user sound enablement.
- Added zero-install audio jukebox and v5.19 audio/Gold audit.
- Removed the machine-side missing-audio blocker; human listening/control/visual/content/value approval remains separate.

## v4.6 Private Beta Operations Alpha

- Added Beta Operations Console.
- Added Beta Session Ledger.
- Added Tester Cohort Dashboard.
- Added Feedback Digest.
- Added Issue Trend Board.
- Added Release Candidate Assembler.
- Added v5 Go/No-Go Review.
- Added v4.6 operations marker tiles and validator coverage.


## v4.6 Private Beta Operations Alpha

- Added Private Beta Operations Desk.
- Added Tester Onboarding Runbook.
- Added Feedback Receipt Inbox.
- Added Known Issue Triage.
- Added Beta Exit Criteria and v5 Readiness Gate.
- Added v4.6 beta handoff marker tiles and validator coverage.


## v4.6 — Private Beta Operations

- Added Beta Lock Dashboard.
- Added Schema Freeze Ledger.
- Added Release Blocker Board.
- Added Tester Handoff Packet.
- Added Regression Test Matrix.
- Added v5 Private Beta Candidate Manifest.
- Added beta-lock tiles and validator/test coverage.



## v4.6 Private Beta Operations

- Added Beta Lock Dashboard.
- Added First-Run Tutorial Flow.
- Added UX Polish Board.
- Added Accessibility Pass.
- Added Beta Readiness Scorecard.
- Added v5 Polish Queue.
- Added v4.6 polish marker tiles: polish, tutorial, uxcheck, access, betaready, shinegate.
- Updated schema, demo project, validator, tests, manual docs, and package metadata.


## v4.6.0-alpha — Private Beta Operations

- Added Private Relay Bridge.
- Added Signed Pack Bridge.
- Added Trust Circle Router.
- Added Sync Dry-Run Lab.
- Added Beta Gate Preflight.
- Added v4.6 marker tiles and validation coverage.
- Updated schema, tests, docs, README, package metadata, and demo JSON.

## v4.1.0-alpha — Shared Playtests Alpha

- Added Shared Playtest Hub.
- Added Playtest Invite Desk.
- Added Feedback Card Board.
- Added Co-Play Scoreboard.
- Added Road to v5.0 checkpoint tracker.
- Added v4.1 marker tiles and validation coverage.
- Updated schema, tests, docs, README, package metadata, and demo JSON.


## v4.0 Creator OS Alpha

- Added Creator OS Dashboard.
- Added Cartridge Lifecycle.
- Added AI Agent Orchestrator.
- Added Experience Map.
- Added Release Train.
- Added System Codex.
- Added Creator OS tiles and validation/tests.

## v4.0.0-alpha — Creator OS

- Added Starter Cartridge Builder.
- Added Route Map Preview.
- Added Region QA Pass.
- Added World Launch Checklist.
- Added AI World Scout.
- Added launchpad marker tiles: startercart, routemap, qapass, launchcheck, scoutpath, worldreceipt.
- Updated schema, validator, tests, README, and manual docs.


## v4.0 Creator OS Alpha

- Added Sanctuary Arcade Hub connecting Shelf, Couch, Porch, BBS, and Playtest Theater.
- Added Couch Quest Board for guided no-chat co-play missions.
- Added Companion Arcade Modes: Watch Party, Score Run, Bug Raccoon, and Lore Owl.
- Added AI Host Rotation for visible route/tone/bug/lore host roles.
- Added Cozy Session Rewards for finishing, helping, gratitude, and clarity.
- Added exports for Arcade Hub, Couch Quest Board, Companion Modes, Host Rotation, and Rewards.


## v4.0.0-alpha — Commons Rooms + Pack Exchange

- Added Commons Room Boards.
- Added Commons Pack Exchange.
- Added Commons Share Ledger.
- Added Commons Trust Circles.
- Added Commons Moderation Queue.
- Added v4.0 validators, tests, schema updates, and demo metadata.


## v3.3 Infinite Commons Bridge Alpha

- Added Infinite Commons Bridge for mapping earlier Commons/Porch concepts into PixelForge.
- Added Commons Feed Curator with finite 9/6/3 curation windows.
- Added Commons Rooms for BBS/channel governance.
- Added Commons Resonance signals and anti-vanity metrics.
- Added Commons Pack + Sync planning manifests.
- Added validator/tests for the new community substrate.


## v4.0 Porch Sanctuary Bridge

Adds Porch-derived AI companion support: Brother Presence, Memory Garden, Gratitude Wall, GTSP soft-flag protection planning, and Secure Layer planning hooks. The source modules are packaged in `porch_sources/` for review and future integration. Boundary: local-first planning and visible project memory only; no consciousness claims, hidden profiling, live screen monitoring, or network sync is enabled by this static browser alpha.


## v4.0 Creator OS

Adds Porch Home Runtime, Sanctuary Rituals, AI Care Loop, Companion Consent Ledger, and Porch Well Snapshot exports. This makes the AI bench feel more like a visible, bounded, cozy companion home while preserving local-first, no-chat, no-hidden-profiling, and no-consciousness-claim boundaries.


## v4.0 — Creator OS Alpha

- Added Creator OS station flow.
- Added World Seed Forge, Route Weaver, Region Card Rack, Questline Composer, and World Bible.
- Added six world-builder marker tiles.
- Added exports for each world-builder subsystem.
- Updated schema version, validator, tests, README, manual, roadmap, and architecture notes.


## v4.9 — Launch Rehearsal + Signoff Gate Alpha

- Added Launch Rehearsal Desk.
- Added Beta Dress Rehearsal.
- Added Rollback Playbook.
- Added Tester Packet Sampler.
- Added Go / No-Go Dry Run.
- Added v5 Launch Approval Gate.
- Added Private Beta Notice Draft.
- Added v4.9 validation and regression tests.


## v5.0 — Private Beta

- Added v5.0 Private Beta Dashboard.
- Added Trusted Tester Welcome Desk.
- Added Beta Artifact Pack.
- Added Private Beta Playtest Cycle.
- Added v5 Safety Launch Locks.
- Added Feedback Receipt Workflow.
- Added Private Beta Manifest.
- Added Gratitude Closeout.
- Added v5.0 validation and regression tests.

## v5.1 — Journey Demo Cartridge Candidate

- Added bundled demo game candidate: **Journey to the Parallax Pyramid**.
- Wrapped uploaded React game source as `games/journey-to-parallax-pyramid/`.
- Added Vite/Tailwind project wrapper for the game cartridge.
- Added cartridge manifest at `data/journey_to_parallax_pyramid.v5.1.cartridge.json`.
- Added public release checklist and public repo prep notes.
- Kept public release boundaries clear: local-first, no accounts, no public BBS, no free-text chat, no remote saves.
