# PixelForge v6 · Rung 11: Ghost Runs and Route Diagnostics

Rung 11 introduces a **local, opt-in, world-bound movement recording** for the browser World Player at `?play=1`. A previous run can be played back as a translucent, non-colliding avatar with a cyan route line. It also summarizes useful, approximate route metrics for creators and playtesters.

All Rung 5–10 playable-world, game-rules, event-graph and playtest-save formats remain **unchanged**. The ghost is saved separately and has no access to the authoritative VR Studio source, legacy v5 browser data, private GLB vault or network.

## Try it

1. Open the World Player and wait for a ready Rapier scene and its SHA-256 world digest.
2. Choose **Start Recording New Run**. Recording starts at the actual physics capsule position and samples the moving player approximately **5 times per second**, while the world is unpaused.
3. Explore using keyboard, touch, or the Rung 10 standard-mapped gamepad. Jump, sprint, activate a switch and finish an objective as desired.
4. Choose **Stop & Preview Ghost** after at least one subsequent sample. The player remains live; a translucent cyan capsule now follows the old path alongside your current movements. A cyan line marks the full sampled route.
5. **Replay Ghost from Start**, **Hide/Show Ghost & Route**, and the route metrics are all read-only actions. The ghost cannot collide, take pickups, trigger events, open doors, move crates, or affect the active playtest save.
6. **Save Ghost in Browser** explicitly saves one recording slot per exact world digest to `localStorage`; **Load Saved Ghost** restores it.
7. **Export Ghost JSON** creates `pixelforge-ghost-run.v1.json`. **Import Matching Ghost** accepts only recordings bound to the currently loaded world's validated SHA-256 digest. It does not silently save the file locally.
8. **Delete Only This World's Saved Ghost** deletes just that ghost slot. It does **not** delete the in-memory preview, other saved ghosts, Rung 9 game progress, editor files or assets.

Starting a new recording overwrites the **in-memory capture buffer**, not a previously saved local ghost slot. Restarting the playable world resets a live recording, but preserves a loaded ghost so creators can compare a new attempt with it. Switching to a different world clears the current ghost preview, and never loads foreign ghost data.

## Data contract

`pixelforge.ghost-run.v1` is declarative JSON:

```json
{
  "format": "pixelforge.ghost-run.v1",
  "world_sha256": "<64-character SHA-256 of the validated playable world>",
  "created_at": 1770000000000,
  "samples": [
    {"t":0,"position":[0,2.2,0],"grounded":true},
    {"t":200,"position":[0.4,2.2,0],"grounded":true}
  ]
}
```

**Rules and limits:** exactly the documented fields, a matching digest, finite bounded [-100,100] positions, boolean grounded state, monotonic integer times starting from 0, maximum 2400 points, maximum 600 seconds of recorded active time, and maximum 320 KB import size. Unknown and executable fields reject before visualization. The shape never embeds code, URLs, remote commands, original world JSON, private assets or game-save authority. No streaming, analytics upload or background monitoring occurs.

The SHA-256 is a **content identity check**, not authentication, tamper-proof evidence, an anti-cheat feature or proof that the path was physically traversed. A person can manually fabricate an internally well-formed matching ghost.

## Engine and performance

- The existing `PhysicsStage` render loop samples the actual player rigid body at around 200 ms intervals (only when recording and unpaused). **No extra animation loop, dependency or React frame-per-frame state updates.**
- Ghost position playback uses bounded binary-search time interpolation, `O(log n)` per frame, over the recorded route. The visual mesh is transparent and deliberately has **no Rapier rigid body or collider**.
- The route line reuses the sample positions in a single Three.js `Line` geometry and is disposed when hidden, replaced or the physics stage unmounts.
- Replay advances only while the game is unpaused and stops at the final recorded position. Press Replay again to restart it. Restart/resume re-creates the physics world, while the selected ghost recording is maintained for comparison.
- Capture is capped and stops gracefully if the path exceeds sample, time or coordinate limits.

## Route diagnostics

The World Player reports:

- Recorded elapsed **active** seconds, 3D distance traveled, average speed, approximate moving seconds.
- An **approximate count of takeoff transitions** from 5 Hz grounded samples, not a guaranteed exact jump count.
- Three most frequently visited 2-meter grid cells and estimated sampled time spent in each. A hotspot suggests a place to investigate, **not proof that a design is frustrating or broken**.

This is single-run analysis. It does not aggregate multiple players, record names/account IDs, measure internet latency, capture cameras, video, audio, exact collision events, controller input or full dynamic-body physics state. No third-party telemetry is sent.

## Automated verification

```bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
```

The new `site/scripts/ghost-run.test.mjs` covers world-bound digest mismatch, legacy playable-world integrity, strict untrusted-file parsing, duplicate/invalid times, bounded positions and duration, interpolation, realistic travel metrics, dwell-grid calculations, sample caps and source immutability.

### Manual browser acceptance checklist

1. Open `?play=1`; start recording, move 20 seconds, stop, and confirm a transparent ghost follows the prior path. Watch the cyan route line and the diagnostic metrics.
2. Run alongside the ghost. Verify it passes through geometry **without influencing collisions**, never collects objects, never switches doors, and does not change the player's Rung 9 progress.
3. Pause/resume and replay the ghost, checking that playback pauses and resumes and does not restart unexpectedly during ordinary HUD updates.
4. Hide and show the ghost; restart the live world. Confirm the route survives as an in-memory visual until changed.
5. Save Ghost locally, refresh, load the saved ghost; export JSON and reimport the same file.
6. Modify the loaded playable world's gravity or a rule while keeping the descriptive source hash unchanged, then try the old ghost file. Confirm world digest mismatch rejection.
7. Try malformed JSON, an oversized file, extra script/URL fields, repeated timestamps, invalid positions, invalid grounded state and a recording from a different world. Confirm clear rejection without code execution.
8. Switch to another world and confirm neither the old ghost nor its browser-local slot is automatically loaded into the new world.
9. Re-test Rung 9 save/resume/checkpoint, Rung 10 gamepad controls and original VR Studio/v5 routes. Confirm no private GLB assets appear in the published bundle.
10. Validate real-browser graphics and controller performance manually. CI unit tests and successful Vite compilation do **not** qualify Playwright/browser UX or Quest 3 runtime.

## Next milestones

A future **Playtest Inspector** could compare several separately imported paths, visualize repeated hesitation zones across participants with explicit opt-in, attach editor-authored checkpoint notes and produce downloadable diagnostics. Self-contained offline player packaging, physical controller qualification and full-frame physics replay remain distinct future work.
