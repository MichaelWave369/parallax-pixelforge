# PixelForge v6 · Rung 9 — Save, Checkpoint & Event Replay

Rung 9 adds explicitly controlled, browser-local player progress saves and inspectable deterministic gameplay-event replay to the opt-in PixelForge World Player (`?play=1`). **No existing playable-world, VR Studio, authoring sidecar, game-rules or event-graph schemas are changed.**

## Player workflow

1. Load the public sample course or a `pixelforge.playable-world.v1` JSON file.
2. Explore, collect items, activate checkpoints, unlock gates and work toward victory.
3. Click **Save Browser Progress** to create or replace this world's one browser-local slot. The operation is explicit, not background syncing.
4. After restarting the level or refreshing the page, click **Resume Browser Save** to re-create the player avatar near the saved position and restore objective and unlocked-door state.
5. **Respawn at Checkpoint** rolls the run back to the most recently activated ordinary checkpoint (a Rung 6 `trigger`), restoring the event state at that point and re-creating the Rapier world. This rolls back pickups, switches, secrets, doors and victory events that occurred *after* the checkpoint.
6. **Delete This World's Local Save** removes only the current world's playtest slot, not other saved worlds or the original VR/PixelForge authoring data.
7. **Export Save JSON / Import Matching Save** allows manual portability. Importing a save restores the current run but does not silently write to browser-local storage. The matching playable-world JSON must be loaded separately first.
8. **Event Trace / Replay** steps through recorded collect/checkpoint/switch/secret/door/win events and their player positions. This is a reproducible rules trace, **not** a video, input macro, or frame-by-frame physics/camera replay.

Restart/Respawn from the player controls starts an entirely fresh run without deleting its browser save.

## Format and safety

A `pixelforge.playtest-save.v1` JSON file contains:

```json
{
  "format": "pixelforge.playtest-save.v1",
  "world_sha256": "<64-character digest of validated playable-world contents>",
  "saved_at": 1770000000000,
  "position": [0, 2.2, 0],
  "progress": {
    "collected": [],
    "triggered": [],
    "activated": [],
    "openedDoors": [],
    "won": false
  },
  "frames": []
}
```

- The **world digest is computed from the entire validated portable world** using Web Crypto SHA-256. It includes geometry and game rules, not just `source.sha256`, which is originally unverified author metadata. Two level revisions with the same descriptive source SHA get different playtest-save slots.
- Storage key: `pixelforge.v6.playtest.v1.<sha256>` in the current browser origin's `localStorage`. No account, network service, private asset bytes, or database migration. Browser profiles, private browsing and other devices have separate storage.
- A trace is a list of event-producing `{position,interact,event_ids}` frames, not every physics tick. On import the safe, pure rules engine **replays each frame**, checks exact event IDs and ordering and checks the resulting progress against the supplied saved progress. Fabricated door state, mismatched world revisions, unexpected fields and replay-inconsistent events are rejected.
- Up to 80 event frames and **64 KB** of serialized save data. With existing rule caps, a normal run produces fewer than 80 event frames.
- Location vectors must be finite and within the world coordinate bounds. Saves cannot include executable code, scripts, arbitrary URLs, model bytes, new authorities or network capabilities.
- Clock timestamps and user-authored traces are editable, and a player can still manually craft an internally consistent trace. **This is replay consistency, not authentication, anti-cheat, proof of playing, or a cryptographically signed history.**
- The save holds **player position and quest/door state**, not full rigid-body velocity, positions of moving crates, camera state, raw keyboard input or simulation clock. Resuming re-creates other Rapier bodies from the authored world. If the saved position overlaps dynamic geometry, collision resolution is handled by the sandbox physics engine.

## Compatibility and boundaries

- Older Rung 5 exploration worlds without gameplay rules can save and resume position using an empty event trace.
- Rung 6 collectibles/checkpoints and Rung 7 switches/doors/alternate victory conditions are reconstructed from replay frames when restoring progress.
- Rung 8 locomotion and animated doors keep working; open doors are re-created in their unlocked state when a save is loaded.
- No authoritative VR Studio source is rewritten. Private GLB asset proxies remain excluded from exported playable worlds, as in earlier rungs.
- The event timeline supports **step-by-step review**, not automatic cinematic replay or arbitrary time travel through a running Rapier simulation. Restoring a checkpoint is the deliberate state-rewind operation.

## Validation

```bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
```

`site/scripts/playtest-save.test.mjs` verifies canonical world hashing, revision mismatch rejection, save/restore exact progress and position, deterministic event ordering, checkpoint rollback, E-interaction frames, malicious/corrupted data rejection, bounds and file size, and compatibility with old exploration worlds.

### Browser acceptance checklist

1. Start the public sample at `?play=1`. Move, collect a spark, activate a checkpoint and unlock a door. Save, refresh, click Resume and verify HUD, current position, opened collider and visual markers match the saved session.
2. Press Restart. Verify the run starts fresh but the Save Browser slot still exists. Resume and confirm progress returns.
3. Continue after checkpoint, then select **Respawn at Checkpoint**. Verify post-checkpoint pickups and doors re-lock, while earlier events remain complete.
4. Export the save, clear the browser slot, import the matching playable world and save file. Confirm progress resumes; explicitly press Save Browser if persistence is desired.
5. Modify one geometry or graph-rule value in the world JSON (retain the same `source.sha256` field) and attempt save import. Confirm digest mismatch refusal.
6. Alter a save's `openedDoors`, goal status, event IDs or `interact` boolean. Confirm a mismatch is rejected.
7. Use Replay Previous/Next and direct event step selectors to inspect events without changing live physics or gameplay state.
8. Test localStorage unavailable/quota-exceeded conditions and malformed/oversized files; fail with visible status rather than corruption or false success.
9. Test browser reload and full build navigation, verify original v5 saves and VR Studio authoring content unchanged.
10. Perform desktop/mobile interaction acceptance before release; CI does **not** constitute visual browser verification or production persistence durability guarantees.

## Follow-up design options

Future rungs can implement indexed, revisioned IndexedDB save slots; configurable save slots and thumbnails; deliberate auto-save at checkpoints with opt-in; physics/input recording for cinematic ghost replays; user-configurable checkpoint respawn positions; or per-level progress analytics. Each should preserve explicit provenance and never grant downloadable-world data executable power.
