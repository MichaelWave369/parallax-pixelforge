# PixelForge Layer Studio: Rung 02 / Stonebridge Challenge

## From animated composition to a playable 2.5D scene

The first Layer Studio rung built a bounded, local-first seven-plane 2.5D canvas composition engine with independent image animations and overlays. This rung adds a **separate, deterministic gameplay plane** without changing those seven depth layers into scenery that owns collision rules.

The demonstration is original gothic-inspired art, not a reproduction of another game's level or sprites.

## Play

Use the **Play Stonebridge** button inside \`/layer-studio/\`, or visit \`/layer-studio/play.html\` directly. The editor passes the current scene as bounded JSON through browser session storage. Direct visits use a locally saved scene or the built-in seven-plane demo. Gameplay runs on the existing 2D Canvas and requires no server beyond static file hosting.

**Controls:** left/right or A/D to move; W / Space / Up to jump; F / K / Enter to fire the stone ray; R to restart; P to pause. Touch controls appear beneath the canvas; connected gamepads support left stick/D-pad, A to jump, and B/RB/RT to fire.

**Challenge:** a 265-pixel gap separates two banks. A wandering spirit hangs over the gap. Hit it with the stone ray and it becomes a **solid, one-way stone platform**. Jump onto the statue to cross. Retrieve the golden key and reach the locked cathedral exit. A second spirit is placed near the far bank.

The state machine tracks health, invulnerability, falling respawns, individual petrified enemies, key acquisition and victory. A paused/won state cannot advance gameplay. Ray shots have a cooldown and short lifetime. Fixed \`1/60\`-second gameplay steps make movement independent of the display refresh rate.

## Authoring (Rung 2)

The main Layer Studio editor now has a **Stonebridge Puzzle Builder** below the animated preview. It can add/remove/edit platforms and petrifiable enemies; edit the player spawn, golden key, gate, and world width; preview puzzle object placement; and launch the playable route. Scenes exported as existing \`pixelforge.layer-scene.v1\` JSON include an optional, normalized \`playable\` property with \`pixelforge.layer-puzzle.v1\` payload. Existing Layer Scene v1 JSON that omits this property still opens and receives the starter demo.

### Runtime boundaries

- The game is a stand-alone platformer *prototype*, not a replacement for the original PixelForge Runtime SDK or a certified multi-game physics engine.
- Platforms are one-way from above; enemy collision uses rectangular hitboxes. There is no tile collision, moving platform system, combat tree, navmesh, or authorable scripted triggers.
- Gameplay geometry is world-space and independent from the visual depth-stack draw order. Background planes render before gameplay, frontmost plane renders afterward, and HUD stays on top.
- Source images are browser-local embedded data URLs; JSON import inherits the existing bounded image restrictions. No privileged filesystem access, remote assets, telemetry or hosted user content.
- Preset level is intended as a short interaction proof, not a commercial-length challenge or verified speedrun.

## Tests

\`node --test tests/layer-studio.test.js tests/layer-puzzle.test.js\`

Both run as part of \`npm run test:studio\`, which is in the full PixelForge CI preflight. The Rung 2 test suite checks backward-compatible scene import, bounded puzzle inputs, jump/gravity, shooting cooldown and stone conversion, landing on a new stone platform, key/gate state, falling respawn, camera bounds, layered rendering and browser control surfaces.

**Next rung:** asset-linked actor sprites and authored movement animations; tile-map collisions using existing Tile Studio data; camera zones, lighting masks, and event-driven scene transitions. These are intentionally not claimed in Rung 2.
