# The Legend of More Bounce

## v5.7 SNES Gold Standard source

This cartridge is `PF_GOLD_STANDARD_001`, the first source-level proof of PixelForge's SNES-first 16-bit house lane. It declares the visual profile in `cartridge.meta.json` and must pass `npm run style:check -- games/the-legend-of-more-bounce`. Passing the deterministic audit does not replace final human visual review.


**PixelForge Studio v5.4 proof cartridge**

A small original Parallax adventure built to prove that one PixelForge cartridge can preserve shared game state while switching among three presentation modes:

1. **Top-down overworld** — choose destinations on a compact world map.
2. **Side-view action** — move, jump, collect the Bounce Rune, and reach the Echo Gate.
3. **First-person interaction** — inspect a room and talk with Princess Larrina.

The prototype ends after the three modes reconnect into one world. It deliberately stays tiny so the architecture is testable before the full campaign is designed.

## Run

```bash
npm install
npm run dev
```

## Controls

Side-view mode supports **A/D**, **Left/Right arrows**, and **W / Up / Space** to bounce. Touch controls are visible on small screens.

## PixelForge contract exercised

- generated from `games/_template`,
- local-only runtime,
- responsive / touch-friendly controls,
- shared React state across presentation modes,
- stable `?capture=1` screenshot mode,
- no accounts,
- no ads,
- no tracking,
- no loot boxes.

## Rights

All code, visual shapes, characters, names, dialogue, and world material in this cartridge are original PixelForge / Parallax prototype content. See `RIGHTS.md` and the repository content-rights notice before redistribution.


## v5.12 content pass

The cartridge now includes an original 23-frame More Bounce hero sheet, an original eight-tile Bouncehome Grove set, a real-art top-down runtime packet, and a side-view Wobble Woods runtime seed. Remaining art roles stay explicitly pending.


## v5.13 Wobble Woods Art Pass

Wobble Woods now binds original PixelForge 16×16 terrain/object tiles plus separate far-canopy, mist, near-tree, and foreground layers. Asset Forge readiness is 3/8 required final-art roles. Human visual-gold-standard review remains pending.


## v5.14 Larrina Character + Portrait Pass

Princess Larrina now has original repository-bound 32×48 character animation and four 96×96 portraits. Both required Asset Forge roles are READY. The Tower interior, shared UI kit and bounce-effects sheet remain pending final art.

## v5.15 Tower interior
Larrina Tower now uses original 16×16 reusable interior tiles plus a composed 320×180 first-person room. Shared UI frames and bounce effects remain pending final-art roles.

## v5.23 — The Iron Orchard
Chapter Three adds Rivet Row as a revisit hub, Tessa Coil's required Gear Apple → Resonance Bracer trade, Bram Gearroot's optional Wrench Charm → Heart Rivet quest, Rustroot Cavern, armored Rustlings, the Rustbloom Warden, and the Iron Blossom reward. Machine checks do not substitute for human hub/combat/value review.
