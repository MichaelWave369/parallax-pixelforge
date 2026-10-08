# PixelForge v5.42 — Verified Local Unreal GLB Handoff

## Why

v5.41 made the user's private 263-asset Unreal/Fab catalog searchable inside VR Studio, but the selected `ASSET-000xxx` ID and the chosen GLB file were independently supplied. Selecting the wrong GLB could silently create a misleading pairing.

**v5.42 introduces an optional evidence-bound path.** The existing local Unreal exporter already produces a job v2 and a GLB export receipt. A new operator-run command independently verifies those records and the actual file content before creating a browser-importable metadata handoff. The Studio then compares the selected ID, local GLB name, byte count and SHA-256 before rendering.

## One-time local workflow

1. In your local PixelForge checkout, load or prepare the private 263-record catalog under `local-assets/source/` and generate a job for the selected asset, following the existing [v5.41 collection guide](V5_41_PRIVATE_UE_ASSET_LIBRARY.md).
2. Use the v5.29 Unreal discovery, bound-job and `--execute` tools to export the exact asset and produce `local-assets/receipts/ASSET-000021.unreal-export-receipt.v1.json`. The actual engine path and `/Game` path require operator selection.
3. Verify and structurally inspect the file by using the existing `npm run asset:unreal:verify` and `npm run asset:glb:inspect` commands.
4. Generate a fresh, local-only handoff (replace paths with the actual job and receipt for your asset):

```powershell
npm run asset:vr:handoff -- local-assets/jobs/ASSET-000021.unreal-export-job.v2.json local-assets/receipts/ASSET-000021.unreal-export-receipt.v1.json
```

This uses the same `verifyUnrealExportReceipt` checker as v5.29, performs structural GLB inspection, then writes:

```text
local-assets/handoffs/ASSET-000021.vr-asset-handoff.v1.json
```

The handoff contains only `record_id`, `source_record_sha256`, GLB basename, byte count and SHA-256, producer/evidence flags, and a warning. It contains **no model bytes, absolute filesystem paths, source asset packages or credentials**. Creation is deliberately non-overwriting; delete or archive a stale private handoff yourself before generating a replacement.

## Browser workflow

1. Open VR Studio from your PixelForge React Pages site or the local server.
2. Open **My Unreal Asset Library** and select the correct catalog record, for example `ASSET-000021`.
3. Under **Unreal Export Evidence**, load the generated local handoff JSON. The handoff record ID must match the `ASSET-000xxx` ID displayed in the editor.
4. Select **Import local GLB geometry** or choose **Use this asset's GLB** in the library dock, then select the exported local `.glb`.
5. The browser checks ID + name + length and computes SHA-256 on the selected file. On mismatch, **no object is added**. On match, the existing bounded static-GLB importer still must decode the mesh and materials successfully.
6. The importer clearly reports a handoff hash match, but **does not promote the asset to licensed, qualified, runtime-ready, or performance-approved**.

To experiment without a local receipt, use **Clear handoff · Return to manual mode**. Manual mode remains available and is explicitly labeled **MANUAL / UNVERIFIED**. A previously bound handoff never silently falls back to manual mode after a hash mismatch.

## Scope and trust

- This is file **integrity linkage**, not a cryptographic attestation of authorship. Anyone can type JSON with matching values; the reliable workflow is using the local CLI against your own operator-bound Unreal export job and original receipt.
- It does not prove that the selected Unreal package was honestly identified, purchased licenses permit a proposed use, or the asset renders exactly as it did in Unreal.
- Catalog files, handoffs and GLB bytes are **not committed** to GitHub and stay under ignored `local-assets/` or in temporary browser memory. The existing world-v1 schema and localStorage remain unchanged, storing only object transforms and GLB hash/file identity.
- GitHub Pages remains purely static. It has no authority to run Unreal Editor, access private paths, or execute a local export queue.
- GLB import remains bounded to existing static geometry/texture subsets, 50 MB input and renderer budgets, with no physics, skeletal animation, collision or headset certification.

## Manual QA

1. After installing an asset locally in UE, export a small static-mesh GLB using the existing local job, then generate a handoff.
2. Select the matching catalog asset, import the matching handoff, and then import the exported GLB. The world should gain exactly one object.
3. Repeat with wrong catalog ID, wrong file name, wrong byte count, and a same-named GLB whose bytes differ. All must reject, without mutating the scene.
4. Clear the handoff, import a fixture GLB manually, and confirm the status says **UNVERIFIED**.
5. Undo a successful import, save/reload the world and confirm no handoff metadata, path or purchased binary appears in scene JSON.
6. Rebind a saved world with the exact GLB SHA already in the scene. Confirm unchanged behavior.

## Automated tests

`npm run test:vr-handoff` exercises the pure receipt validator, negative controls, and a local executable smoke test that generates a real structural GLB, hashes it, produces a handoff, refuses a silent overwrite, and rejects a changed file.

All tests are also part of root `npm test`. Successful CI does not qualify actual Unreal exporter integration, hardware rendering or legal source rights.
