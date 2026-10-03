# The Legend of More Bounce — Tri-View Proof Test Receipt

**Cartridge:** `games/the-legend-of-more-bounce/`
**Version:** 0.1.0
**PixelForge baseline:** v5.4.0-alpha
**Status:** Browser-tested proof candidate

## Purpose

Prove that one PixelForge cartridge can carry shared game state across three distinct presentation modes without changing worlds or resetting the player's key progression state.

## Implemented flow

1. Top-down overworld: Bouncehome Grove → Wobble Woods.
2. Side-view action: move/bounce, collect the Bounce Rune, open Echo Gate.
3. First-person interaction: inspect Larrina Tower, choose dialogue, raise the rune.
4. Ending: confirm all three views reconnect as one shared world.

## Validation evidence

- JSX parser: PASS (TypeScript JSX parser, zero parse diagnostics)
- CSS brace balance: PASS (169 opening / 169 closing braces)
- PixelForge mobile-readability gate: PASS 8/8
- Full PixelForge `npm run github:preflight`: PASS after cartridge integration
- Standalone zero-install HTML export created
- Automated Chromium playthrough: PASS
- Browser page errors during automated playthrough: 0

## Automated browser path exercised

`Overworld → Follow Trail → Enter Wobble Woods → move right → collect Bounce Rune → Enter Echo Gate → inspect Moon Window → ask about kingdom → Raise Bounce Rune → Legend ending`

Screenshots for all four states are stored in `exports/playable/screenshots/`.

## Environment note

A fresh `npm install` for the Vite cartridge stalled in the execution environment, so no Vite production-build claim is made here. The standalone HTML export was used for the end-to-end browser test and completed successfully.
