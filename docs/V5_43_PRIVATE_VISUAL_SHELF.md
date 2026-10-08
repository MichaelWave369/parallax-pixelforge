# PixelForge v5.43 — Private Visual Asset Shelf and Reviewed Export Queue

## Why

v5.41 connected the owner's 263-record Unreal asset inventory to VR Studio. v5.42 linked locally verified Unreal exports to a selected asset by hash. **v5.43 makes a large library easier to browse and batches the planning step**, without sending copyrighted assets to GitHub or handing a browser control of Unreal Editor.

## Private thumbnail gallery

1. Open [VR Studio](../vr-studio/index.html) locally or from the React GitHub Pages portal.
2. Under **My Unreal Asset Library**, load your local `Mikey_UE_Asset_Arsenal_263.records.json` (or another governed v5.28 records/registry JSON).
3. Prepare optional local thumbnail images named to match governed IDs. Examples: `ASSET-000021.png`, `ASSET-000037.jpg`, `ASSET-000115.webp`. Thumbnails may be exported preview screenshots, but must be yours to use in this private workflow.
4. Click **Add private thumbnails**, choose one or more files, and use **Visual gallery**. Items without thumbnails retain a category placeholder. **Compact list** is available for quick review.
5. Search and filter by product, category, publisher, genre and route as before. Selecting a card still fills the governed `ASSET-000xxx` identity and supports the previously built hash-bound GLB handoff.

Thumbnails are validated by ID, MIME, extension, encoded file size and actual image decode. They are limited to **400 files, 2 MB each, 64 MB total and 1600 pixels per image dimension**. Images use temporary browser Blob URLs and are revoked on replacement, clearing or page exit. Nothing persists across refresh; no thumbnail files are checked into Git or transmitted to GitHub Pages. There is no bulk Unreal Marketplace image scraper.

## Operator-reviewed planning queue

1. Select a supported `PORTABLE` static-3D candidate in the asset gallery. Only types routed to PixelForge `NATIVE_3D` GLB preparation can be queued. Unreal editor tools, game plugins, VFX, audio, UI, standalone textures and animations cannot silently masquerade as GLB world models.
2. Click **Add to export planning queue**. Repeat for up to **24** records. Queued cards show a `QUEUED` marker and each entry can be removed.
3. Review the visible list, including IDs. Check **I've reviewed these asset IDs for local export planning**. Any addition/removal resets this confirmation.
4. Click **Download reviewed queue JSON** to create `pixelforge-unreal-export-queue.v1.json` on your machine. This holds only IDs and the fixed `PLAN_ONLY_NO_EXECUTION` boundary, not private catalog details or Unreal paths.

The browser **does not** run Unreal, call a local shell, install purchased assets, export meshes, approve a license, or change any agent authority. Review here authorizes *only creation of non-executable local draft job files after a separate CLI confirmation*.

## Convert the queue into local draft jobs

Use a local PixelForge checkout on your Windows development machine. Place your private governed records JSON in the ignored `local-assets/source` folder as documented in v5.41, then run:

```powershell
npm run asset:unreal:queue:plan -- local-assets/source/ue_asset_arsenal_263.records.json "C:/Users/You/Downloads/pixelforge-unreal-export-queue.v1.json" --confirm-plan
```

The Downloads path is an example; replace it with where your browser saved the queue. The CLI strictly rechecks the downloaded queue against the **actual local catalog** and the existing Asset Forge classification, then creates individual job documents under:

```text
local-assets/jobs/queue-drafts/ASSET-000021.unreal-export-job.v1.json
```

Every draft remains `DRAFT_OPERATOR_BINDING_REQUIRED`, with no Unreal `/Game` path, no executor authority and no compatibility/license approval. Existing drafts are **never silently overwritten**; conflicting inputs block the operation.

For each draft you decide to pursue, use the already-built **Unreal discovery → explicit bind → explicit execute → verification → v5.42 hash handoff** steps, described in [v5.29 export executor](V5_29_UNREAL_EXPORT_EXECUTOR.md) and [v5.42 handoff](V5_42_UNREAL_ASSET_HANDOFF.md). The queue is a convenience for planning, *not automatic batch export*.

## Security and truth boundaries

- GitHub Pages serves only public application source and assets on its allowlist, never the private inventory, thumbnail files, exported GLBs, Unreal projects or local handoffs.
- Third-party asset usage remains governed by individual source terms. Ownership/library presence alone does not establish redistribution permission.
- Every queued ID is revalidated on the local machine against a real asset record and supported export lane. Client-provided claims of execution, compatibility or license approval are rejected.
- Static browser controls cannot access a private drive, invoke Unreal, or bypass native OS permissions.
- Browser-selected thumbnail previews remain in session memory. Queue JSON contains only planning metadata; loaded world JSON remains on its existing v1 scene format.
- This rung does not manufacture 3D models, auto-generate thumbnails, measure visual fidelity or qualify WebXR hardware.

## Acceptance test

1. Load a 263-entry local private catalog and confirm that gallery and compact list show the same filtered assets.
2. Load `ASSET-000021.png` and `ASSET-000037.jpg` together. Verify both appear only on corresponding catalog cards. Try an unknown ID, duplicate, malicious extension, SVG or oversized image: the loader should reject it.
3. Queue three eligible 3D records. Confirm the queue review checkbox resets after adding/removing a record. Reject a tool/plugin/VFX category from the GLB queue.
4. Download the reviewed JSON. Verify IDs and `PLAN_ONLY_NO_EXECUTION` are present, but no local paths or asset payloads are present.
5. Run the local CLI **without** `--confirm-plan`; it must refuse. Run with confirmation; only local v1 draft files should appear.
6. Run the same confirmed queue again; existing drafts must not be overwritten. Mutate the local category or queue authority: the CLI must reject.
7. Verify a v5.42 handoff and its exact exported GLB can still be loaded from the library after switching gallery/list, with the same rights and performance warnings.

`npm run test:vr-shelf` covers queue validation, classification, spoofed authority rejection, thumbnail naming/budgets, 263-item fixture coverage and a local CLI smoke test. Root `npm test` includes this rung. **Browser appearance and actual Unreal export execution require separate manual testing**.
