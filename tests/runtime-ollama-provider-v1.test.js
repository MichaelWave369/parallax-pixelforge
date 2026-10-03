import assert from "node:assert/strict";
import test from "node:test";

import { RuntimeHostV1 } from "../runtime/host-v1.js";
import {
  MODEL_POLICY_RESPONSE_SCHEMA,
  createModelPolicyClientV1,
} from "../runtime/model-policy-v1.js";
import {
  OLLAMA_PROVIDER_ID,
  createOllamaProviderV1,
} from "../runtime/providers/ollama-v1.js";
import { createCounterBridge } from "../runtime/reference-counter.js";

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return structuredClone(payload);
    },
  };
}

test("Ollama provider drives Counter through the complete model/host stack", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const request = JSON.parse(JSON.parse(init.body).messages[1].content);

    return jsonResponse({
      model: "qwen-test",
      done: true,
      done_reason: "stop",
      prompt_eval_count: 42,
      eval_count: 17,
      total_duration: 123456,
      message: {
        role: "assistant",
        content: JSON.stringify({
          schema: MODEL_POLICY_RESPONSE_SCHEMA,
          intents: [
            {
              actorId: request.observation.self.id,
              type: "ADD",
              params: { amount: 6 },
            },
          ],
        }),
      },
    });
  };

  const provider = createOllamaProviderV1({
    model: "qwen-test",
    fetchImpl,
  });
  const client = createModelPolicyClientV1({
    id: "model:ollama",
    provider,
    instructions: "Increase the observed counter by six.",
  });
  const host = new RuntimeHostV1(createCounterBridge(4));

  host.attachClient(client);
  const report = await host.turn("model:ollama");

  assert.equal(host.snapshot().value, 10);
  assert.equal(report.cycle.events[0].type, "ACTION_ACCEPTED");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://127.0.0.1:11434/api/chat");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].body.model, "qwen-test");
  assert.equal(calls[0].body.stream, false);
  assert.equal(calls[0].body.format, "json");
  assert.equal(calls[0].body.messages[0].role, "system");
  assert.equal(calls[0].body.messages[1].role, "user");
  assert.match(
    calls[0].body.messages[0].content,
    /Return ONLY valid JSON/i,
  );
  assert.match(
    calls[0].body.messages[0].content,
    /at most 1 intent/i,
  );
});

test("Ollama provider descriptor exposes no runtime handle or credential material", () => {
  const provider = createOllamaProviderV1({
    model: "local-model",
    fetchImpl: async () => jsonResponse({
      message: { content: "{}" },
    }),
    headers: { "x-local-test": "present" },
  });

  assert.equal(provider.descriptor.id, OLLAMA_PROVIDER_ID);
  assert.deepEqual(provider.descriptor.metadata, {
    transport: "ollama-chat",
    model: "local-model",
    structuredOutput: "json",
    streaming: false,
  });

  const serialized = JSON.stringify(provider.descriptor);
  assert.equal(serialized.includes("x-local-test"), false);
  assert.equal(serialized.includes("127.0.0.1"), false);
});

test("Ollama request carries optional system/options/keep-alive without changing model policy schema", async () => {
  let body;
  const provider = createOllamaProviderV1({
    model: "test-model",
    system: "Prefer defensive actions.",
    options: { temperature: 0, seed: 369 },
    keepAlive: "10m",
    fetchImpl: async (_url, init) => {
      body = JSON.parse(init.body);
      return jsonResponse({
        model: "test-model",
        done: true,
        message: {
          content: JSON.stringify({
            schema: MODEL_POLICY_RESPONSE_SCHEMA,
            intents: [],
          }),
        },
      });
    },
  });

  await provider.invoke({
    schema: "pixelforge/model-policy-request/1",
    requestId: "r:1",
    controller: { id: "model:1", kind: "model" },
    instructions: "",
    observation: { state: "ok" },
    responseContract: {
      schema: MODEL_POLICY_RESPONSE_SCHEMA,
      shape: { intents: "array" },
      maxIntents: 0,
    },
  });

  assert.deepEqual(body.options, { temperature: 0, seed: 369 });
  assert.equal(body.keep_alive, "10m");
  assert.match(body.messages[0].content, /Prefer defensive actions/);
  assert.match(body.messages[0].content, /at most 0 intent/i);
});

test("Ollama HTTP errors fail before any gameplay intent is submitted", async () => {
  const provider = createOllamaProviderV1({
    model: "missing-model",
    fetchImpl: async () =>
      jsonResponse(
        { error: "model 'missing-model' not found" },
        { ok: false, status: 404 },
      ),
  });
  const client = createModelPolicyClientV1({
    id: "model:http-error",
    provider,
  });
  const host = new RuntimeHostV1(createCounterBridge(9));
  host.attachClient(client);

  await assert.rejects(
    () => host.turn("model:http-error"),
    /model 'missing-model' not found/i,
  );

  assert.equal(host.snapshot().value, 9);
  assert.equal(host.pollEvents().length, 0);
});

test("Ollama network failures are normalized and fail closed", async () => {
  const provider = createOllamaProviderV1({
    model: "offline-model",
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  const client = createModelPolicyClientV1({
    id: "model:offline",
    provider,
  });
  const host = new RuntimeHostV1(createCounterBridge(5));
  host.attachClient(client);

  await assert.rejects(
    () => host.turn("model:offline"),
    /Ollama request failed: ECONNREFUSED/i,
  );

  assert.equal(host.snapshot().value, 5);
});

test("Ollama response must contain assistant message content", async () => {
  const provider = createOllamaProviderV1({
    model: "empty-model",
    fetchImpl: async () =>
      jsonResponse({
        model: "empty-model",
        done: true,
        message: { role: "assistant", content: "" },
      }),
  });

  await assert.rejects(
    () => provider.invoke({ request: "test" }),
    /missing message.content/i,
  );
});

test("Ollama response JSON parsing failure is explicit", async () => {
  const provider = createOllamaProviderV1({
    model: "bad-json-http",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        throw new SyntaxError("Unexpected token");
      },
    }),
  });

  await assert.rejects(
    () => provider.invoke({ request: "test" }),
    /response was not valid JSON/i,
  );
});

test("Ollama base URL is normalized and restricted to HTTP transports", async () => {
  let seenUrl = "";
  const provider = createOllamaProviderV1({
    model: "test",
    baseUrl: "http://localhost:11434/",
    fetchImpl: async (url) => {
      seenUrl = url;
      return jsonResponse({
        message: {
          content: JSON.stringify({
            schema: MODEL_POLICY_RESPONSE_SCHEMA,
            intents: [],
          }),
        },
      });
    },
  });

  await provider.invoke({ hello: "world" });
  assert.equal(seenUrl, "http://localhost:11434/api/chat");

  assert.throws(
    () =>
      createOllamaProviderV1({
        model: "test",
        baseUrl: "file:///tmp/ollama",
        fetchImpl: async () => {},
      }),
    /http or https/i,
  );
});
