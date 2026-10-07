# PixelForge v5.31 — Native WebGL2 GLB Preview

## Goal

Render a structurally qualified GLB directly inside PixelForge without requiring Unreal at runtime and without adding a third-party browser rendering dependency.

v5.31 is a deliberately narrow first runtime-import rung. It proves that supported static glTF 2.0 geometry can reach a PixelForge WebGL2 viewport.

## Preview surface

Open:

```text
http://localhost:3690/external-preview/
```

The viewer supports:

- drag/drop of a local `.glb`,
- browser file picker,
- same-origin URL loading from the ignored `local-assets/` vault,
- orbit camera with pointer drag,
- wheel zoom,
- reset with `R`,
- automatic model bounds and camera framing,
- multiple mesh nodes and primitives,
- node matrix or TRS transforms,
- indexed and non-indexed TRIANGLES,
- POSITION, optional NORMAL, optional TEXCOORD_0,
- PBR base-color factor,
- embedded base-color textures,
- downloadable preview receipt.

## Default physical-proof URL

The preview page starts with:

```text
../local-assets/staging/ASSET-000021/ASSET-000021.glb
```

That is the expected output location from the v5.29/v5.30 Unreal bridge for the first governed target.

## Static-preview boundary

v5.31 is not a complete glTF renderer. It intentionally treats these as later lanes:

- animation playback,
- skeletal skinning,
- non-TRIANGLES primitive modes,
- sparse accessors,
- external non-GLB buffers,
- primitive compression/extensions such as Draco,
- full metallic/roughness parity,
- Unreal material graph equivalence,
- collision import,
- runtime physics,
- production performance qualification.

When those features are present, the plan/receipt records warnings rather than pretending they were reproduced.

## Machine status

A successful viewport draw ends at:

```text
PREVIEW_RENDERED_VISUAL_REVIEW_PENDING
```

That means supported geometry reached PixelForge's own WebGL2 renderer and at least one primitive was drawn.

It does **not** grant:

- source compatibility PASS,
- visual parity with Unreal,
- material parity,
- collision readiness,
- animation readiness,
- performance approval,
- license approval,
- commercial approval.

## Why native WebGL2 first

PixelForge currently has no third-party JavaScript runtime dependencies. v5.31 preserves that property and creates a small auditable rendering lane that we fully control.

A later rung can add animation/skin support, richer PBR, optimization metrics, runtime scene attachment, and a creator-facing Asset Forge panel once real exported assets tell us which features are actually needed.
