# PixelForge v6 · Rung 8 — Playability and World Feedback

This rung improves the **opt-in browser World Player** and shared Three.js/Rapier PhysicsStage without changing a saved-world schema or introducing network/script authority. The existing `pixelforge.playable-world.v1`, `pixelforge.gameplay.v1`, `pixelforge.event-graph.v1`, original VR Studio and private GLB policies remain unchanged.

## Controls

- **WASD / arrow keys:** move relative to the current orbit camera, not fixed global axes.
- **Shift (hold):** sprint. Normal target speed is about 3.7 m/s; sprint target is about 5.6 m/s.
- **Space:** request a jump when grounded. A downwards **Rapier raycast excludes the player's own rigid body** and checks support beneath the capsule; requests made while airborne/paused cannot double jump.
- **E:** activate a nearby, unlocked switch; existing Rung 7 event-graph prerequisites and proximity rules still apply.
- **Drag / wheel:** orbit and zoom, as before.
- **Touch overlay:** press-and-hold directional arrows, press-and-hold Sprint, tap Jump, and tap Interact when an eligible switch is nearby. Pointer release/cancel resets held movement inputs.
- **Pause / Restart:** freeze the physics/world transitions or reset to the declared spawn and rearm events.
- **Fall recovery:** if a capsule falls beyond the playable authoring bounds, it returns to its declared spawn with zero velocity. This intentionally does **not** reset collected quest events.

Controls on interactive text inputs do not steal typing focus. Pressing keyboard movement keys after operating player HUD buttons remains supported. Motion uses acceleration/braking and normalization so diagonal input is not faster than forward motion.

## Door animations

Previously a Rung 7 door disappeared abruptly when its graph prerequisites were fulfilled. Now the **validated fixed Rapier rigid body and collider are still removed immediately** on unlock, so the player cannot get stuck in an invisible blocking wall. The placeholder cube performs a short **0.75-second emissive lift/shrink/fade transition** after the collision removal.

The animation is **visual feedback only** and its timings are local runtime constants. The world/graph format, scene SHA, door conditions and authority are unchanged. Pausing freezes the visual transition; restarting re-creates the original solid body, collider and closed-gate appearance.

This is not a door-hinge rig or animated authored GLB asset. Accurate mesh animation, pressure sensors, animation timelines and audio triggers remain future work.

## Live feedback and accessibility

The World Player viewport now provides:
- A contextual **Press E / Tap Interact** hint when the player is close to an eligible switch, or an explicit paused indicator.
- A small latest-event toast and the existing permanent mission event log.
- Live **grounded / airborne**, **walk / sprint**, and horizontal-speed information in the viewport footer.
- Dedicated touch-friendly controls, buttons with accessible labels and pointer cancellation, and reduced-motion CSS transition handling for the button interactions.

The UI does not yet implement configurable keybindings, full gamepad, Quest controller mapping, mobile camera touch gestures beyond OrbitControls, accessibility certification, or production-quality third-person character animations. Gamepad/VR qualification should be a separate project milestone.

## Verification

```bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
```

`site/scripts/player-playability.test.mjs` checks camera-relative direction, diagonal normalization, acceleration/braking, sprint speed, invalid numeric input, jump grounding, paused-jump refusal and bounded door animation. Existing Rung 1–7 tests run unchanged.

### Browser acceptance checklist

1. Import a validated world or open the public starter course at `?play=1`. Orbit the camera, press W, and check that movement follows the camera's ground-plane direction.
2. Hold W, release and verify smooth braking; compare diagonal W+D with straight-line motion. Hold Shift and confirm the faster movement speed indicator.
3. Press Space on a fixed floor; confirm one physics-driven jump. Spam Space while airborne and verify no double-jump. Pause the simulation, press Space and confirm the player cannot jump while paused.
4. Use the on-screen directional pad, Sprint, Jump and Interact buttons; check pointer release/cancel does not leave a direction stuck.
5. Approach a switch: the interaction prompt should appear only when within its declared radius and prerequisites are fulfilled. Press E or tap Interact, and confirm no duplicate events.
6. On unlock, the gate should stop blocking **immediately** and visibly dissolve for about 0.75s. Pause during the dissolve and verify the animation freezes; restart and verify the gate appears and blocks passage again.
7. Explore the secret route and verify the original Rung 7 AND/OR branching victory requirements still work.
8. Load a legacy `pixelforge.playable-world.v1` without gameplay; verify exploration, walking and jumping still work.
9. Verify original Studio, protected asset exclusions and browser-local v5 data remain unchanged.
10. Test real desktop browsers and touch hardware before user-facing release. **Automated CI cannot certify runtime smoothness, Rapier ray-contact nuances, touch pointer capture, accessibility or Quest 3 performance.**

## Architecture and boundaries

`site/src/player-playability.js` owns the pure acceleration, speed, jump-gating and visual door-pose functions. The existing `PhysicsStage` owns runtime keyboard/pointer-ref state, casts grounded probes using Rapier's supported scene-query filter, applies computed horizontal velocity in its fixed 60 Hz simulation step, and emits throttled movement feedback. The World Player owns touch UI and visible status.

No new dependency was added and no network or arbitrary executable-world fields were introduced.
