# PixelForge v6 · Rung 12: Playtest Inspector

Rung 12 adds a **local, opt-in, multi-run comparison tool** inside the World Player (`?play=1`). It analyzes up to **four existing Rung 11 ghost recordings** of the **exact same validated playable world** and displays a top-down route map, per-run statistics and grid cells visited by multiple runs.

There is **no analytics backend, no account, no identity, no hidden upload and no automatic persistence of the comparison**. No changes are made to Rung 5–11 playable-world, game-rules, event-graph, game-save or ghost-run file formats. Existing Studio, private asset vault and source VR scenes are untouched.

## Use the Inspector

1. Open World Player (`?play=1`) and load the desired playable world. Wait for the SHA-256 content digest.
2. Record a route in the Rung 11 Ghost Runs panel and select **Add Current Ghost**, or select **Import Ghost Runs** and choose one or more previously exported `pixelforge.ghost-run.v1` JSON files. Each file is parsed with the existing strict Rung 11 validator. Total comparison size is **1–4 recordings**; invalid, duplicate and foreign-world recordings reject.
3. The **top-down X/Z map** overlays the routes in distinct colors, with a start dot and end square for each run. Orange dotted circles mark grid cells that were visited by **at least two distinct recordings**.
4. Compare duration, 3D distance, average speed, time moving, approximate jump count and sample count in the table.
5. Review **Overlapping Dwell Cells**: 2-meter cells, count of distinct recorded runs that visited each, combined sampled seconds and average seconds among visitors. Up to eight are shown.
6. Remove individual runs, clear the entire temporary list, or select **Export Summary Report** to download a JSON report for documentation and later analysis. Import, removal and clearing modify only transient Inspector state, not saved ghosts or game progress.

## UI and statistical boundaries

- Each route uses an SVG polyline derived from x/z positions in world-relative meters, downsampled to at most about 400 map points. The first and last point are always preserved. This reduces browser UI load for full 2,400-sample ghosts.
- World bounds are derived from all selected routes, padded for stationary or straight-line paths. The shared grid is independent of map zoom.
- Each 2-meter grid cell gets **one visit per recording**, regardless of how many samples that recording contains in the cell. Dwell time is estimated using the timestamp delta to the next sample, attributed to the starting sample's cell.
- Shared cells are ranked by distinct run count, then total sampled seconds; only cells visited in **at least two** recordings are reported. A single recording can never constitute a multi-run consensus.
- Importing the **same sampled route twice** is rejected, including when its filename or creation timestamp differs. The app does not attempt to verify whether two apparently different recordings came from independent people.
- The route is top-down x/z only. The table distance metric remains true sampled 3D distance. Vertical paths can overlap on the map but differ by elevation.

**Interpretation matters:** a shared hotspot indicates overlapping time sampled in a place. It can reflect a long conversation, a scenic vista, a safe spawn, a puzzle, a camera problem or the player simply enjoying the level. It is **not evidence by itself of frustration, failure, crashes, poor UX, or accessibility issues**. Treat hotspots as candidates for hands-on observation rather than conclusions.

## Safety, privacy and export

Input files must satisfy the `pixelforge.ghost-run.v1` contract and match the **entire validated world SHA-256**. Each ghost still has the existing 320 KB import cap, 2–2,400 samples, monotonic time and bounded finite coordinates. A comparison cannot exceed four files and rejects duplicate sampled routes. Filenames are not included in analytics.

The new `pixelforge.playtest-report.v1` report is a **summary-only export**, containing:
- Format, world SHA-256, report timestamp and compared run count
- Per-run anonymous labels (Run 1–4), duration, distance, speed, moving seconds, estimated jumps and sample count
- Up to eight shared 2-meter cells and aggregate sampled dwell metrics
- Explicit interpretation and authenticity caveats

**Raw player trajectories, individual sample arrays, original ghost creation timestamps, account data and identifiers are excluded** from the report. Note that a summarized cell coordinate can still reveal a location **within the authored game world**, so creators should review exported reports before sharing.

The reporter cannot authenticate a player, prove that a route was genuinely walked, infer identity, validate disability/accessibility, or grade gameplay quality. All routes, including manually edited files, remain user-controlled data. The report does not grant any network, file, script or external action authority.

## Automated verification

```bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
```

`site/scripts/playtest-inspector.test.mjs` covers:
- Same-world digest binding and foreign-revision rejection
- Four-run cap, duplicate-route rejection and malformed sample refusal
- Distinct-run cell overlaps and bounded aggregation
- Top-down preview bounds for negative, straight and stationary routes
- Sample downsampling and preserved endpoints
- Summary-only report with no raw sample arrays
- Empty list behavior, no creator-world mutations and timestamp checks

## Browser acceptance checklist

1. Open `?play=1`, load the public course, and record two **different** journeys with Ghost Runs, exporting each as JSON. Import both using **Import Ghost Runs**. Confirm two colored paths, correct endpoints and per-run metrics.
2. Use **Add Current Ghost** to include the active loaded recording. Confirm a duplicate of one already imported is rejected even with a different filename or timestamp.
3. Record a third and fourth distinct path; confirm four entries. Attempt a fifth: the Inspector must reject without disturbing the current comparison.
4. Import a ghost with a different world digest or changed source geometry; confirm rejection. Import mixed valid/invalid files together: none should be added.
5. Compare two paths with intentionally shared corridors and confirm the shared-cell list shows at least two *distinct* run visitors. Verify a single run shows no shared hotspots.
6. Remove one run and check table labels, SVG colors, shared cells and aggregate stats update. Clear Comparison and ensure browser-local ghost/game saves are unaffected.
7. Export a report and inspect its JSON. Confirm it contains summary-only metrics and shared cells, with **no** raw `samples:[...]` or `position` frame arrays.
8. Verify both the existing transparent 3D ghost and the Rung 9 Save & Replay UI continue working. Test mobile viewport scrolling for the comparison table.
9. Inspect browser network requests while importing or comparing ghost files; verify no telemetry or upload requests are issued by the new feature.
10. Conduct actual browser, touch and Gamepad playtesting. Automated CI alone does **not** certify visual precision, performance, controller behavior or gameplay conclusions.

## Follow-on options

A later rung could add consented multi-session annotation notes, per-object event-to-route correlation, or an offline self-contained playable-world ZIP for distribution. These should keep comparisons bounded and locally held until creators choose otherwise.
