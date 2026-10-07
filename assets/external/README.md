# External Asset Forge

This directory contains **contracts, schemas, policies, and synthetic examples only**.

Purchased marketplace source files and private inventories belong outside the public repository under the ignored local vault:

```text
local-assets/
  source/
  staging/
  receipts/
```

## v5.28 lanes

- **PORTABLE** — source content that can plausibly move through an interchange/bake pipeline.
- **BAKEABLE** — engine-specific presentation such as VFX whose output can be rendered/baked into portable game material.
- **REIMPLEMENT** — plugins, editor tools, templates, tutorials, or systems that are references for a PixelForge-native implementation rather than direct exports.

A routing lane is not a compatibility verdict. `UNTESTED` remains `UNTESTED` until an actual qualification run says otherwise.

## Local intake

```bash
npm run asset:external -- /absolute/path/to/ue_asset_arsenal_263.records.json
npm run asset:external -- /absolute/path/to/ue_asset_arsenal_263.records.json --record ASSET-000021 --mode NATIVE_3D --format GLB
```

The command writes sanitized passports and optional Unreal export-job manifests to `exports/external-assets/`. It never copies marketplace source files into the repository.
