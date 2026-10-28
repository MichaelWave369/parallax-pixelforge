# GDevelop Native Browser Gameplay Acceptance v2

After successful native GDevelop 5.6.285 HTML5 exports, this addition tests actual generated runtime scene objects in Chromium.

## Acceptance

- The same three original-only PixelForge projects: plain, hide E, and show Space, exported by the real GDevelop desktop CLI.
- A verified GDevelop editor compiles `game.json` with diagnostic blocking enabled.
- A temporary test-only instrumentation line exposes the locally loaded `gdjs.RuntimeGame` in the ephemeral built index.html. It does not alter exported PixelForge source or production build outputs.
- Playwright runs the generated HTML5 game in actual headless Chromium; examines `game.getSceneStack().getCurrentScene().getObjects()` and `isVisible()` on the source-mapped game object, including object count.
- The hide scenario checks that an unrelated key does not affect it and E hides it.
- The show scenario first hides the real object and then verifies that Space shows it.
- The plain scene must create its native objects and a canvas with actual dimensions.
- Requires zero uncaught browser JavaScript errors. Retains browser evidence as screenshots and failure logs in GitHub Actions.

## Boundaries

Success proves generated GDevelop HTML5 scene rendering startup and constrained keyboard visibility behavior in Linux Chromium, not graphical editor art parity, VR, commercial asset importing, movement, physics, multiplayer, or cross-device gameplay.
WebGL software rendering in CI is used where needed. Browser acceptance remains separate from the editor compiler's validation.

All source models are original PixelForge cuboids. Purchased/private GLBs are never copied into the test or any repository.

Official runtime API references: https://github.com/4ian/GDevelop/tree/master/GDJS/Runtime

## Native key-name compatibility

The portable gameplay contract uses lowercase `space`, but GDevelop's case-sensitive `gdjs.evtTools.input` key table uses `Space`. The GDevelop translator normalizes that engine-specific token while preserving the original portable behavior sidecar. Real Chromium acceptance must cover the space-release show action to prevent regressions.
