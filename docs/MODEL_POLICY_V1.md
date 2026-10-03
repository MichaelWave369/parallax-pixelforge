# PixelForge Model Policy Client v1

Model Policy v1 is the provider-neutral layer above RuntimeHostV1.

```text
bounded observation
      |
      v
Model Policy Client
      |
      v
normalized provider request
      |
      v
Model Provider Adapter
      |
      v
normalized provider response
      |
      v
strict intent parser + intent budget
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

The model never receives a game runtime handle. It receives only the bounded
observation supplied by the runtime host.

## Provider contract

`createModelProviderV1()` wraps any provider-specific implementation behind:

```js
await provider.invoke(request, context)
```

The adapter must return:

```js
{
  schema: "pixelforge/model-provider-response/1",
  output: ...
}
```

Optional normalized fields include `providerId`, `model`, `usage`, and
provider-safe metadata.

Credentials, HTTP clients, local sockets, and vendor SDKs remain closed over
inside the provider implementation and are not placed in descriptors or receipts.

## Default model request

The default request is JSON-safe:

```js
{
  schema: "pixelforge/model-policy-request/1",
  requestId,
  controller,
  instructions,
  observation,
  responseContract: {
    schema: "pixelforge/model-policy-response/1",
    shape: { intents: "array" },
    maxIntents
  }
}
```

The observation is exactly the bounded runtime observation passed to the policy
client. The model does not receive World, Godot nodes, runtime internals, or the
host object.

## Default response contract

The default parser requires:

```js
{
  schema: "pixelforge/model-policy-response/1",
  intents: [
    { ...game-defined intent... }
  ]
}
```

The shared layer validates only JSON safety and the per-turn intent budget.
Game-specific action grammar, identity, authority, and rules remain authoritative
inside the runtime.

## Fail closed

Malformed provider output, invalid JSON, wrong response schema, or an exceeded
intent budget throws before RuntimeHostV1 submits any intent to the game.

A failed model turn therefore produces a model-side receipt but no gameplay
action.

## Custom provider normalization

Different providers may use different request and response shapes.

Use `buildRequest()` and `parseResponse()` to normalize those shapes while
leaving RuntimeHostV1 unchanged.

```js
const client = createModelPolicyClientV1({
  id: "model:1",
  provider,
  buildRequest(observation, context) {
    return vendorRequest(observation, context);
  },
  parseResponse(response) {
    return vendorCommands(response);
  }
});
```

## Model receipts

Model Policy v1 keeps a separate provider-boundary transcript:

- MODEL_REQUEST_BUILT
- MODEL_PROVIDER_COMPLETED
- MODEL_INTENTS_PARSED
- MODEL_TURN_FAILED

These receipts intentionally omit the full observation and instructions by
default.

They are not the game Reality Ledger and not the RuntimeHost receipt stream.

## Deliberate non-goals

Model Policy v1 does not include:

- OpenAI, Ollama, Grok, or other concrete provider adapters,
- credentials or secret storage,
- prompts for any specific game,
- retry/backoff,
- tool calling,
- autonomous loops,
- network transport,
- authority delegation.

Those belong in later provider and orchestration layers.
