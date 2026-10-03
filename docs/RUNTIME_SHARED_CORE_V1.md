# PixelForge Shared Runtime Core v1

The Shared Runtime Core is the vocabulary that remained valid across three
independent Runtime Bridge v1 implementations:

1. the deterministic PixelForge reference counter,
2. Oak Street Rumble, an externally-stepped deterministic browser game,
3. Φ: Night Circuit, an engine-clocked Godot game.

It is deliberately smaller than any of those runtimes.

## Package surface

```text
runtime/sdk-v1.js
  |
  +-- core-v1.js
  |     bridge descriptor validation
  |     controller descriptor validation
  |     submitted-root envelope
  |     queue receipt validation
  |     event/observation/snapshot/recording/authority validation
  |     immutable JSON wire helpers
  |     clock-semantics normalization
  |
  +-- bridge-v1.js
  |     ten-method Runtime Bridge wrapper
  |
  +-- conformance-v1.js
        reusable bridge shape/probe assertions
```

The package exports these entry points:

```js
import {
  createBridgeV1,
  createSubmittedRoot,
  clockSemantics,
  runRuntimeBridgeProbeV1,
} from "parallax-pixelforge/runtime";
```

## Proven common vocabulary

### Bridge descriptor

Every implementation identifies:

- protocol,
- bridge version,
- game id,
- runtime version.

Clock metadata is additive rather than mandatory so existing Bridge v1
cartridges remain compatible.

### Controller descriptor

The shared core standardizes controller identity and kind, with optional
actor/binding/profile strings. It does not standardize what those bindings mean.

### Submitted root

The portable root envelope is:

```js
{
  controllerId,
  tick,
  intent
}
```

Snake-case controller ids from non-JavaScript hosts are accepted by validators
where a wire payload is being inspected.

### Queue receipt

`submit()` acknowledges queueing:

```js
{
  queued: true,
  tick
}
```

It does not claim gameplay acceptance. Acceptance or rejection belongs to the
runtime event/receipt stream after `advance()`.

### Event stream

The only universal event requirement is a JSON-safe object with a non-empty
`type`. Oak, Night Circuit and future cartridges remain free to expose richer
causal/event schemas.

### Snapshot, recording and authority

These are JSON-safe objects with game-defined schemas.

The shared core does not claim:

- every snapshot is restorable,
- every recording is exact replay,
- every authority model has the same shape.

Those properties belong in descriptor or game-specific metadata.

## Clock semantics

The core recognizes two proven modes:

### external

Counter and Oak are externally stepped. Their default bridge meaning is:

```text
clockMode = external
advanceSemantics = simulation-step
```

### engine

Night Circuit is Godot-engine-clocked:

```text
clockMode = engine
advanceSemantics = flush-controller-batch
replayExact = false
```

A minimal older v1 descriptor with no clock metadata remains valid and normalizes
to `unspecified` rather than being assigned invented guarantees.

## What was not extracted

The following did not survive as universal requirements and therefore remain
outside Shared Core v1:

- Oak's Action Bus implementation,
- Oak's deterministic scheduler,
- Night Circuit's PlayerProtocol,
- Night Circuit's source-class AuthorityGate,
- combat actions,
- room/world graphs,
- actor stats,
- inventory,
- rendering,
- physics,
- AI provider calls,
- save storage,
- network transport.

That is intentional.

The shared runtime core is a language between engines, not an attempt to replace
their engines.

## Conformance

`runtime/conformance-v1.js` provides two levels:

- `assertRuntimeBridgeV1()` validates the ten-method surface and passive wire
  outputs.
- `runRuntimeBridgeProbeV1()` registers a controller, obtains an observation,
  queues one fixture-provided intent, advances the bridge, and validates all
  returned wire surfaces.

Game-specific qualification still owns gameplay truth. PixelForge conformance
does not decide whether an action should be accepted.
