# PixelForge v5.39: Rotate and Scale in the 3D Viewport

## What changes

Add desktop viewport **Move / Rotate Y / Scale** modes to the existing PixelForge VR World Studio. The mode buttons and W/E/R keyboard shortcuts switch tools. The world schema remains `pixelforge.vr-world.v1`, with unchanged operator-only permission boundaries and existing asset SHA-256 references.

## Controls

- **W: Move** keeps existing X, Y and Z translation handles, positional snapping and inspector nudge buttons.
- **E: Rotate Y** shows an amber projected horizontal ring. When the camera angle makes that ring nearly edge-on, the ring hides to avoid unsafe dragging and inspector rotation buttons remain available. Drag horizontally, approximately 0.5 degrees per pixel, snapped to increments of 5°, 15°, 30° or 45°. Clamp within the original -360° to 360° world yaw contract.
- **R: Scale** shows square X/Y/Z handles plus a center diamond for uniform scaling. Drag an axis handle along its projected direction to scale that axis; drag the center diamond upward/downward to resize all axes. Snap increments can be 0.05, 0.1, 0.25 or 0.5. All resulting per-axis values are bounded between 0.05 and 50.
- All tools have keyboard-focusable inspector alternatives. Shortcuts are ignored while a text field or select is focused.
- Every completed drag yields **one Undo step**. Pointer-cancel or Escape restores the pre-drag world without adding undo history.
- A click still selects the nearest bounding-box object; drag empty space to orbit; scroll to zoom.

## Safety and compatibility

- All changes use the existing `editObject` validator and local world store. No runtime execution, agent authority, network access or physics is introduced.
- Existing saved worlds and v5.35-v5.38 GLB asset references are fully compatible, with no migration.
- Rotation is **Y only** because the current world format stores `yaw` rather than a quaternion.
- World transforms affect imported GLB geometry the same as before; embedded textures and their SHA-256 asset association are unchanged.
- The ring and handles are visual HTML/SVG desktop editing affordances, not WebXR controller interfaces. Device compatibility and VR visual alignment still require manual testing.
- Drag-scale is bounded but uses simple screen-projected handles, not a complete CAD or Blender transform system.

## Manual acceptance

1. Open `/vr-studio/` in the React Pages site or local server; verify Move / Rotate Y / Scale mode buttons appear.
2. Select one object and use W then drag an X/Y/Z handle. Use Undo; position must revert.
3. Press E and drag the amber ring horizontally. Verify snapped angle changes in inspector, then Undo.
4. Set camera to a nearly horizontal view. Ensure a near-edge-on ring cannot be dragged and the ± rotation buttons still work.
5. Press R and scale independently along X/Y/Z. Drag the center diamond for uniform scaling and use inspector ± controls.
6. Try reaching minimum and maximum scale: values must stay within 0.05 to 50; yaw within ±360°.
7. Start any transform and press Escape. The original scene should be restored and Undo should not gain a canceled entry.
8. Save/export and import the scene JSON to confirm backward compatibility, without embedding GLB files.
9. Repeat with a locally rebound static GLB model to check visual transforms and texture mapping. Test XR hardware separately.

## Automated check

`npm run test:vr-transform` covers ring projection and hit testing, yaw snapping/clamps, axis and uniform scaling, inspector steps, invalid requests and world-schema round-trip. The project `npm test` includes these tests.
