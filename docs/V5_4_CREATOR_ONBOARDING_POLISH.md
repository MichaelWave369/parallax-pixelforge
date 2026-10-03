# PixelForge v5.4 — Creator Onboarding Polish

## Purpose

v5.4 makes the first successful PixelForge creation session dramatically simpler without expanding public trust boundaries.

The goal is not "more engine." The goal is: a new creator can generate a tiny cartridge, understand the starter code, run it, check phone readability, capture a clean screenshot, and know what to do next.

## Release contract

```text
idea
  ↓
npm run new:cartridge
  ↓
small playable loop
  ↓
mobile/readability check
  ↓
rights notes
  ↓
screenshot / build evidence
  ↓
reviewable cartridge
```

## v5.4 additions

### 1. One-command cartridge generator

```bash
npm run new:cartridge -- "My Tiny Game"
```

The generator:

- copies `games/_template/`,
- creates a safe folder slug,
- refuses to overwrite an existing cartridge,
- renames package/title metadata,
- creates `cartridge.meta.json`,
- prints the exact next commands.

It uses Node only, so the same command works on Windows, macOS, and Linux.

### 2. Starter UI component pass

The starter cartridge now demonstrates a small reusable component vocabulary rather than one monolithic card:

- cartridge header,
- game title/identity line,
- progress dots,
- story card,
- action buttons,
- creator tip,
- tiny-loop footer.

The template remains intentionally small enough for a beginner to read in one sitting.

### 3. Mobile readability receipt

```bash
npm run check:mobile -- games/my-tiny-game
```

The checker looks for high-value baseline signals such as:

- responsive viewport metadata,
- 44px+ touch targets,
- responsive content width,
- small-screen media rules,
- visible keyboard focus,
- reduced-motion support,
- phone safe-area handling.

It writes a machine-readable receipt under `exports/qa/`.

This is a heuristic preflight, not a substitute for real-device testing.

### 4. Screenshot helper

For the static PixelForge Studio shell:

```bash
npm run screenshot -- . exports/screenshots/pixelforge-studio.png
```

For a Vite cartridge, build it first and capture the built directory:

```bash
cd games/my-tiny-game
npm run build
cd ../..
npm run screenshot -- games/my-tiny-game/dist exports/screenshots/my-tiny-game.png
```

The helper detects Chrome, Chromium, or Microsoft Edge and uses a temporary browser profile. `CHROME_PATH` can override browser detection.

Viewport overrides:

```bash
npm run screenshot -- . exports/screenshots/studio-mobile.png --width=430 --height=932
```

### 5. Original starter asset pack

`assets/starter-pack/` contains two tiny SVG teaching assets with explicit rights notes. They are intentionally generic and replaceable.

The template bundles copies under `public/starter-assets/` so a generated cartridge works without external asset calls.

### 6. Beginner documentation pass

`docs/MAKE_YOUR_FIRST_CARTRIDGE.md` now begins with the generator path instead of platform-specific copy commands and separates the "make it playable" gate from later polishing.

## Compatibility decision

The visible Studio shell and engine version advance to v5.4, but existing local project storage keys and the project schema remain on the v5.0 contract for this release.

This avoids silently breaking saved local projects merely to make the version labels match.

A future schema migration must be explicit and receipt-backed.

## Acceptance gates

From the repository root:

```bash
npm run github:preflight
```

v5.4 additionally requires:

```bash
npm run validate:v5.4
npm run check:mobile -- games/_template
```

A release candidate should also prove the generator without leaving test clutter in `games/`.

## Boundaries unchanged

v5.4 does not enable:

- public accounts,
- public networking,
- free-text co-play chat,
- remote save overwrite,
- hidden profiling,
- automatic community publishing,
- app-store production signing,
- unreviewed AI-generated or third-party assets.

The creator gets more leverage. The trust boundary does not get looser.
