# PixelForge v5.41 — My Unreal Asset Library

## The bridge we already had

PixelForge v5.28 defined a governed three-lane Unreal/Fab asset registry; v5.29 added operator-bound local Unreal Editor glTF export; v5.30 added Unreal asset discovery, byte/hash verification and structural GLB inspection; v5.31 added a native WebGL2 GLB viewer; v5.36-v5.40 added world placement, textures, manipulation and lighting.

**v5.41 connects that pipeline to an actual private, searchable collection panel inside VR Studio.** The first target is the user's existing 263-entry Unreal asset inventory, but the browser tool accepts any bounded governed asset records array or `pixelforge.external-asset-registry.v1` JSON. This is not a third-party asset streaming service.

## Your actual 263-asset collection

The original workbook is `Mikey_UE_Asset_Arsenal_263.xlsx`, sheet `Master Inventory`. It has 263 entries. The conversion file delivered separately in this conversation is `Mikey_UE_Asset_Arsenal_263.records.json` and maps the IDs to `ASSET-000001` through `ASSET-000263`. It preserves product names, publishers, categories, themes, usage roles, overlaps, priorities and ownership/install/audit notes. It deliberately sets **compatibility `UNTESTED` and lane verdict `UNDECIDED`** rather than claiming the inventory has passed the PixelForge renderer or licensing gate.

The full inventory is **not committed** to the public PixelForge repository or GitHub Pages. Use the JSON file locally to import it into the browser.

## Browser workflow

1. Open VR Studio from the React Pages PixelForge portal or from `http://localhost:3690/vr-studio/`.
2. Under **MY UNREAL ASSET LIBRARY**, choose **Open private catalog (.json)** and select your downloaded `Mikey_UE_Asset_Arsenal_263.records.json` file.
3. Search by asset name, publisher, category, setting or project. Filter by category or PORTABLE / BAKEABLE / REIMPLEMENT route. Catalog records stay in this tab's memory; they are **not** saved to localStorage or sent to GitHub Pages.
4. Choose a record. PixelForge fills the existing `ASSET-000xxx` field for you. Its detail shows original ownership/install/audit/compatibility notes without inventing an approval.
5. For a `PORTABLE` 3D candidate, click **Use this asset's GLB** and choose a GLB you already exported from that exact Unreal item. PixelForge's existing bounded GLB mesh/texture importer calculates a SHA-256 and places the actual geometry in the current world.
6. For an asset that is **not yet exported**, click **Copy Unreal export plan command** and use the locally installed PixelForge + Unreal workflow below. GitHub Pages cannot execute Unreal or inspect a private asset directory on its own.

## Local Unreal export example

Move or copy the supplied JSON catalog to the already ignored `local-assets/source/` folder in your PixelForge repository checkout, naming it `ue_asset_arsenal_263.records.json`. The `local-assets/` directory and `exports/external-assets/` are already gitignored.

Generate a draft v1 export job for the governed record:

```powershell
npm run asset:external -- local-assets/source/ue_asset_arsenal_263.records.json --record ASSET-000021 --mode NATIVE_3D --format GLB
```

Choose the real Unreal `*.uproject` and correct `/Game/...` asset path. Do not guess it from the marketplace title. The existing discovery command can enumerate candidates:

```powershell
npm run asset:unreal:discover -- --project "D:/Unreal/MyProject/MyProject.uproject" --engine-root "C:/Program Files/Epic Games/UE_5.4" --record ASSET-000021 --query "Stylized Fantasy Environment"
```

Discovery is a **dry run** unless the operator passes `--execute`. After reviewing a discovery result and identifying the intended object, create a bound job:

```powershell
npm run asset:unreal:bind -- exports/external-assets/ASSET-000021.unreal-export-job.v1.json --project "D:/Unreal/MyProject/MyProject.uproject" --asset-path "/Game/Fantasy/SM_Castle"
```

The `/Game/Fantasy/SM_Castle` path here is a **placeholder**, not a verified asset location. After binding, preview the command, then explicitly execute:

```powershell
npm run asset:unreal:run -- local-assets/jobs/ASSET-000021.unreal-export-job.v2.json --engine-root "C:/Program Files/Epic Games/UE_5.4"
npm run asset:unreal:run -- local-assets/jobs/ASSET-000021.unreal-export-job.v2.json --engine-root "C:/Program Files/Epic Games/UE_5.4" --execute
```

Verify the export and structural container:

```powershell
npm run asset:unreal:verify -- local-assets/jobs/ASSET-000021.unreal-export-job.v2.json local-assets/receipts/ASSET-000021.unreal-export-receipt.v1.json
npm run asset:glb:inspect -- local-assets/staging/ASSET-000021/ASSET-000021.glb
```

Finally, in the library dock, select `ASSET-000021`, click **Use this asset's GLB**, and choose the verified local GLB file. Existing scene editing and lighting tools can now move, rotate, scale and shade it in PixelForge.

## Honest boundary

- A category route is **not** a legal license or rendering/compatibility approval.
- `REIMPLEMENT` content (e.g., UE gameplay plugins and editor tools) is shown for reference, not offered as a GLB export. `BAKEABLE` VFX likewise has no direct GLB binding in this first UI.
- Only likely static-3D portable categories offer the GLB action. Other portable categories (audio, UI, textures, animation) need their own interchange workflow.
- Catalog intake accepts up to 1000 records and 1 MB of JSON. The view renders up to 80 filtered results at once to keep the editor responsive.
- Browser-side library data exists in memory only until reload. World saves persist only per-asset source filenames, byte counts, SHA-256 and transform, not catalog contents or marketplace files.
- The selected file's **content is not automatically proven** to correspond to the catalog item merely because the operator entered its ID. The operator must choose the correct file and rely on Unreal's verified export receipt for trusted linkage.
- Compatibility, material fidelity, static-mesh subset, textures, collision, physics, performance, VR headset readiness and licensed redistribution require separate proof.
- This PR does not allow web browsers to launch Unreal or start local executables; that would require a separately governed and authenticated localhost operator service.

## Tests

`npm run test:vr-catalog` covers a generated 263-entry fixture, v5.28 registry intake, search/filter, route restrictions, invalid/duplicate IDs, oversized input, user-submitted approval rejection and deterministic local-only export command planning.

Root `npm test` includes catalog tests. The existing GitHub Pages bundler copies only the VR Studio source directory, never user-provided catalog files or `local-assets/`.

## Next rung

Native `.xlsx` catalog intake and a **local operator-approved export queue**, running behind a permission-checked localhost bridge, are good later targets. That is separate from GitHub Pages and needs explicit device-side authentication and command preview.
