# PixelForge v5.44 — Guarded Single-Asset Unreal Export

## Purpose

v5.43 added a browser-only review queue that creates local draft Unreal jobs, **not** UE executions. v5.44 adds an explicitly approved **one-asset-at-a-time local runner** for the already available Unreal CLI/exporter, with a two-phase review, SHA-bound operator confirmation, no overwrite and post-export verification. There is no network service, background agent or remote Pages execution.

**This is a local Windows/Unreal workflow.** The GitHub Actions checks run fixtures and contract tests, not an actual installed Unreal Editor.

## First: prepare a real bound job

Using the existing Asset Forge planning queue, generate a v1 draft for a real owned/installed item. Locate the actual Unreal `.uproject` and `/Game/...` object with the existing discovery tool and explicitly bind that path:

```powershell
npm run asset:unreal:bind -- local-assets/jobs/queue-drafts/ASSET-000021.unreal-export-job.v1.json --project "D:/Unreal/MyProject/MyProject.uproject" --asset-path "/Game/Fantasy/SM_Castle"
```

The example project and object paths above are **placeholders**. Do not execute them without inspecting the installed Unreal content. The local binding command produces a `local-assets/jobs/ASSET-000021.unreal-export-job.v2.json` document in a gitignored directory. The record must correspond to a real `NATIVE_3D` GLB candidate, and you must respect the marketplace asset's terms.

## Phase 1: preview and record operator review

```powershell
npm run asset:unreal:guard -- local-assets/jobs/ASSET-000021.unreal-export-job.v2.json --engine-root "C:/Program Files/Epic Games/UE_5.4"
```

The **default mode never launches Unreal**. It checks that the job has a strict v2 schema, exactly one `ASSET-000xxx` identity, ready/bound state, `NATIVE_3D`/`GLB` target, `/Game/` object path, existing `.uproject`, local ignored staging/receipt paths, correct no-overwrite flags and installed `UnrealEditor-Cmd` executable. It hashes the original v2 job bytes and writes a private:

```text
local-assets/reviews/ASSET-000021.unreal-operator-review.v1.json
```

Read the printed **ID, source project, Unreal object path, executable, output path and full job SHA-256**. All must match the asset you intend to export. The runner prints the first 12 hex digits as `APPROVAL PREFIX`. Re-running the same preview preserves the identical review; changed jobs/paths require deliberately archiving the stale review and previewing again.

## Phase 2: explicitly approve one exact job

Only after reviewing the preview, enter both the chosen ID and the printed 12-character SHA prefix:

```powershell
npm run asset:unreal:guard -- local-assets/jobs/ASSET-000021.unreal-export-job.v2.json --engine-root "C:/Program Files/Epic Games/UE_5.4" --execute --confirm-id ASSET-000021 --confirm-job ABCDEF123456
```

`ABCDEF123456` is an example, **not** the approval prefix for your actual job.

The runner recomputes job SHA-256, independently checks the review matches the current project, object path, target and Unreal installation, verifies operator-confirmed values, and creates an exclusive local lock. It invokes the existing `scripts/run_unreal_export.py` and Unreal-side `tools/unreal/export_pixelforge_asset.py` with argv-only subprocess execution (no interpolated shell command). The older runner remains a separate lower-level tool; this guard does not claim to make all Unreal automation paths obey its policy.

Unreal exports the one selected asset (if the engine/plugins/content are available). If the process reports success, PixelForge independently checks the real GLB file size, SHA-256 and structural validity against the original Unreal receipt. It then produces:

```text
local-assets/handoffs/ASSET-000021.vr-asset-handoff.v1.json
local-assets/receipts/ASSET-000021.guarded-unreal-invocation.v1.json
```

The former is a **private, metadata-only v5.42 browser handoff**. Select that handoff, the same catalog asset and the corresponding local GLB in VR Studio to place the exported mesh into your world. The latter is an audit summary for the locally approved run. If the export fails, the runner reports a failure and does not publish an approved handoff.

## Deliberate safety constraints

- **Only one bound v2 job per execution.** A browser gallery or batch queue does not launch processes.
- Requires two separate operator actions: preview/save a review, then repeat with `--execute`, exact ID and matching 12-character job hash prefix.
- Rejects changed, forged or stale reviews; invalid source identities; non-GLB/non-3D lanes; unbound assets; path escapes and symlinked output paths.
- Blocks existing GLB outputs, Unreal export receipts, browser handoffs, or guarded-run receipts. Does not silently overwrite or retry failed jobs.
- `local-assets` outputs are ignored by Git and never delivered via GitHub Pages. Private UE packages stay on the owner's computer.
- A local run lock prevents concurrent invocations of this guarded command for the same ID.
- No new server listener, RPC, browser command execution, AI agent authority, Unreal gameplay dependency, live cloud connection, or public asset publication.
- The review is **operator policy evidence**, not an adversary-proof digital signature; anyone with write access to this local machine can potentially modify local documents. Confirm the source rights before public use.
- File integrity, asset-export success and structural GLB validity do **not** prove equivalent Unreal lighting/PBR, skeletal animation, physics, performance, game suitability, VR comfort or marketplace redistribution permissions.
- If Unreal crashes or times out, inspect local outputs and process state before retrying. A leftover `.guarded-unreal.lock` may indicate an interrupted run and requires manual investigation.

## Tests and acceptance

`npm run test:unreal:guard` tests job hashes, review immutability, record and hash prefix confirmation, format/path/symlink rejection, overwrite safeguards, missing Unreal binary and CLI refusal of requests without approval. It is integrated into root `npm test`.

**Local manual acceptance (not covered by CI):** Export one small, installed licensed test asset after reviewing its job; confirm one GLB, one native receipt, one guarded-run audit and one v5.42 private handoff exist. Confirm the exact GLB imports in PixelForge VR Studio. Try a modified job after preview, reused output path and a non-matching record; each must refuse before launching Unreal.

## Next

Once the guard is proven on the owner's Windows workstation, we can add a **local-only, authenticated desktop operator console** and a documented thumbnail capture adapter. Neither can be safely exposed as an unauthenticated public GitHub Pages action.
