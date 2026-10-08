# PixelForge v5.45: First Unreal Asset Pilot

## Goal

v5.44 added a guarded Unreal export runner. This rung helps qualify the **first real Windows workstation attempt**, instead of mistaking green GitHub CI for evidence that the owner's machine has an installed Unreal Engine, exported model, or compatible GPU output.

The new `asset:unreal:pilot` command is a **read-only inspection tool**. It checks the actual locally installed editor, bound v2 job, output/receipt evidence, stored operator review, GLB structural integrity, private hash-bound handoff, and guarded execution audit. It does not execute Unreal, automatically discover private files, access GitHub Pages, or approve source rights.

## Quick-start on Windows

In a local checkout of `MichaelWave369/parallax-pixelforge` (after merging this PR), open PowerShell in the repository directory. First run a harmless setup report:

```powershell
npm run asset:unreal:pilot
```

This may report `SETUP_OR_EXPORT_EVIDENCE_PENDING` because it has no engine path or bound job yet. That is expected, not a failed export. When you know where Epic Games installed your engine, pass the **real installation path**, not the example below:

```powershell
npm run asset:unreal:pilot -- --engine-root "C:/Program Files/Epic Games/UE_5.4"
```

If the job is not yet bound, select an owned, installed static model and use the v5.29/v5.43 flow to produce a validated `.uproject` and exact `/Game/...` object path. The catalog name is not a valid substitute for either source path.

After binding an actual `ASSET-000xxx` job, include the local v2 job file:

```powershell
npm run asset:unreal:pilot -- --engine-root "C:/Program Files/Epic Games/UE_5.4" --job "local-assets/jobs/ASSET-000021.unreal-export-job.v2.json"
```

All asset IDs, paths and engine versions above are **examples**. Use the actual record ID of the item selected from your private catalog and a verified path on your Windows machine.

## Diagnostic stages

| Stage | Meaning |
|---|---|
| `SETUP_OR_EXPORT_EVIDENCE_PENDING` | Missing input or partial setup; use the report to see what is needed |
| `READY_FOR_OPERATOR_PREVIEW_OR_CONFIRMATION` | The engine binary and bound job passed read-only checks; run the v5.44 guarded **preview** first if no review exists |
| `BLOCKED_REVIEW_REQUIRED` | A path, review, lock, output, SHA or receipt is missing/invalid in a way requiring investigation |
| `GLB_HANDOFF_INTEGRITY_VERIFIED` | The local GLB and original receipt match, structural inspection passes, and the private handoff agrees with the source record |

Every run writes a JSON report under the already ignored:

```text
local-assets/reports/unreal-first-run-<timestamp>-<random>.json
```

The report includes bounded check IDs, outcomes, local job SHA-256, and the exact trust boundary. It avoids embedding a private asset catalog or GLB bytes. Keep diagnostic reports private too, as failures may contain local path hints.

## Conduct the first hands-on proof

1. Choose **one small installed static mesh** with a license permitting the intended private use. The 263-asset inventory is a catalog, not evidence those marketplace packs are installed.
2. Verify your actual Unreal version/project and `/Game/...` object path with existing discovery tools. Bind one local v2 job.
3. Run `npm run asset:unreal:pilot` with both your engine root and the bound job. Resolve any blocked/needs-input items.
4. When the pilot reports preview readiness, run `npm run asset:unreal:guard` **without** `--execute`. Inspect the operator review's ID, project, asset path, executable, output and SHA-256.
5. Only if it is the intended asset, run the guarded runner again with `--execute --confirm-id ASSET-xxxxxx --confirm-job <printed-12-char-prefix>`. This is the deliberate execution step, not part of the pilot.
6. Repeat the pilot after export. If file integrity is verified, select that asset from your private PixelForge visual gallery, load its private v5.42 handoff, then select the matching GLB.
7. In VR Studio, inspect textures, relative size, rotation, lighting, and visual appearance. Record observed differences and performance. Browser and headset outcomes cannot be inferred from CI.

## Boundaries

- **No auto install or cloud streaming of Epic/Fab assets.** Asset source files remain private and license restrictions still apply.
- The pilot is **nonexecuting** and makes no file changes other than a uniquely named private diagnostics report.
- Its engine-binary check does not establish required Unreal plugins, an executable working engine, or a successful Python export.
- A source record hash and GLB handoff integrity match are not a publisher-signed provenance certificate.
- A successful GLB handoff does not establish PixelForge renderer compatibility, game performance, legal redistribution permission, or VR comfort.
- The older unguarded v5.29 exporter still exists for developers; the new pilot does not grant system-wide execution privileges or sandboxing.
- If an export lock remains from an interrupted run, do not delete it without checking for live Unreal processes and partially written outputs.

## Automated regression tests

`npm run test:unreal:pilot` covers setup reports without inputs, fake local Windows engine discovery, bound v2 jobs, job-SHA reviews, structural GLB export/receipt integrity, v5.42 handoff linkage, mutated bytes and missing outputs/locks.

**CI uses simulated fixture files; it cannot touch the owner's Unreal installation.** The first actual Windows pilot remains an operator action.
