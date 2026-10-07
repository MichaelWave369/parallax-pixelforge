# PixelForge v5.29 — Unreal Export Executor

## Goal

Turn the v5.28 Unreal/Fab bridge from a governed planning contract into an executable local workflow without moving gameplay authoring into Unreal.

v5.29 keeps Unreal in a narrow role:

1. load one explicitly bound asset,
2. export it through Unreal's glTF exporter,
3. hash the output,
4. write a machine-readable receipt,
5. return control to PixelForge.

No Blueprint gameplay, C++ gameplay, or authority transfer is introduced.

## Supported first proof

The first execution lane is intentionally small:

- input job: `pixelforge.unreal-export-job.v1`
- bound job: `pixelforge.unreal-export-job.v2`
- interchange formats: **GLB / glTF**
- intended first governed record: **ASSET-000021 — Stylized Fantasy Environment**
- execution: `UnrealEditor-Cmd` + `-ExecutePythonScript`
- required editor plugins:
  - PythonScriptPlugin
  - EditorScriptingUtilities
  - GLTFExporter

The UE Agent Office scaffold already uses the same command-line editor/Python execution pattern, so PixelForge reuses a proven local automation shape rather than inventing a second one.

## Local workflow

### 1. Generate the v1 draft job

```bash
npm run asset:external -- local-assets/source/ue_asset_arsenal_263.records.json \
  --record ASSET-000021 \
  --mode NATIVE_3D \
  --format GLB
```

### 2. Bind the actual Unreal project and asset path

The asset path is the Unreal object/content path, for example `/Game/Fantasy/SM_Castle`. It is not a Windows file-system path.

```bash
npm run asset:unreal:bind -- \
  exports/external-assets/ASSET-000021.unreal-export-job.v1.json \
  --project "D:/Unreal/MyProject/MyProject.uproject" \
  --asset-path "/Game/Fantasy/SM_Castle"
```

This produces a local-only v2 job under `local-assets/jobs/`.

### 3. Plan the Unreal command

```bash
npm run asset:unreal:run -- \
  local-assets/jobs/ASSET-000021.unreal-export-job.v2.json \
  --engine-root "C:/Program Files/Epic Games/UE_5.4"
```

Without `--execute`, PixelForge only verifies paths and records the exact command it would run.

### 4. Execute

```bash
npm run asset:unreal:run -- \
  local-assets/jobs/ASSET-000021.unreal-export-job.v2.json \
  --engine-root "C:/Program Files/Epic Games/UE_5.4" \
  --execute
```

Unreal runs `tools/unreal/export_pixelforge_asset.py`, writes the GLB/glTF into the local staging directory, and emits an Unreal export receipt.

### 5. Verify the returned file

```bash
npm run asset:unreal:verify -- \
  local-assets/jobs/ASSET-000021.unreal-export-job.v2.json \
  local-assets/receipts/ASSET-000021.unreal-export-receipt.v1.json
```

A verified result becomes:

```text
EXPORT_VERIFIED_IMPORT_PENDING
```

That status proves file production, byte count, governed-record linkage, and SHA-256 integrity.

It deliberately does **not** set:

- compatibility PASS,
- lane approval,
- license approval,
- visual approval,
- PixelForge runtime readiness.

## Safety / truth boundaries

- v5.29 never guesses a marketplace pack's real Unreal object path.
- the operator binds the real `.uproject` and Unreal asset path.
- source and generated third-party payloads remain under ignored `local-assets/`.
- existing output files are not overwritten.
- a missing Unreal executable, project, asset, or GLTF exporter blocks honestly.
- successful export is not equivalent to successful PixelForge import or game suitability.

## Why GLB first

GLB gives the first proof a compact interchange target and avoids a multi-file glTF sidecar bundle for common model/material/texture exports. Later rungs can add FBX, PNG/flipbook baking, batch-pack discovery, automated preview rendering, optimization profiles, and actual PixelForge runtime ingestion.
