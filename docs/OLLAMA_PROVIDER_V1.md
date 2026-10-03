# PixelForge Ollama Provider v1

The Ollama provider is the first concrete provider adapter for Model Policy v1.

It translates PixelForge's provider-neutral request into a local Ollama chat
request and normalizes the response back into the Model Policy provider envelope.

```text
bounded observation
      |
      v
ModelPolicyClientV1
      |
      v
Ollama Provider v1
      |
      v
POST /api/chat
      |
      v
local Ollama model
      |
      v
normalized provider response
      |
      v
strict Model Policy parser
      |
      v
RuntimeHostV1
```

## Default endpoint

The adapter defaults to:

```text
http://127.0.0.1:11434/api/chat
```

The base URL is configurable for a local or LAN Ollama service.

Only HTTP and HTTPS transports are accepted.

## Request behavior

The adapter sends:

```json
{
  "model": "<configured-model>",
  "stream": false,
  "format": "json",
  "messages": [
    {
      "role": "system",
      "content": "bounded JSON-only game-policy instructions..."
    },
    {
      "role": "user",
      "content": "<PixelForge model-policy request as JSON>"
    }
  ]
}
```

Optional Ollama `options`, `keep_alive`, extra headers, a system suffix, and a
request timeout may be supplied by the caller.

The model name is required. PixelForge does not choose or download a model.

## Response normalization

The adapter requires an Ollama response containing non-empty
`message.content`.

It returns the provider-neutral envelope:

```js
{
  schema: "pixelforge/model-provider-response/1",
  providerId: "ollama:local",
  model,
  output: message.content,
  usage,
  metadata
}
```

Model Policy v1 then parses and validates the structured game intents.

## Fail-closed behavior

These errors fail before any gameplay intent is submitted:

- network connection failure,
- request timeout,
- non-JSON HTTP response,
- Ollama HTTP error,
- missing assistant content,
- malformed model-policy output,
- response-schema mismatch,
- intent-budget overflow.

The adapter never directly calls RuntimeHostV1 or a game runtime.

## Credentials and receipts

The public provider descriptor includes only:

- transport = ollama-chat,
- configured model,
- JSON structured-output mode,
- non-streaming mode.

Base URLs, headers, fetch implementations, and provider transport details are
not copied into model receipts.

## Programmatic use

```js
import {
  RuntimeHostV1,
  createModelPolicyClientV1,
  createOllamaProviderV1
} from "parallax-pixelforge/runtime";

const provider = createOllamaProviderV1({
  model: "your-installed-model"
});

const client = createModelPolicyClientV1({
  id: "model:local",
  provider,
  instructions: "Choose one valid action from the observation."
});

host.attachClient(client);
await host.turn("model:local");
```

## Live qualification

CI does not require Ollama.

To qualify a real local model:

```bash
OLLAMA_MODEL=<installed-model> npm run qualify:ollama
```

or:

```bash
npm run qualify:ollama -- --model=<installed-model>
```

Optional endpoint override:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434 \
OLLAMA_MODEL=<installed-model> \
npm run qualify:ollama
```

The qualification uses the deterministic reference Counter. The live model must
produce exactly one valid ADD intent that changes the counter from 2 to 3.

## Deliberate non-goals

Ollama Provider v1 does not:

- start or stop Ollama,
- download models,
- select a default model,
- manage GPU/CPU placement,
- store chat history,
- retry model failures,
- grant game authority,
- bypass Model Policy validation,
- bypass RuntimeHostV1,
- bypass the game Runtime Bridge.
