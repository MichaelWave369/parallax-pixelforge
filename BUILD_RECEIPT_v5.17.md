# PixelForge v5.17 — Build Receipt

## Release

- Package: `parallax-pixelforge`
- Version: `5.17.0-alpha`
- Milestone: **Bounce Effects Pass**
- Legend cartridge: **The Legend of More Bounce v0.8 — All Final Art Candidate**

## What changed

- Added original 20-frame, native 32×32 effects sheet.
- Added five animation states: `bounce-impact`, `rune-pickup`, `gate-open`, `sparkle`, `hit`.
- Added Sprite Studio effects authoring seed.
- Added rights/hash art receipt and animation-map provenance.
- Bound effects into Wobble Woods runtime triggers.
- Bound effects into Larrina Tower Rune emphasis.
- Updated the React cartridge to consume the real effect sheet.
- Promoted Asset Forge required final-art readiness from **7/8 to 8/8**.
- Converted v5.8 and v5.16 historical checks to capability-retention semantics where later real content had made old “must remain pending” assertions obsolete.

## Machine evidence

- Effects sheet: `640×32` = **20 × 32×32 frames**.
- Bounce impact: 4 frames.
- Rune pickup: 4 frames.
- Echo Gate open: 5 frames.
- Sparkle: 4 frames.
- Hit: 3 frames.
- Effects rights: **original**.
- Effects SHA-256 binding: **PASS**.
- Effects animation-map SHA-256 binding: **PASS**.
- Wobble runtime effect triggers: **5/5 bound**.
- Tower effects binding: **PASS**.
- Required Legend final-art roles: **8/8 READY**.

## Full factory verification

`npm run github:preflight` — **PASS** on the v5.17 content tree before packaging.

The final renamed `parallax-pixelforge-v5.17` directory is re-run through the same full preflight before ZIP creation.

## Evidence boundary

**8/8 READY means machine-side required asset completeness only.** It does not automatically grant:

- human visual-gold-standard approval,
- fun/value playtest approval,
- $3.69 worthiness approval,
- store-art signoff,
- physical-device QA,
- retail release authorization.

Those remain explicit human/release gates.
