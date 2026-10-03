# Parallax PixelForge v5.4 — Build Receipt

## Recovery source

Recovered from the user-provided `Parallax_PixelForge_v5_3_Public_GitHub_Launch_Kit(1).zip` and advanced in a separate working copy.

The recovered v5.3 source was preserved as the baseline; no in-place overwrite of the uploaded archive occurred.

## Recovery findings

- Recovered source contained the full static PixelForge Studio shell, long-form v4/v5 documentation history, validators, PocketGames tools, starter template, Journey demo cartridge, Porch source review bundle, exports, and tests.
- The recovered package declared `5.3.0-alpha` while the visible Studio shell still displayed v4.6 and the internal engine constant declared v5.0.
- The v5.3 `npm run github:preflight` passed before the v5.4 work began.

## v5.4 changes

- Added one-command cartridge generation.
- Refreshed starter cartridge components and responsive styling.
- Added mobile readability QA receipts.
- Added Chrome/Chromium/Edge screenshot helper with bounded timeout behavior.
- Added original MIT-covered starter SVG assets plus explicit rights notes.
- Rewrote beginner cartridge documentation for a cross-platform Node workflow.
- Added v5.4 release doc, validator, changelog entry, and preflight gates.
- Aligned visible shell + engine version to v5.4 while intentionally retaining the v5.0 project schema/storage identifiers for saved-project compatibility.

## Verification performed

The following completed successfully in this build workspace:

```text
npm test
npm run validate:demo
npm run validate:journey-cartridge
npm run pocketgames:all
npm run generate:repo-index
npm run check:mobile -- games/_template
npm run validate:v5.4
npm run validate:public-release
npm run github:preflight
```

Generator smoke test:

```text
npm run new:cartridge -- "V54 Smoke Test"
npm run check:mobile -- games/v54-smoke-test
```

The generated smoke-test cartridge was then removed so it is not shipped as project content.

## Screenshot-helper environment note

The helper is implemented for normal desktop Chrome/Chromium/Edge use and includes browser auto-detection plus a 20-second timeout. The isolated build container's Chromium process does not successfully enter headless rendering because its Linux DBus/browser environment is incomplete, so an actual screenshot artifact was not used as a release gate here.

On the user's Windows machine, Chrome or Edge can be selected automatically or explicitly with `CHROME_PATH`.

## GitHub state

The existing public GitHub repository is a deliberately trimmed v5.3 public shell and should not be treated as a complete backup of this recovered source.

Recommended sync pattern:

1. preserve `main`,
2. create a v5.4 source-sync branch,
3. add the recovered/full files,
4. review rights/private boundaries,
5. run GitHub Actions,
6. merge only after the diff is understood.
