# PixelForge → FramefieldStudio: local GLB preflight v1

**Status:** read-only, operator-selected diagnostic. This is an advisory compatibility
profile, not a license grant, model conversion, installed PhiOS app, or physical test.

## Why this exists

PixelForge's v5.31 native WebGL2 viewer accepts multiple meshes/primitives, node
transforms and textures. Framefield's current browser **Import GLB** is narrower:
one static triangle primitive, tightly packed float32 positions, optional unsigned
indices, 800 vertices, 1,200 triangles, 16 MiB source bytes, no authored node
transforms, rigs or animation, and only an approximate flat material color.

A perfectly valid PixelForge GLB can therefore be blocked by Framefield. The
preflight reports those limits **before** you enter Framefield, with concrete
corrective actions. It never silently simplifies, destroys or publishes geometry.

## Windows / macOS / Linux: inspect one private GLB

Run from a *local checkout of PixelForge* after selecting an export on your
own device. Substitute the actual path below; it is not a real user asset:

```powershell
npm run asset:framefield:preflight -- "C:\\my-models\\example-static.glb"
```

Or get a machine-readable answer on stdout:

```powershell
npm run asset:framefield:preflight -- "C:\\my-models\\example-static.glb" --json
```

To explicitly save a **new** local report, supply `--out`; the tool refuses
to overwrite an existing report:

```powershell
npm run asset:framefield:preflight -- "C:\\my-models\\example-static.glb" --out "C:\\my-models\\example-framefield-preflight.json"
```

The default tool writes **no files**, performs no Unreal execution, does not
open any external URL or network connection, and reads only the selected GLB.
It returns exit code `0` for a predicted static import candidate, `1` for
blocked geometry and `2` for invalid CLI/file/read/write errors.

The report carries the SHA-256 of the original source bytes (not subsequent
Framefield edits). A digest proves equality only, not authorship, permission,
safety, visual fidelity or trust in a producer. It **does not** include an
absolute source file path, paid inventory, or account identifiers.

## Interpretation

- `FRAMEFIELD_STATIC_IMPORT_CANDIDATE`: meets the reviewed static geometry
  profile. **Not** an actual Framefield import, successful rendered preview or
  cross-repo runtime qualification.
- `FRAMEFIELD_IMPORT_BLOCKED`: one or more concrete errors. Examples:
  `MESH_COUNT`, `NODE_TRANSFORMS`, `REQUIRED_EXTENSIONS`, `POSITION_BUDGET`,
  `INDICES_BUDGET`, `POSITION_VIEW`, `MATERIAL_COLOR`,
  `DEGENERATE_TRIANGLE` and `INDEX_BOUNDS`.
- `bpc_xr_candidate=false`: BPC has additional source-coordinate limits
  (currently +/-30), even if Framefield's editor would accept the mesh.
- `rights=NOT_EVALUATED`, `physical_windows_export=NOT_TESTED`,
  `physical_quest_3=NOT_TESTED`: intentional, never inferred from a model hash.

The profile is pinned to a reviewed Framefield source revision:

```text
54be5e82019fc4943021899dcc2e611d0b7b6682
```

Future Framefield changes require explicit re-review. This analyzer is **advisory**:
the browser's own import parser remains authoritative.

## Isolated cross-repository CI

`.github/workflows/framefield-contract.yml` checks out that exact **public
source revision** of FramefieldStudio and runs synthetic GLB fixtures through:

1. PixelForge's local read-only profile,
2. Framefield's real static import adapter,
3. Framefield project validation and object keyframing,
4. the real Framefield BPC XR packet exporter.

Negative fixtures check multi-mesh and transformed-node rejection. This is
stronger than merely checking matching schema names, but still **cannot**
access a local Epic installation, private Fab meshes or a physical Quest.

## Smallest first real Windows/Quest acceptance

1. Choose **one** installed, small Unreal/Fab static mesh that you have
   permission to inspect privately. Keep the original source untouched.
2. Use PixelForge's existing guarded Unreal discovery/bind/preview/confirm
   and `asset:unreal:pilot` process. Do **not** execute export from preflight.
3. After a real export, check exact file bytes and PixelForge's v5.30 structural
   receipt. Then run `asset:framefield:preflight` against that exact local GLB.
4. If the profile is a candidate, choose **Import GLB** in Framefield in your
   browser, review filename/hash/limitations and confirm. Verify appearance,
   coordinate scale, camera framing, Undo and saved JSON metadata.
5. Add an animated object-transform keyframe, export **BPC XR** from Framefield
   and load via Domistika's **read-only** receiver. Only a **real Quest 3**
   test can qualify controller interaction, performance and comfort.
6. Separately compare with PixelForge's richer texture-aware preview.
   Framefield's single-color preview is expected to **lose** textures and PBR.
7. Record the actual asset license and resulting evidence **privately**;
   don't redistribute purchased source/derived files without permission.

## Explicit non-goals

No automatic GLB conversion, multi-primitive merging, automatic decimation,
rigging, texture baking, signed provenance, publishing, asset-store approval,
image fetching, remote rendering, installed PhiOS service, or automatic
software authorization. The bridge is a reviewed local compatibility gate,
not the right to use or distribute third-party assets.
