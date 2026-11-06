# PixelForge v6 — Creator Forge preview (first vertical slice)

This branch **does not replace the existing PixelForge Studio**. It adds an opt-in React workspace at the public site's `?forge=1` route and keeps the original Studio, VR World Studio, Layer Studio, GLB Inspector, and all v5 project/storage contracts intact.

## Included in this rung

- Responsive neon workspace shell based on the approved visual direction, with left navigation, project summary, central editing area, and right-hand runtime/action panels.
- Real 28 × 18 interactive tile-grid demo, multiple brushes, undo/redo, explicit local save/load, validated JSON import/export, and simple WASD/arrow-key exploration in preview mode.
- A lazy-loaded **Three.js + Rapier 3D** physics lab. It has a WebGL scene, solid ground and elevated platforms, cubes and balls with real rigid bodies and colliders, adjustable gravity, play/pause, reset, orbit camera, a fixed 60 Hz physics step, a bounded accumulator, and measured FPS.
- Existing v5 tool entry links rather than fictional replacements. The v6 UI explicitly labels pending VFX tooling and experimental XR as such.
- A separate `pixelforge.v6.demo-world.v1` schema and browser-local storage key. It does not import or modify v5 project keys or Unreal asset files.

## Scope and boundaries

This is a **working preview**, not a complete v6 migration or performance qualification. The 2D map is a self-contained sample inspired by Mt. Shasta Roadside. It does not load the existing project's authoritative scene format or serialize Rapier bodies into game cartridges. The 2D preview supports collision-aware navigation, but no NPC, quest, animation, multiplayer, audio engine, VFX authoring, XR physics, or engine-independent export is claimed.

The runtime's ON badges only show after successful initialization. FPS is measured in the active browser; 130 FPS, Quest 3 performance, or sustained target performance are not asserted.

Rapier's compatibility build embeds its WASM in the JavaScript distribution; both 3D libraries are installed via npm and bundled by Vite. The public Pages route does not fetch physics code from an external CDN, and does not gain local execution authority.

## Launch

```bash
npm --prefix site install --no-audit --no-fund
npm --prefix site run dev
```

Open the URL printed by Vite with `?forge=1` appended to the project root (for example, `/parallax-pixelforge/?forge=1`).

When deployed by the existing GitHub Pages workflow, navigate to:
`https://michaelwave369.github.io/parallax-pixelforge/?forge=1`

## Tests

```bash
npm --prefix site test
npm --prefix site run build
```

The Node tests verify sample schema bounds, import rejection, immutability and movement; the existing assembly tests and publication allowlist remain in force. Visual operation and GPU performance still require a real browser.

Manual acceptance:
1. Launch v6 via the portal; confirm original Studio and VR routes still work.
2. Paint a tile, undo/redo, save, reload, export and import JSON. Confirm v5 saved projects remain intact.
3. Play Preview with WASD/arrow keys; verify impassable terrain blocks movement.
4. Open Physics, verify the runtime badges change from standby to ON only when loaded; drop boxes/balls, vary gravity, pause/resume and reset.
5. Confirm no browser errors, no unbounded body growth (250 cap), and usable narrow-screen layout.
6. Check WebGL2-unavailable behavior and browser localStorage failure handling.

## Next rungs

1. Wire real PixelForge scene/cartridge adapters into the v6 workspace without mutating the existing schema.
2. Author explicit, portable physics components/collider proxies for real scenes.
3. Create a dedicated visual VFX graph with bounded emitters, GPU profiling and asset provenance.
4. Benchmark desktop and physical Quest 3 before any XR or framerate claims.
