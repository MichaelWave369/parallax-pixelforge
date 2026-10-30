# PixelForge Layer Studio v1 · Animated 2.5D Depth Planes

**Design observation:** a rich side-scroller can appear spatially deep using flat artwork on individually moving planes. These are original PixelForge demo graphics, not assets extracted from any existing game. The screenshots that inspired the idea cannot establish another game's exact internal layer count or implementation.

## Open

- From PixelForge's Pages portal, select **Layer Studio**.
- From the legacy Studio, select **Layer Studio (2.5D)**.
- Or launch \`/layer-studio/\` on the existing local static server: \`npm run start\`.

## Features in this first rung

- Seven original, independent depth planes in a true back-to-front canvas 2D compositor; 1–24 layers supported.
- Per-plane parallax factor, x/y offset, opacity, visibility and reordering.
- Independent motion (none, float, sway, drift) and separately animated overlay (stars, mist, dust, runes, rain, embers or fireflies) with speed and intensity.
- Camera scrub and canvas drag; an **Explode Depth** diagnostic moves planes apart temporarily.
- Solo a layer, play/pause animation, local save, portable scene JSON import/export, PNG frame capture.
- Upload PNG/JPEG/WebP or horizontal frame-strip spritesheets (1–64 frames, 0.1–60 FPS) onto any image plane. Uploaded image bytes are embedded as data URLs in exported JSON; there is no background download or remote asset request.
- Procedural placeholder gothic-inspired visuals are original and do not imply pixel-perfect recreation of another game.
- The renderer is a reusable ES module in \`layer-studio/engine.js\`; scene schema \`pixelforge.layer-scene.v1\`.

## Scope and limitations

This is a **working browser scene editor and renderer**, not yet a full platformer engine. There is no physics, collision editor, map authoring, sprite-anchored gameplay rig, bone animation, particle GPU backend, lighting normal maps or cross-game serialization adapter. Spritesheets must be laid out in **one horizontal row**. Art remains private to the browser or inside JSON intentionally exported by the operator.

Imported JSON is normalized and bounded, external URL assets are rejected, SVG is not allowed, and image uploads are limited to 2MB per image. Large scenes may exceed browser local storage; use Export JSON. GitHub Pages will only host example source and public editor assets, not user-generated imported images.

## Acceptance checks

- \`node --test tests/layer-studio.test.js\` validates schema boundaries, layer animation math and no-network canvas painting.
- \`npm --prefix site test\` validates Pages assembly; \`npm --prefix site run build\` verifies the published \`layer-studio/\` route.
- Browser visual/interaction testing, image-sheet playback and performance on low-powered devices still require an actual browser pass.

Next rungs: sprite and tile authoring handoff, per-plane lighting masks, authored layer events and foreground occlusion, versioned importers into existing PixelForge scene/cartridge tooling, and physical mobile/XR performance measurement.