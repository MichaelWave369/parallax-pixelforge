# PixelForge Async Runtime Host v1

`AsyncRuntimeHostV1` is the transport-capable counterpart to the in-process
`RuntimeHostV1`.

It exists because a real runtime may live behind:

- TCP,
- WebSocket,
- a worker,
- a subprocess,
- another language runtime,
- a remote service.

The policy/model layer should not care where the game lives.

```text
Model / Script Policy
        |
        v
AsyncRuntimeHostV1
        |
        v
Promise-capable Runtime Bridge v1
        |
        +-- TCP / JSONL
        +-- WebSocket
        +-- worker
        +-- subprocess
        +-- in-process bridge
```

## Why a separate host

`RuntimeHostV1` remains synchronous at the bridge boundary because in-process
games should not pay Promise overhead or transport complexity.

`AsyncRuntimeHostV1` mirrors the same responsibilities but awaits every bridge
operation.

Existing policy clients remain unchanged.

## Connection

Use the asynchronous factory:

```js
const host = await AsyncRuntimeHostV1.connect(bridge);
```

Direct construction is intentionally refused so descriptor discovery cannot be
skipped.

The bridge may return ordinary values or Promises. This means the async host can
also drive existing synchronous Runtime Bridge v1 implementations.

## Host surface

The async host provides asynchronous versions of:

- attachClient()
- observe()
- submit()
- advance()
- pollEvents()
- turn()
- snapshot()
- recording()
- authority()
- hash()
- status()

`receipts()`, `descriptor`, and `semantics` are available synchronously after
connection.

## Clock semantics

The host continues to follow `describe()`.

For an externally stepped runtime, `advance()` may represent a simulation tick.

For an engine-clocked runtime, `advance()` may flush a queued controller batch
while the remote engine owns physics/frame advancement.

Transport latency never changes the runtime's declared clock semantics.

## Conformance

`assertAsyncRuntimeBridgeV1()` awaits all passive bridge surfaces and applies the
same Shared Runtime Core wire validators used by the synchronous host.

The test suite proves:

- synchronous bridges remain usable through AsyncRuntimeHostV1,
- Promise-returning bridges work,
- policy clients remain unchanged,
- event cursors consume remote events exactly once,
- host receipts remain separate and immutable.

## Non-goals

Async Runtime Host v1 does not define:

- TCP framing,
- HTTP endpoints,
- WebSocket protocols,
- authentication,
- retries,
- reconnect behavior,
- provider APIs,
- game-specific seat assignment.

Those belong to transport adapters and games.

The first intended external consumer is Φ: Night Circuit's existing loopback
P3 JSONL agent seat.
