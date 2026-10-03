# PixelForge v5.5 Community Cartridge Shelf — Build Receipt

**Build:** `5.5.0-alpha`
**Date:** 2026-08-13
**Baseline:** PixelForge v5.4 Creator Onboarding + The Legend of More Bounce proof cartridge

## Delivered

- local-first generated cartridge catalog,
- zero-install community shelf HTML,
- local JSON shelf import/export,
- creator credits view,
- deterministic rights / credits / claim / mobile / runtime badges,
- featured learning cartridges: Journey to the Parallax Pyramid and The Legend of More Bounce,
- explicit local human playtest receipt CLI,
- automated-browser playtest receipt support,
- v5.5 community review receipts,
- v5.5 validator and updated public preflight,
- explicit mobile guardrails added to Journey rather than weakening the mobile gate.

## Acceptance evidence

- Root project validator suite: PASS.
- Journey cartridge JSON validation: PASS.
- 369 PocketGames manifest/store/mobile-QA pipeline: PASS.
- Starter cartridge mobile readability: 8/8 PASS.
- Journey mobile readability: 8/8 PASS.
- Legend mobile readability: 8/8 PASS.
- Journey community review: PASS all six deterministic checks.
- Legend community review: PASS all six deterministic checks.
- Community shelf generation: PASS; 2 cartridges, 2 featured learning cartridges.
- v5.5 validator: PASS.
- public release validator: PASS.
- full `npm run github:preflight`: PASS.
- human playtest CLI smoke test: PASS; temporary receipt created, verified, then removed.
- generated shelf inline JavaScript syntax: PASS (`node --check`).

## Browser note

A new screenshot attempt for the v5.5 shelf did not terminate reliably under the container's headless Chromium setup, so no visual-browser-render claim is added to this receipt. The shelf is zero-install HTML, its generated inline JavaScript parses cleanly, and the deterministic v5.5 validation/preflight gates pass.

## Governance boundary

v5.5 remains local-first. It does not enable public accounts, remote submission ingestion, free-text public chat, hidden profiling, engagement ranking, remote save overwrite, automatic public publishing, or app-store signing.

## Next roadmap target

**v5.6 — 369 PocketGames Production Candidate:** mobile wrapper research, production asset/export checklist, app-store metadata packet, full rights receipt, mobile QA matrix, and first polished candidate decision.
