# PixelForge v5.34 — SPARK External Runtime Bridge

v5.34 is the first PixelForge qualification against the canonical `SparkTheSubstrate` repository.

## Pinned SPARK source

```text
revision: fae7879820bef63a550fea486b2defbc3cee5304
version:  0.17.0
```

## Architecture

```text
PixelForge
   |
   +-- createBridgeV1()
   |
   +-- JSONL Transport v1
   |
   v
external SPARK Threshold adapter
   |
   v
existing SPARK public/action-engine.js
```

PixelForge does not copy SPARK game rules. The loader imports the pinned external adapter from the SPARK checkout, wraps it with PixelForge `createBridgeV1()`, validates the Runtime Bridge descriptor, and serves the bridge through the already-qualified JSONL transport.

## Qualified SPARK scope

```text
game:    SPARK: The Substrate
mode:    Descent
room:    The Threshold
vessel:  Spark
actions: MOVE / DASH / PULSE
```

The cross-repository acceptance proof uses one MOVE RIGHT action.

The canonical initial state must be:

```text
room:       threshold
form:       spark
position:   (480, 390)
max health: 112
```

The 112 health is the real v0.17.0 starter state including Bark Ward, not a bridge-specific substitute.

## Cross-process proof

Run:

```bash
npm run qualify:spark -- --spark-root /path/to/SparkTheSubstrate
```

The qualifier requires the exact pinned SPARK Git revision and package version, launches PixelForge's external-SPARK JSONL server, validates `describe()`, registers one controller, observes the canonical Threshold spawn, submits MOVE RIGHT at tick 0, requires `SPARK_PLAYER_MOVED`, verifies the same semantic event through `events(0)`, confirms positive X movement, captures the authority view and SHA-256 runtime hash, and writes a PASS receipt.

Receipt schema:

```text
pixelforge.spark-runtime-qualification.v1
```

Default receipt:

```text
artifacts/spark-runtime-qualification.json
```

## Private-repository CI topology

`SparkTheSubstrate` is intentionally private. A public PixelForge workflow's default `GITHUB_TOKEN` cannot checkout a separate private repository owned by the same user.

Therefore the evidence is split deliberately:

- PixelForge PR CI runs the public loader/contract tests and v5.34 structural validator without private credentials.
- The exact cross-repository qualification runs from the private SPARK repository, which can read its own pinned source and checkout public PixelForge without a PAT.
- No long-lived personal access token is required or stored in PixelForge.

This is an authentication-boundary choice, not a change to the runtime protocol.

## Boundary

This rung does not grant PixelForge authority over SPARK saves, campaign progression, D1, co-op, Sideways, Duel, Endless, Memory Arcade, or legacy cabinet storage.

It also does not claim framebuffer/audio streaming, restorable snapshots, exact replay, or Unreal execution.

The external SPARK adapter remains game authority. PixelForge supplies the validated bridge and transport seam.

## Next rung

PhiCade should pin this PixelForge v5.34 revision and the exact SPARK revision, launch the same PixelForge external-SPARK server, pass one PhiCade-authorized action through it, and bind the resulting SPARK event/hash into PhiCade evidence.

That completes:

```text
PhiCade -> PixelForge -> SPARK
```
