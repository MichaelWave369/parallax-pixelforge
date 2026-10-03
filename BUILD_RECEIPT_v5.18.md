# PixelForge v5.18 — Gold Standard Playtest Build Receipt

## Release state

- PixelForge package: `5.18.0-alpha`
- Legend machine-side required final art: **8 / 8 READY**
- Gold Standard status: **PLAYTEST READY — NOT GOLD APPROVED**
- Retail status: **NOT AUTHORIZED**

## What changed

1. The standalone Legend runtime now reaches a real `legend-complete` state instead of looping Larrina's dialogue indefinitely.
2. Wobble Woods control tuning now uses:
   - maximum run speed: 96 px/s
   - acceleration: 650 px/s²
   - deceleration: 900 px/s²
   - jump velocity: -250 px/s
   - gravity: 660 px/s²
   - coyote time: 100 ms
   - jump buffer: 120 ms
   - variable jump cut: 0.55
3. Local-only playtest metrics were added to the standalone: elapsed time, scene entry timing, jumps, bounce-pad hits, falls, Rune timing, dialogue advances, restarts, and completion state.
4. The standalone can download its run receipt as JSON. No network telemetry is implemented.
5. Added a deterministic Gold Standard audit and an explicit human review recorder.

## Deterministic audit findings

- Base jump height: **47.3 px**
- Base horizontal jump reach: **72.7 px**
- Maximum ground gap: **38 px**
- Bounce-pad horizontal reach: **96.0 px**
- Bouncehome critical-path lower-bound traversal: **4.88 s**
- Wobble run-only lower bound: **6.08 s**
- Larrina Tower dialogue beats: **4**
- Real Legend audio files found: **0**

The traversal figures are structural/lower-bound indicators, not human completion-time measurements.

## Known blockers intentionally left open

- Human control-feel approval.
- Human visual Gold Standard approval.
- **Real SNES-inspired audio/music:** no Legend audio assets currently exist.
- Commercial content-depth approval; the current build remains a compact vertical slice.
- Human $3.69 worthiness signoff.
- Final store-art approval.

## Evidence boundary

Machine checks can prove asset presence, hashes, control constants, jump margins, local telemetry wiring, completion-state wiring, and historical regression retention. They cannot prove fun, beauty, emotional quality, adequate commercial length, or price worthiness.

No human Gold Standard receipt was fabricated during this build.
