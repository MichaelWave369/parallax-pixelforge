# PixelForge v5.6 Build Receipt — 369 PocketGames Production Candidate

Date: 2026-08-13

## Baseline

Source lineage: PixelForge v5.5 Community Cartridge Wave Candidate.

## Added in v5.6

- The Legend of More Bounce 369 PocketGames manifest (Candidate #2).
- Release evaluator with machine-vs-human authority boundary.
- Declared-rights receipt with SHA-256 file inventory.
- Structured store metadata packet.
- PWA-style mobile-wrapper research build.
- Mobile QA matrix with physical-device rows explicitly pending.
- Reproducible production-candidate package builder.
- Candidate manifest and SHA-256 ledger.
- Human price-worthiness field in playtest receipts.
- Explicit named-reviewer store-art approval command.
- v5.6 docs, roadmap, Studio/version labels, validator, and preflight integration.

## Acceptance evidence

`npm run github:preflight` — PASS.

This includes:

- root project-validator regression suite,
- v5.0 demo validation,
- Journey cartridge JSON validation,
- Journey and Legend PocketGame manifest/store/mobile generation,
- v5.4 mobile readability checks for template, Journey, and Legend,
- v5.5 community review for Journey and Legend,
- v5.5 community shelf generation,
- v5.6 Legend release evaluation,
- v5.6 production-candidate package build,
- v5.6 validator,
- public-release validator.

## Current Legend release decision

- Production candidate: PASS
- Retail release ready: NO
- Status: `production-candidate-human-signoff-pending`

Remaining explicit human gates:

1. $3.69 price-worthiness playtest signoff.
2. Final store-art signoff.

Physical Android/iPhone install/reopen checks also remain visible in the mobile QA matrix as human-device tests rather than being silently assumed.

## Governance note

Automated evidence is authorized to package and promote a game into the production-candidate lane. It is not authorized to approve a paid public retail release.
