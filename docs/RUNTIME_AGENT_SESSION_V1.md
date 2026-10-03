# PixelForge Agent Session v1

Agent Session v1 is the bounded multi-turn orchestration layer above RuntimeHostV1
and AsyncRuntimeHostV1.

It exists to let a policy or model act for more than one turn without creating an
unbounded autonomous loop.

```text
Policy / Model Client
        |
        v
  Agent Session v1
        |
        +-- max turns
        +-- max total intents
        +-- empty-turn limit
        +-- duration boundary
        +-- cancellation
        +-- stop condition
        +-- session receipts
        |
        v
RuntimeHostV1 / AsyncRuntimeHostV1
        |
        v
   Runtime Bridge v1
        |
        v
       Game
```

## Hard boundaries

A session requires explicit limits:

- `maxTurns`
- `maxTotalIntents`
- `maxConsecutiveEmptyTurns`
- `maxDurationMs`

The total-intent budget is enforced **before submission**.

If a policy proposes more intents than remain in the session budget, none of
those over-budget intents are submitted.

## Cancellation

An optional AbortSignal may stop the session.

Cancellation is checked:

- before client attachment,
- before each turn,
- after policy deliberation and before intent submission.

That last check matters. If a model is still thinking when cancellation arrives,
its eventual decision is discarded instead of being submitted after the user
already stopped the session.

Once a submitted intent batch begins, the host completes that batch/advance
boundary rather than pretending a partially-submitted turn is cleanly reversible.

## Sync and async hosts

The same session runner works with:

- `RuntimeHostV1`
- `AsyncRuntimeHostV1`

The runner awaits host methods, so synchronous return values and Promises are both
accepted.

This allows the same session logic to control:

- in-process deterministic games such as Oak,
- transported engine-clocked games such as Night Circuit.

## Stop conditions

A caller may provide:

```js
stopWhen(turnReport, sessionSummary)
```

The callback may return:

- `false` / nothing to continue,
- `true` to stop with `stop_condition`,
- a non-empty string to stop with a caller-defined reason.

The callback does not grant authority and cannot bypass the host/runtime action
path.

## Session receipts

Agent Session v1 records its own orchestration transcript:

- SESSION_STARTED
- SESSION_CLIENT_ATTACHED
- SESSION_TURN_COMPLETED
- INTENT_BUDGET_BLOCKED
- SESSION_STOP_CONDITION_MET
- SESSION_STOPPED
- SESSION_FAILED

By default, session receipts contain counts/reasons only.

They do **not** copy full observations or intents.

For qualification/debugging, `retainTurns: true` explicitly preserves full turn
reports in the returned session result.

## Failure behavior

Unexpected provider/policy/host failures stop the session immediately.

The runner throws `AgentSessionError` with an immutable `result` containing:

- stop reason,
- turn count,
- total intent count,
- total event count,
- host status when available,
- session receipts,
- error message.

There are no hidden retries.

## What Agent Session v1 does not do

It does not:

- grant or expand game authority,
- choose provider credentials,
- repair malformed model output,
- reconnect transports,
- retry failed turns,
- schedule itself forever,
- infer game-specific goals,
- merge model/host/game ledgers,
- bypass RuntimeHost/Runtime Bridge validation.

A session is an orchestration budget, not a second authority system.
