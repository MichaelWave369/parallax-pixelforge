# PixelForge v5.37 — Embedded GLB Base-Color Texture Preview

## Objective

Extend v5.36's *real static GLB geometry* import with the first deliberately bounded material feature: show embedded PNG or JPEG base-color textures on properly UV-mapped static triangles inside VR Studio.

**This is a preview lane, not complete glTF PBR or Unreal material parity.** The existing operator-only world editing and hash-bound scene format are unchanged.

## Supported and enforced

- GLB 2.0 self-contained BIN, with PNG or JPEG image data inside validated bufferViews.
- A glTF material's `pbrMetallicRoughness.baseColorTexture` referencing `TEXCOORD_0` and FLOAT `VEC2` coordinates.
- Optional `baseColorFactor` multiplied with the sampled image; existing face-normal directional shading remains.
- Basic glTF sampler min/mag filtering and REPEAT, CLAMP_TO_EDGE, and MIRRORED_REPEAT wrapping using corresponding WebGL2 values.
- A per-primitive material texture binding. Multiple primitives can share embedded texture indices.
- Up to eight embedded texture objects per GLB, up to 6 MB of encoded data per image, max 2048 pixels per dimension, and **4,194,304 decoded pixels total per loaded asset**.
- GPU allocations are discarded if image decode/upload fails. Textures remain in memory for the local browser session only.
- Original v5.36 maximum of eight unique resident GLB assets and 150,000 preview triangle vertices remains in force.
- Textures on models appear when their exact SHA-256 GLB source is imported or rebound; after refresh, scene JSON retains only asset identity until the operator rebinds it.
- Desktop WebGL2 preview and experimental WebXR reuse the exact same draw path. Real headset testing remains separate.

## Unsupported paths

- External image URLs, embedded image data URIs, `.gltf` file packaging or network fetching.
- Unsupported file MIME types including SVG or WebP; PNG/JPEG only.
- Non-base-color normal/emissive/occlusion/metallic-roughness maps. These are ignored with explicit warnings where present.
- Texture transforms, secondary UV channels, morph targets, compressed geometry, animation and skinning.
- Full physically based roughness/metallic shading, transparency/blending, color-management equivalence, lighting parity or cross-engine material equivalence.
- Collision, physics, agent authority, controller input, headset comfort/performance, and third-party source license approval.

## Creator acceptance

Open VR Studio through the live React PixelForge portal or locally via `npm run start`.

1. Choose a governed ASSET ID, select a self-contained exported GLB with a base-color PNG/JPEG and TEXCOORD_0, then verify actual geometry and diffuse texture appear.
2. Move/scale/rotate the model; confirm the texture follows the model without changing world serialization.
3. Save scene JSON. Verify it contains no image bytes, no GLB contents and no executable material instructions.
4. Reload, observe the proxy placeholder until the exact local GLB is rebound by matching SHA-256.
5. Try an image URI, oversized image, missing UVs or invalid sampler; import must reject with an error.
6. Try normal/roughness maps; confirm warnings explicitly note they are not reproduced.
7. Test XR only on qualifying hardware, separately from the CI checks. Monitor headset performance and visual/UV fidelity manually.

## Automated validation

`npm run test:vr-textures` includes real binary GLB fixture tests for embedded image bytes, UV coordinates, sampler metadata, external URL rejection, bounds, missing UVs, and unsupported material maps. The existing v5.36 fixture remains in the suite; root `npm test` includes the v5.37 rung.

## Important boundaries

GitHub Pages serves the editor code; the user's GLB bytes **are not sent to Pages or stored in the repository**. Local file handling, textures and GPU buffers stay browser-local. If a model's marketplace rights do not permit redistribution, do not include it in the public repo or published world bundles.

**Pass means** the tests parsed and validated supported image descriptors. It does not mean a browser GPU render, physical headset use, Unreal rendering parity or any commercialization rights have been independently certified.

Next rungs: visual screenshot-based acceptance and bounded interactive selection/gizmos, followed by separately governed input/VR controller capability trials.
