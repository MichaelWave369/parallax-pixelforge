# PixelForge v5.28 — External Asset Forge / Unreal Arsenal Bridge

## Goal

Connect PixelForge to governed external asset libraries without turning a public MIT repository into a redistribution channel for purchased source content.

The first target is the existing 263-record Unreal/Fab arsenal catalog produced by UE Agent Office. PixelForge preserves its stable `ASSET-000xxx` identities and governance fields, but the actual catalog remains local unless the operator deliberately publishes metadata separately.

## Three routing lanes

### PORTABLE

Content that can plausibly cross an interchange boundary: environments, characters, creatures, vehicles, props, weapons, materials/textures, animation, audio, UI/media, and bundles.

Typical future outputs include GLB/FBX, textures, PixelForge sprite sheets, tilesets, background plates, and 2.5D/native-3D scene material.

### BAKEABLE

Engine-specific presentation whose **result** can be made portable. v5.28 initially routes VFX here.

Typical future outputs include flipbooks, sprite sheets, texture sequences, and background plates.

### REIMPLEMENT

Gameplay plugins, editor/production tools, templates/samples, and tutorials are not treated as portable game assets. They become references for PixelForge-native features.

## Governance rules

1. A routing lane is not a compatibility verdict.
2. `UNTESTED` remains `UNTESTED`.
3. A passport is only `qualified_for_use=true` when the source record says compatibility `PASS` and the lane verdict is approved.
4. Marketplace source files are local-only and are not committed to this public repository.
5. Export jobs require an operator to bind the real Unreal asset path.
6. Export jobs never grant redistribution rights or silently change source governance.
7. Hashes attach generated records back to the governed source metadata.

## Local workflow

Place governed source metadata somewhere outside Git, for example:

```text
local-assets/source/ue_asset_arsenal_263.records.json
```

Build passports:

```bash
npm run asset:external -- local-assets/source/ue_asset_arsenal_263.records.json
```

Prepare one Unreal export request:

```bash
npm run asset:external -- local-assets/source/ue_asset_arsenal_263.records.json \
  --record ASSET-000021 \
  --mode NATIVE_3D \
  --format GLB
```

The job is deliberately emitted with `unreal_asset_path: null` and `DRAFT_OPERATOR_BINDING_REQUIRED`. v5.28 defines and tests the boundary; a later rung can add the Unreal Editor Python executor and the first real end-to-end asset qualification.

## What v5.28 proves

- stable governed identities survive intake,
- the 263-record catalog can remain private/local,
- three-lane routing is deterministic,
- license/compatibility uncertainty is preserved,
- public-repo source leakage is guarded,
- PixelForge can create a machine-readable Unreal export request without pretending export already happened.

## What v5.28 does not claim

- no marketplace asset has been converted by this rung,
- no Unreal asset receives automatic compatibility approval,
- no license is reinterpreted by PixelForge,
- no source marketplace package is redistributed,
- no visual-quality or performance approval is machine-granted.
