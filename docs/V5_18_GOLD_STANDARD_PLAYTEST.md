# PixelForge v5.18 — Legend Gold Standard Playtest

v5.18 changes the question from **"are all required assets present?"** to **"does the cartridge actually feel good and earn further release work?"**

## What v5.18 changes

- Adds a real completed-run state after the fourth Larrina Tower dialogue beat.
- Adds a forgiving 16-bit side-view control profile: acceleration/deceleration, 100 ms coyote time, 120 ms jump buffering, and variable jump height.
- Adds local-only run metrics to the zero-install playable: completion time, jumps, bounce-pad hits, falls, Rune timing, dialogue advances, and restarts.
- Adds a downloadable run receipt. Nothing is transmitted over a network.
- Adds a deterministic Gold Standard audit without pretending it can measure fun or beauty.
- Adds a human Gold Standard review recorder with explicit approvals rather than inferred approval.

## Current truth boundary

Machine-side final-art readiness remains **8/8**. That does **not** mean the game is Gold Standard approved or retail ready.

Current known blockers include:

1. Human control-feel review.
2. Human visual-gold-standard review.
3. Real SNES-inspired music/SFX: no audio files currently exist in the Legend cartridge.
4. Commercial content-depth review: the current build remains a compact vertical slice.
5. Human $3.69 price-worthiness receipt.
6. Final store-art approval.

## Playtest commands

```bash
npm run legend:gold:preview
npm run legend:gold:audit
npm run legend:gold:review -- --tester "Name" --controls 1 --fun 1 --clarity 1 --visuals 1 --pacing 1 --replay 1 --content-depth 1 --price-worthiness 1 --gold-visual no --controls-approved no --content-depth-approved no --notes "..."
```

The review command must only be run with ratings and approvals actually supplied by the named human tester.
