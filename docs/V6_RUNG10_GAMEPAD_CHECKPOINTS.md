# PixelForge v6 · Rung 10: Gamepad & Checkpoint Playtesting

Rung 10 adds **browser-standard gamepad support** and **selectable earned checkpoint rollback** to the opt-in World Player. It is deliberately incremental: all current `pixelforge.playable-world.v1`, gameplay event graph, and `pixelforge.playtest-save.v1` data contracts remain unchanged. The original VR Studio, legacy PixelForge studios, and private GLB policies are untouched.

## Controller mapping

The player reads the browser's Gamepad API during the existing Three.js animation loop, without introducing another timer, React render loop, plugin, network service or permission grant. Only `mapping === "standard"` controllers are accepted:

| Controller | Behavior |
| --- | --- |
| Left stick | Camera-relative analog movement (radial 19% deadzone) |
| D-pad | Digital forward/back/strafe movement |
| Right stick | Orbit the player camera horizontally and vertically |
| A / south | Request ground-checked jump |
| X / west | Activate eligible switch (single press) |
| RB / right bumper, or L3 | Hold to sprint |
| Start / menu | Toggle Pause/Resume (single press) |
| Y / north | Respawn at the selected activated checkpoint (single press) |

Only rising edges trigger jump/interact/pause/checkpoint: holding a button does not repeatedly use a switch or restart the world. Disconnect and unsupported layouts produce neutral movement and reset button edge history. Controller input is merged with Rung 8 keyboard and touch controls; neither is removed. Controller detection depends on the browser's input/security restrictions and usually requires a user button press before the device is exposed.

Right-stick orbit reuses the existing camera/OrbitControls target; no separate first-person mode or XR entitlement is implied. Browser gamepad implementations vary by OS and manufacturer, so an Xbox-style standard layout is the first practical test target.

## Choose any activated checkpoint

Rung 9 supported last-checkpoint respawn. Now the Save & Checkpoints panel offers a dropdown of **every checkpoint actually visited during the current validated event trace**. Select the latest or a named earlier checkpoint; press the button or controller Y to:

1. Reproduce the exact declared event trace using the existing pure game-rules reducer.
2. Confirm that the selected event step actually contained a Rung 6 `trigger` checkpoint.
3. Truncate the trace at that step, restoring pickups, triggers, switches, doors and goal state as they were at that checkpoint.
4. Recreate the Rapier scene and player at the recorded checkpoint position.

Choosing an earlier checkpoint intentionally discards later **in-memory** events but does not erase an explicitly saved browser slot. There is no privileged repositioning, checkpoint creation, reward injection, or modification of game rules. On import/reset/restore, the selection returns to **most recent** by default.

The selectable checkpoint history is computed from `pixelforge.playtest-save.v1` event frames. Existing Rung 9 saves remain byte-format compatible and continue validating unchanged.

## Verification

```bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
```

`site/scripts/gamepad-checkpoints.test.mjs` tests analog axis mapping, deadzone, normalized input, D-pad, button mapping, edge-only actions, input neutralization on disconnect/unsupported layouts, enumeration of earned checkpoints, selecting older checkpoints, malformed checkpoint refusal and Rung 9 save compatibility.

### Manual browser acceptance checklist

1. Open `?play=1`, connect an Xbox-style controller by USB or Bluetooth, press A and verify **STANDARD GAMEPAD CONNECTED** appears.
2. Move with left stick and D-pad; verify camera-relative movement and analog speed control. Move right stick; verify orbit angle and pitch limits. Hold RB to sprint.
3. Press A on the ground for one jump; hold A or press in midair and verify no double jump.
4. Approach a switch, press X and verify exactly one switch event and the corresponding gate/collider unlock. Hold X and verify no duplicate activations.
5. Press Start to pause and again to resume. Verify no movement continues while paused.
6. Unplug/disable the controller while holding a direction. Verify the input goes neutral; keyboard/touch controls continue to function.
7. Author or import a world with two ordinary checkpoints. Activate both, select the first in the Save panel and press Y. Verify later events and door unlocks roll back; restart and repeat with the second checkpoint.
8. Save locally, reload the saved run and confirm the checkpoint list is rebuilt from the restored event trace, with no migration or format change.
9. Try a controller with a nonstandard layout; it must remain inactive and should not produce arbitrary or unsafe input.
10. Verify no original VR Studio scene, v5 save, private GLB, or other world's local save was altered.

This rung does **not** claim hardware qualification, controller remapping, full controller UI navigation, VR controllers, rumble feedback, or a recorded animated ghost of the entire physical path. All those require separate testing or designs. Browser automation and unit tests cannot replace hands-on controller acceptance.
