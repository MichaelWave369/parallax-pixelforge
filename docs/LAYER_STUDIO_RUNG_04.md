# PixelForge Layer Studio: Rung 04 / World Director

## Events and atmosphere, without scripting privileges

Rung 4 extends the existing seven-plane animated Layer Studio / Stonebridge puzzle with a **data-only World Director**. It does not replace the PixelForge runtime and does not execute author-defined JavaScript. It introduces small composable world events, safe checkpoints, camera framing regions, and torch-like light masks.

The \`pixelforge.layer-director.v1\` payload is an optional \`playable.director\` field of the existing portable \`pixelforge.layer-scene.v1\` JSON. The normalized schema contains an ambient darkness value and three bounded lists:

| Type | Purpose | Limit |
| --- | --- | --- |
| Trigger | **Message** or **checkpoint** rectangular volumes; optional once/repeat-on-reentry | 32 |
| Camera region | X-range with framing focus (0.15–0.85 across viewport) | 16 |
| Light pool | Local radius, color, intensity on a separate darkness mask | 24 |

### Built-in example

The Lantern Vault demo seeds two event volumes, one cathedral framing region and three light pools. The first message appears when approaching the stone bridge. A beacon checkpoint activates on the far bank only when the player is grounded. If the hero falls later, the checkpoint becomes the respawn position while the existing stone statues and key progress remain preserved.

**Important:** This is not a generic scene-to-scene loading system. Rung 4 events live inside one world and currently do not teleport the hero or execute cutscenes. Full scene transitions are a future rung.

### Authoring workflow

1. Open **Layer Studio** and scroll to the **World Director** dock.
2. Add **Message zone**, **Checkpoint**, **Camera region** or **Light pool**. Select an object to edit its world-space position, rectangle dimensions, message, focus, radius, intensity or light color.
3. Set **Ambient Darkness** for the whole world and use **Lighting preview** or **Show zones** to inspect the effect. Event and light geometry is independent of sprite/tile art and can be layered on imported maps.
4. Use the existing **Play Stonebridge** action to test event activation, camera changes and respawns. **Export JSON** keeps the World Director data local and portable.

## Gameplay details

- Triggers fire deterministically on the 60 Hz physics tick. A \`once:true\` trigger fires once per attempt; repeatable triggers fire when entering, not every frame while occupied.
- Checkpoints require grounded contact, and a midair entry remains eligible when the hero lands inside the volume. They save the current grounded world-space player position without changing key/statue progress.
- Camera focus is selected from the first matching region and clamped to level bounds. Leaving a region restores the old 0.38 framing ratio.
- Light masks render on an **offscreen canvas** after scene/actor/foreground drawing and before the HUD. The offscreen \`destination-out\` operation creates soft light holes; it never erases gameplay pixels.
- The built-in demo uses modest ambient darkness and colored light pools. The lighting effect can be disabled with \`ambient:0\`, or its lights and opacity edited without changing any collision behavior.
- Messages show briefly in the game status strip, distinct from the always-visible health/key HUD. Checkpoint activity is also indicated by a HUD text marker.

## Compatibility and security

- Existing imported Sprite Studio frames, Tile Studio maps, tile collision, project handoff, stone-ray combat, keyboard/touch/gamepad controls and camera drag/editor remain intact.
- Existing Layer Scene v1 files with a \`playable\` payload but **no director** use an empty/no-darkness director. Pre-Rung-2 scenes that omit \`playable\` entirely continue receiving the built-in Stonebridge demo, now including its Rung 4 authoring examples. The prior scene schema/version is unchanged.
- No external URLs, eval, scripts, plugin hooks, network requests, or executable actions in imported event metadata. All text, geometry and colors are bounded and normalized.
- World Director objects are not saved as separate remote resources; use the same local scene export.
- No light-map shadow casting, line-of-sight occlusion, save game persistence across browser reloads, timeline cutscenes or cross-scene portals yet. Canvas 2D/offscreen lighting is a visual prototype; hardware browser playtests remain important.

## Tests

New \`tests/layer-world-director.test.js\` is part of the required \`npm run test:studio\`. It covers backwards-compatible round trips, event schema limits/whitelists, message repeat behavior, grounded checkpoint activation and respawn, camera bounds, offscreen lighting (never erasing scene), and editor controls.

\`\`\`sh
node --test tests/layer-studio.test.js tests/layer-puzzle.test.js tests/layer-living-worlds.test.js tests/layer-world-director.test.js
\`\`\`

**Likely next rung:** multi-room exit transitions, keyed doors and authorable scene events, then richer shadows and reusable authored encounter sequences.
