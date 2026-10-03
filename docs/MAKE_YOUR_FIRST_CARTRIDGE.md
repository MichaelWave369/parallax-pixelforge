# Make Your First PixelForge Cartridge

A PixelForge cartridge should be tiny enough to finish and charming enough to remember.

You do **not** need to understand all of PixelForge Studio before making your first game.

## The fastest path

From the PixelForge repo root:

```bash
npm run new:cartridge -- "My Tiny Game"
```

That creates:

```text
games/my-tiny-game/
```

PixelForge will not overwrite a cartridge folder that already exists.

## Run it

```bash
cd games/my-tiny-game
npm install
npm run dev
```

Open the local address Vite prints in the terminal.

Windows PowerShell, macOS Terminal, and Linux shells can all use the same generator command because the copy/rename work is handled by Node.

## Change only three things first

Open:

```text
src/main.jsx
```

For your first pass, change only:

1. `CARTRIDGE_TITLE`,
2. the scene text,
3. the action labels and destinations.

Do not build your inventory system, skill tree, world map, multiplayer server, crafting economy, and twelve-biome campaign yet. 😄

Get one loop playable first.

## Tiny cartridge formula

```text
1 room + 1 mechanic + 1 feeling + 1 ending = ship the first build
```

Good first loops:

- find one object,
- talk to one character,
- solve one tiny mystery,
- deliver one item,
- survive one funny minute,
- repair one machine,
- choose one ending.

## First-minute check

A player should quickly understand:

- **What am I?**
- **What can I do?**
- **Why is this charming or interesting?**
- **What happens if I keep playing?**

If those answers are unclear, simplify before adding content.

## Phone readability check

From the PixelForge repo root:

```bash
npm run check:mobile -- games/my-tiny-game
```

PixelForge writes a receipt under:

```text
exports/qa/
```

This catches baseline issues. Still test the actual game in a narrow browser window and on a real phone when possible.

## Screenshot mode

The starter template supports:

```text
?capture=1
```

That hides the creator-tip panel for a cleaner game screenshot.

To capture a built cartridge automatically:

```bash
cd games/my-tiny-game
npm run build
cd ../..
npm run screenshot -- games/my-tiny-game/dist exports/screenshots/my-tiny-game.png
```

To capture the PixelForge Studio shell itself:

```bash
npm run screenshot -- . exports/screenshots/pixelforge-studio.png
```

Chrome, Chromium, or Microsoft Edge is required. Set `CHROME_PATH` if PixelForge cannot find your browser.

## Keep assets clean

Use only:

- original assets,
- CC0/public-domain assets,
- assets with a compatible license,
- assets you have permission to use.

Do not use ripped sprites, franchise characters, copyrighted music, or random web images.

A tiny original starter pack is available at:

```text
assets/starter-pack/
```

The generated template already contains copies of those teaching assets.

## Keep rights notes current

Update:

```text
games/my-tiny-game/RIGHTS.md
```

Record where non-original art, audio, fonts, text, and code came from and what license allows you to ship them.

## PocketGames comes later

Only add a `pocketgames/*.pocketgame.json` manifest when the game is genuinely ready for mobile/premium review.

A 369 PocketGames candidate should be complete, offline-playable, no-ads, no-traps, readable on a phone, and worth an honest paid-once price.

## Root checks

From the repo root:

```bash
npm run github:preflight
```

For a specific new cartridge, also run:

```bash
npm run check:mobile -- games/my-tiny-game
```

## Share when the loop is real

Use the cartridge submission issue template or open a pull request. Keep the pitch simple:

- what the game is,
- how to run it,
- what assets it uses,
- what feedback you want.

Finish small. Then make another.

## Visual lane: SNES-first by default

`npm run new:cartridge` now declares the PixelForge house profile: `16-bit / snes-adventure / expressive-pixel`. Treat the starter UI as scaffolding, not the final art ceiling. Mainline adventures should grow toward expressive sprites, layered environments, framed UI, and scene-specific visual identity. Choose 8-bit explicitly when you actually want it.
