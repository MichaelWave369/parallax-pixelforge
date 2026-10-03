import assert from "node:assert/strict";
import test from "node:test";

import { RuntimeHostV1 } from "../runtime/host-v1.js";
import {
  MODEL_POLICY_RESPONSE_SCHEMA,
  MODEL_PROVIDER_RESPONSE_SCHEMA,
  createModelPolicyClientV1,
  createModelProviderV1,
} from "../runtime/model-policy-v1.js";
import { createCounterBridge } from "../runtime/reference-counter.js";

function providerReturning(output, extra = {}) {
  return createModelProviderV1({
    id: "mock:provider",
    async invoke() {
      return {
        schema: MODEL_PROVIDER_RESPONSE_SCHEMA,
        providerId: "mock:provider",
        model: "mock-model",
        output,
        ...extra,
      };
    },
  });
}

test("model policy client drives Counter through RuntimeHostV1", async () => {
  const seen = [];
  const provider = createModelProviderV1({
    id: "mock:counter",
    async invoke(request, context) {
      seen.push({ request, context });
      return {
        schema: MODEL_PROVIDER_RESPONSE_SCHEMA,
        providerId: "mock:counter",
        model: "counter-thinker",
        output: {
          schema: MODEL_POLICY_RESPONSE_SCHEMA,
          intents: [
            {
              actorId: request.observation.self.id,
              type: "ADD",
              params: { amount: 7 },
            },
          ],
        },
      };
    },
  });

  const client = createModelPolicyClientV1({
    id: "model:counter",
    provider,
    instructions: "Increase the counter by seven.",
  });

  const host = new RuntimeHostV1(createCounterBridge(3));
  host.attachClient(client);

  const report = await host.turn("model:counter");

  assert.equal(host.snapshot().value, 10);
  assert.equal(report.intents.length, 1);
  assert.equal(report.cycle.events[0].type, "ACTION_ACCEPTED");

  assert.equal(seen.length, 1);
  assert.equal(seen[0].request.schema, "pixelforge/model-policy-request/1");
  assert.equal(seen[0].request.observation.value, 3);
  assert.equal(seen[0].context.controllerId, "model:counter");
  assert.equal("bridge" in seen[0].request, false);
  assert.equal("host" in seen[0].request, false);
});

test("async provider and custom parser normalize provider-specific output without changing host", async () => {
  const provider = createModelProviderV1({
    id: "custom:wire",
    async invoke(request) {
      await Promise.resolve();
      return {
        schema: MODEL_PROVIDER_RESPONSE_SCHEMA,
        output: {
          vendorPayload: {
            commands: [
              {
                actorId: request.payload.self.id,
                type: "ADD",
                params: { amount: 4 },
              },
            ],
          },
        },
      };
    },
  });

  const client = createModelPolicyClientV1({
    id: "model:custom",
    provider,
    maxIntentsPerTurn: 2,
    buildRequest(observation, context) {
      return {
        vendorRequest: true,
        requestId: context.requestId,
        payload: observation,
      };
    },
    parseResponse(response) {
      return response.output.vendorPayload.commands;
    },
  });

  const host = new RuntimeHostV1(createCounterBridge(1));
  host.attachClient(client);
  await host.turn("model:custom");

  assert.equal(host.snapshot().value, 5);
});

test("malformed model prose fails closed before an intent reaches the runtime", async () => {
  const provider = providerReturning("I think the counter should go up.");
  const client = createModelPolicyClientV1({
    id: "model:bad-json",
    provider,
  });

  const host = new RuntimeHostV1(createCounterBridge(8));
  host.attachClient(client);

  await assert.rejects(
    () => host.turn("model:bad-json"),
    /valid JSON|JSON object/i,
  );

  assert.equal(host.snapshot().value, 8);
  assert.equal(host.events?.length, undefined);
  assert.equal(host.pollEvents().length, 0);

  const receipts = client.modelReceipts();
  assert.ok(receipts.some((receipt) => receipt.type === "MODEL_TURN_FAILED"));
});

test("wrong model response schema fails closed", async () => {
  const provider = providerReturning({
    schema: "some-other-schema",
    intents: [
      { actorId: "counter", type: "ADD", params: { amount: 99 } },
    ],
  });

  const client = createModelPolicyClientV1({
    id: "model:wrong-schema",
    provider,
  });
  const host = new RuntimeHostV1(createCounterBridge(2));
  host.attachClient(client);

  await assert.rejects(
    () => host.turn("model:wrong-schema"),
    /model output schema/i,
  );

  assert.equal(host.snapshot().value, 2);
  assert.equal(host.pollEvents().length, 0);
});

test("intent budget is enforced before submission", async () => {
  const provider = providerReturning({
    schema: MODEL_POLICY_RESPONSE_SCHEMA,
    intents: [
      { actorId: "counter", type: "ADD", params: { amount: 1 } },
      { actorId: "counter", type: "ADD", params: { amount: 2 } },
    ],
  });

  const client = createModelPolicyClientV1({
    id: "model:budget",
    provider,
    maxIntentsPerTurn: 1,
  });
  const host = new RuntimeHostV1(createCounterBridge());
  host.attachClient(client);

  await assert.rejects(
    () => host.turn("model:budget"),
    /budget is 1/i,
  );

  assert.equal(host.snapshot().value, 0);
  assert.equal(host.pollEvents().length, 0);
});

test("model receipts record provider boundary without copying observations or provider secrets", async () => {
  const provider = providerReturning({
    schema: MODEL_POLICY_RESPONSE_SCHEMA,
    intents: [
      { actorId: "counter", type: "ADD", params: { amount: 1 } },
    ],
  });

  const client = createModelPolicyClientV1({
    id: "model:receipts",
    provider,
    metadata: { role: "playtester" },
  });
  const host = new RuntimeHostV1(createCounterBridge());
  host.attachClient(client);
  await host.turn("model:receipts");

  const receipts = client.modelReceipts();
  assert.equal(Object.isFrozen(receipts), true);
  assert.ok(receipts.some((receipt) => receipt.type === "MODEL_REQUEST_BUILT"));
  assert.ok(receipts.some((receipt) => receipt.type === "MODEL_PROVIDER_COMPLETED"));
  assert.ok(receipts.some((receipt) => receipt.type === "MODEL_INTENTS_PARSED"));

  const serialized = JSON.stringify(receipts);
  assert.equal(serialized.includes('"observation"'), false);
  assert.equal(serialized.includes('"instructions"'), false);
});

test("provider wrapper rejects non-normalized provider responses", async () => {
  const provider = createModelProviderV1({
    id: "bad:provider",
    async invoke() {
      return {
        output: {
          schema: MODEL_POLICY_RESPONSE_SCHEMA,
          intents: [],
        },
      };
    },
  });

  await assert.rejects(
    () => provider.invoke({ hello: "world" }),
    /provider.response.schema/i,
  );
});

test("model policy may deliberately emit zero intents", async () => {
  const provider = providerReturning({
    schema: MODEL_POLICY_RESPONSE_SCHEMA,
    intents: [],
  });
  const client = createModelPolicyClientV1({
    id: "model:idle",
    provider,
    maxIntentsPerTurn: 0,
  });

  const host = new RuntimeHostV1(createCounterBridge(11));
  host.attachClient(client);

  const report = await host.turn("model:idle");

  assert.equal(report.intents.length, 0);
  assert.equal(report.queueReceipts.length, 0);
  assert.equal(host.snapshot().value, 11);
});
