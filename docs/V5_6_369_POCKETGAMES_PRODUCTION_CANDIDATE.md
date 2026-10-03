# PixelForge v5.6 — 369 PocketGames Production Candidate

v5.6 turns the v5.5 review/playtest layer into an evidence-backed production handoff.

## First production proof

**The Legend of More Bounce** is 369 PocketGames Candidate #2 and the first cartridge sent through the complete v5.6 promotion pipeline.

Candidate #1, **Journey to the Parallax Pyramid**, keeps its historical candidate number and remains the original PocketGames learning manifest.

## Promotion pipeline

```text
cartridge
  -> PocketGame manifest
  -> community review
  -> mobile readability receipt
  -> declared-rights receipt + hashes
  -> automated browser proof
  -> store metadata packet
  -> mobile-wrapper research build
  -> mobile QA matrix
  -> release decision
  -> reproducible production-candidate package
```

Run the Legend lane:

```bash
npm run pocketgames:promote
```

## Authority boundary

Automated evidence may promote a cartridge to **production candidate**.

Automated evidence may **not** authorize a paid public retail release.

Two gates remain explicitly human-controlled:

1. **$3.69 worthiness** — a named human playtester must rate/explain the value of the finished build.
2. **Final store art** — a named human reviewer must approve the icon, feature graphic, and final screenshot presentation.

Until both are present, the release decision must remain:

```text
production-candidate-human-signoff-pending
```

## Mobile wrapper lane

v5.6 creates a PWA-style research wrapper around the already validated standalone cartridge. It includes:

- a web app manifest,
- offline cache service worker,
- local install profile,
- original PixelForge SVG placeholder icon,
- explicit note that this is not a signed app-store binary.

Physical Android/iPhone install testing remains a human-device gate.

## Candidate package

The generated package contains:

- standalone playable,
- PWA research wrapper,
- four gameplay screenshots,
- store text and structured store metadata,
- rights and credits declarations,
- rights declaration receipt with SHA-256 hashes,
- community review evidence,
- mobile readability evidence,
- mobile QA matrix,
- automated browser proof,
- release decision,
- candidate file manifest,
- SHA-256 ledger.

The package is intentionally auditable and portable.
