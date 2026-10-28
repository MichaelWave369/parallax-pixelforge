# PixelForge PlayCanvas: real Chromium engine acceptance

## Motivation

The PlayCanvas exporter already generated actual glTF geometry, a local npm/Vite project, and a bounded E/F/Space visibility handler. Previous tests executed generated JavaScript with a simulated entity graph, but could not establish that PlayCanvas 2.23.3 imported the real GLB hierarchy or that browser keyboard events changed target visibility.

## New acceptance workflow

1. Use the actual production `exportPlayCanvasProject()` to generate an original-asset-only deterministic interaction ZIP with two rules: E release hides obj-2 and Space release shows obj-2.
2. Extract to an ephemeral GitHub runner folder, install exactly PlayCanvas 2.23.3 and Playwright 1.64.1, install Chromium, and run the generated project's Vite build. No dependency or model binaries are committed to the repository.
3. Add a *test-only* probe to the generated JS copy in the ephemeral runner, exposing the imported render entity graph for assertions. The released PixelForge ZIP remains unchanged.
4. Serve the generated project on localhost in real headless Chromium with software graphics fallback. Verify `PF_ID_obj-2` exists exactly once and the viewer reports two active behavior rules.
5. Send actual browser keyboard events. Assert that wrong keys, `keydown` and Ctrl-modified releases are ignored; E release disables the imported PlayCanvas object; Space release enables the same object.
6. Confirm canvas dimensions, no uncaught browser exceptions, explicit acceptance markers and export screenshot/manifest/log as a seven-day CI artifact.

## Limits

This is a real Chromium desktop browser plus PlayCanvas 2.23.3 import/interaction test. It is not a PlayCanvas hosted Editor test, a Quest 3 WebXR hardware test, mobile performance certificate, artistic visual-diff approval, networked gameplay or imported commercial model license approval.

Run the new GitHub Actions workflow on relevant changes and by manual dispatch. It is separate from PixelForge's full Studio validation and does not require browser installation for ordinary game builds.

Evidence and references:
- https://developer.playcanvas.com/user-manual/engine/standalone/
- https://api.playcanvas.com/engine/classes/ContainerResource.html
- https://playwright.dev/docs/ci
