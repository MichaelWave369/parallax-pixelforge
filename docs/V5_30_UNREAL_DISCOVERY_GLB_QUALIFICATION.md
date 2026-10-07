# PixelForge v5.30 — Unreal Discovery + GLB Structural Qualification

## Goal

Remove the last blind manual step from the v5.29 Unreal bridge while preserving a strict truth boundary around what has actually been proven.

v5.30 adds two independent capabilities:

1. **Unreal asset discovery** — search the installed Unreal project's `/Game` content tree and return ranked candidate object paths for a governed asset record.
2. **GLB structural qualification** — inspect the verified Unreal export as a glTF 2.0 binary container before any PixelForge runtime import is attempted.

## Discovery flow

PixelForge never guesses the actual Unreal object path from a marketplace product title.

Instead:

```bash
npm run asset:unreal:discover -- \
  --project "D:/Unreal/MyProject/MyProject.uproject" \
  --engine-root "C:/Program Files/Epic Games/UE_5.4" \
  --record ASSET-000021 \
  --query "Stylized Fantasy Environment"
```

Without `--execute`, this is a dry-run command plan.

Add `--execute` to launch UnrealEditor-Cmd. Unreal scans `/Game`, ranks candidate paths by normalized name/token similarity, records asset class when loadable, and writes:

```text
local-assets/receipts/ASSET-000021.unreal-discovery.v1.json
```

The receipt can say `CANDIDATES_FOUND`, `NO_CANDIDATES_FOUND`, or `FAIL`.

Discovery **never selects or exports a candidate**. The operator still decides which returned path is the intended asset before v5.29 job binding.

## GLB structural inspection

After v5.29 creates and verifies a GLB, PixelForge can inspect it without third-party dependencies:

```bash
npm run asset:glb:inspect -- \
  local-assets/staging/ASSET-000021/ASSET-000021.glb
```

The inspector validates GLB magic/version/length/chunk bounds, a single valid JSON chunk, glTF `asset.version = 2.0`, binary-chunk presence, scene/node/mesh/primitive counts, materials/textures/images, accessor/buffer counts, animations/skins/cameras, and used/required glTF extensions.

## Combined interchange qualification

```bash
npm run asset:external:qualify -- \
  local-assets/jobs/ASSET-000021.unreal-export-job.v2.json \
  local-assets/receipts/ASSET-000021.unreal-export-receipt.v1.json
```

The combined qualification first re-verifies the Unreal output byte count and SHA-256, then parses the GLB structurally.

A successful result becomes:

```text
INTERCHANGE_STRUCTURAL_PASS_RUNTIME_IMPORT_PENDING
```

That phrase is intentionally annoying and precise. It proves Unreal reported a successful export, the file exists, byte count and SHA-256 match, the GLB container is intact, its JSON describes glTF 2.0, and PixelForge can enumerate its major structural payload.

It does **not** prove rendering fidelity, material parity, correct scale/orientation, animation behavior, collision, performance, license approval, runtime import, or compatibility PASS.

## First physical target

```text
ASSET-000021
Stylized Fantasy Environment
```

The expected human-assisted sequence is:

```text
DISCOVER CANDIDATES
      ↓
OPERATOR CHOOSES /Game/... PATH
      ↓
BIND
      ↓
UNREAL EXPORT
      ↓
VERIFY SHA-256
      ↓
GLB STRUCTURAL QUALIFICATION
      ↓
RUNTIME IMPORT STILL PENDING
```

The next rung can build the actual PixelForge/WebGL preview importer and compare visual/runtime facts instead of merely interchange structure.
