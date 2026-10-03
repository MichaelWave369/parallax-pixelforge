# PixelForge Starter Cartridge

This is the smallest useful PixelForge cartridge template: a complete tiny loop with reusable UI components, responsive styling, explicit rights notes, and no network dependency.

It demonstrates:

- a tiny three-scene loop,
- touch-friendly action buttons,
- visible keyboard focus,
- phone safe-area support,
- reduced-motion support,
- a stable `?capture=1` presentation mode for screenshots,
- no accounts,
- no ads,
- no hidden tracking.

## House visual default

New PixelForge cartridges are generated into the **16-bit / SNES-adventure** lane by default. That means richer palettes, expressive sprites, layered scenes, framed UI, and deliberate animation. Ultra-minimal 8-bit/Atari-style presentation is an opt-in lane, not the house baseline.

The generator writes the visual profile into `cartridge.meta.json`. Once your cartridge has real game-world art, run:

```bash
npm run style:check -- games/my-tiny-game
```

A source-audit pass is not a human art approval.

## Recommended: generate instead of copying

From the PixelForge repo root:

```bash
npm run new:cartridge -- "My Tiny Game"
```

That safely copies this template, renames the package/title, and creates `cartridge.meta.json`.

## Run this template directly

```bash
npm install
npm run dev
```

## Build your first tiny game

Change the scenes in:

```text
src/main.jsx
```

Start with:

```text
1 room + 1 mechanic + 1 feeling + 1 ending
```

Then check it from the repo root:

```bash
npm run check:mobile -- games/my-tiny-game
```

Finish small. Then make another.
