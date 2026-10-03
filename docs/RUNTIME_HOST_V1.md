# PixelForge Runtime Host v1

Runtime Host v1 is the first generic **consumer** of the Shared Runtime Core.

It does not know Oak Street Rumble, Φ: Night Circuit, the reference counter, or
any cartridge-specific state schema.

```text
Policy / Model / Script
        |
        v
   RuntimeHostV1
        |
        v
 Runtime Bridge v1
        |
        v
      Game
```

## Host responsibilities

The host may:

- inspect `describe()`,
- normalize declared clock semantics,
- register controller clients,
- request bounded observations,
- queue resolved intents,
- process one runtime-defined bridge step,
- consume append-only events with its own cursor,
- read snapshot/recording/authority/hash surfaces,
- keep a host-side receipt transcript.

It does not interpret game-specific observation fields or event payloads.

## Policy clients

`createPolicyClientV1()` creates the smallest controller-side client:

```js
const client = createPolicyClientV1({
  id: "model:1",
  kind: "model",
  actor: "hunter",
  async decide(observation) {
    return chooseIntent(observation);
  },
});
```

`decide()` may be synchronous or asynchronous and may return:

- no intent,
- one intent,
- multiple intents.

The host does not care whether the implementation is a deterministic script,
local model, remote provider, network peer, or recorded policy.

## One turn

```text
observe
  |
  v
client.decide()
  |
  v
submit intent(s)
  |
  v
bridge.advance()
  |
  v
consume events
  |
  v
host turn receipt
```

For an externally-stepped runtime, `advance()` may mean one simulation step.

For an engine-clocked runtime, `advance()` may mean flushing the queued
controller batch while the host engine owns physics.

The host follows the runtime descriptor instead of inventing clock semantics.

## Two ledgers, two jobs

The host transcript is **not** the game Reality Ledger.

Host receipts record boundary operations such as:

- HOST_ATTACHED
- CLIENT_ATTACHED
- OBSERVATION_READ
- INTENT_QUEUED
- EVENTS_CONSUMED
- BRIDGE_ADVANCED
- CLIENT_TURN_COMPLETED

The game remains authoritative for gameplay events, causal outcomes and rule
decisions.

## Event cursor

Each RuntimeHostV1 maintains a local append-only event cursor.

`advance()` processes the bridge step and then consumes all game events not yet
seen by that host. Calling `pollEvents()` again returns only newer events.

Multiple hosts may therefore track the same bridge independently if the
underlying runtime permits multiple clients.

## Deliberate non-goals

Host v1 does not include:

- OpenAI/Ollama/Grok/provider adapters,
- prompt construction,
- model parsing,
- retry/backoff,
- network transport,
- matchmaking,
- game-specific authority delegation,
- autonomous scheduling loops.

Those belong in later client/provider layers.

The point of Host v1 is to prove the SDK can be consumed without importing a
game's private engine.
