# PixelForge: Native GDevelop 5.6.285 Editor Acceptance

## Why this exists

Earlier PixelForge GDevelop integrations generated GDevelop-native `game.json` cube scene objects and `KeyReleased` → `Hide/Show` visual events. Unit tests established schema shapes and safe packaging, but did not prove that GDevelop itself can open and export them.

The dedicated GitHub Actions workflow **GDevelop Native Editor Export Acceptance** runs the official **GDevelop 5.6.285 Linux editor** on disposable GitHub CI workers, against projects produced by the real PixelForge exporter.

## Scenarios

- `plain`: native editable 3D scene, no visual events.
- `hide-e`: key E release hides a PixelForge cube through GDevelop visual events.
- `show-space`: Space release shows a PixelForge cube through GDevelop visual events.

## Evidence and safeguards

1. Generate each original-content-only ZIP from production `exportGDevelopProject`, repeat to enforce deterministic packaging and source immutability. No private GLB models or purchased assets are used.
2. Unpack in the temporary CI runner; require non-empty `game.json` and original white texture.
3. Download GDevelop v5.6.285's **official Linux ZIP** and verify the exact SHA-256 published by `4ian/GDevelop` before extracting or launching.
4. Start the editor via its officially documented `--run-command EXPORT_HTML5_EXTERNAL` with `--block-on-diagnostic-errors`, inside a temporary Xvfb display. A bounded timeout prevents hung Electron processes.
5. Require native CLI completion confirmation plus a real HTML5 `build/index.html` and additional emitted runtime files. Upload the diagnostic logs and source manifests.

## What success means

Successful CI proves that the real pinned GDevelop editor **loaded, compiled and exported** the generated project's event and scene schema to a web build, with no blocking diagnostics.

Successful export alone does **not** prove Chromium input delivery, that the 3D cube is visually placed correctly, scene lighting or colors, or that the generated key-release events behave as intended at runtime. Those need a later actual browser acceptance check.

Existing Godot and PlayCanvas native tests remain separate and unaffected. This workflow triggers only on GDevelop-related changes and manual dispatch, not on all ordinary PixelForge frontend builds.

## Source

- Official GDevelop CLI documentation: https://github.com/4ian/GDevelop/blob/master/newIDE/README.md
- Official GDevelop CLI runner: https://github.com/4ian/GDevelop/blob/master/newIDE/app/src/MainFrame/LocalCliCommandRunner.js
- Upstream native export smoke harness: https://github.com/4ian/GDevelop/blob/master/newIDE/app/scripts/test-portable-cli-export.js
- Official pinned release: https://github.com/4ian/GDevelop/releases/tag/v5.6.285
