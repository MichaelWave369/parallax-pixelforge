# PixelForge v5.40 — World Lighting Studio

## What this rung adds

Worlds gain an **optional lighting object** in the existing `pixelforge.vr-world.v1` scene format. The WebGL2 shaders now use validated ambient light, directional sun light, and exponential distance fog. Creators can use four presets or edit individual settings through the same VR Studio inspector.

### Creator controls

- **Daylight:** brighter warm sun, sky-blue atmospheric tint.
- **Sunset:** low orange light, violet ambience, denser haze.
- **Midnight:** subdued cool moonlike light, dark background.
- **Neon Lab:** mint ambient and pink directional glow.
- Adjustable ambient and sun strength, color swatches, sun azimuth/elevation, fog color and fog density. The fog color also drives the viewport background.
- Edits, preset selections and neutral reset pass the existing `validateWorld()` boundary and create an Undo step. The colors are rendered for both primitive geometry and supported static GLB meshes with embedded PNG/JPEG base-color textures.

### Data model and backward compatibility

New scenes include a strictly validated optional `lighting` record. Existing v1 JSON scenes **without** this field are still accepted; the renderer applies neutral defaults without altering the original scene data. Editing lighting adds the field. Saving and exporting the scene includes it, but never embeds any GLB files, remote URLs, executable scripts or extra runtime authority.

Allowed keys: `ambientStrength`, `ambientColor`, `sunStrength`, `sunColor`, `sunAzimuth`, `sunElevation`, `fogColor`, and `fogDensity`. All colors must be six-digit hex values; all numbers must be finite and within documented ranges.

| Field | Allowed range |
|---|---|
| Ambient strength | 0 to 1.5 |
| Sun strength | 0 to 2 |
| Sun azimuth | -180° to 180° |
| Sun elevation | 0° to 90° |
| Fog density | 0 to 0.08 |

## Scope boundaries

- **This is basic diffuse shading and distance fog.** No actual shadow maps, volumetric fog, physically based light transport, emissive sources, skybox geometry, baked lighting, HDR, or tone mapping.
- Existing GLB material parity and licenses remain unqualified. Lighting does not approve or redistribute any marketplace assets.
- Fog density uses the current world coordinate scale; it is **not** weather or visibility calibration.
- WebXR uses the same materials and per-eye fog position but requires physical headset testing. No certification of framerate or headset comfort.
- No model/agent write API, external requests, physics, collision, multiplayer, or new trust capabilities.

## Manual QA

1. In `/vr-studio/` through the React Pages launcher, select Daylight, Sunset, Midnight and Neon Lab. Confirm both colored geometry and the background visibly change.
2. Move ambient intensity to zero and adjust sun elevation; inspect diffuse response. Set sun intensity to zero; confirm ambient-only lighting.
3. Change fog from zero through moderate values and move the camera; confirm distance changes appearance. Fog zero must leave object colors unblended.
4. Import an approved local static GLB and verify its base-color textures are tinted by the same environment settings. Source bytes remain browser-local.
5. Save and export world JSON, refresh, re-import and confirm lighting is preserved. Load an older world JSON without `lighting`: it must use neutral defaults.
6. Edit the environment, press Undo, verify previous settings return. Confirm the same works for presets.
7. Open on mobile/narrow viewport; inspector inputs should remain usable. Separately verify WebXR on supported physical hardware.

## Automated validation

`npm run test:vr-lighting` checks complete presets, compatible older v1 scene roundtrips, invalid color/intensity rejection, unchanged object/runtime authority, and finite, unit-length sunlight vectors. Root `npm test` includes these tests and browser-module syntax checks.

**CI cannot verify pixel output, performance, accurate shading or headset behavior.** Record those in manual acceptance evidence before treating visual quality as qualified.
