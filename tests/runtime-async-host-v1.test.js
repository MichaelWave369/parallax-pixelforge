import assert from "node:assert/strict";
import test from "node:test";

import {
  AsyncRuntimeHostV1,
  assertAsyncRuntimeBridgeV1,
} from "../runtime/async-host-v1.js";
import { createPolicyClientV1 } from "../runtime/host-v1.js";
import { createCounterBridge } from "../runtime/reference-counter.js";

function delayedBridge(base, delayMs = 1) {
  const later = (fn) => async (...args) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fn(...args);
  };

  return {
    describe: later(base.describe.bind(base)),
    registerController: later(base.registerController.bind(base)),
    observe: later(base.observe.bind(base)),
    submit: later(base.submit.bind(base)),
    advance: later(base.advance.bind(base)),
    events: later(base.events.bind(base)),
    snapshot: later(base.snapshot.bind(base)),
    recording: later(base.recording.bind(base)),
    authority: later(base.authority.bind(base)),
    hash: later(base.hash.bind(base)),
  };
}

test("async host accepts the existing synchronous Runtime Bridge unchanged", async () => {
  const host = await AsyncRuntimeHostV1.connect(createCounterBridge(4));

  const client = createPolicyClientV1({
    id: "script:async-sync",
    kind: "script",
    decide(observation) {
      return {
        actorId: observation.self.id,
        type: "ADD",
        params: { amount: 3 },
      };
    },
  });

  await host.attachClient(client);
  const report = await host.turn("script:async-sync");

  assert.equal((await host.snapshot()).value, 7);
  assert.equal(report.cycle.events[0].type, "ACTION_ACCEPTED");
  assert.equal(host.semantics.clockMode, "external");
});

test("async host drives a genuinely asynchronous bridge", async () => {
  const bridge = delayedBridge(createCounterBridge(10));
  assert.equal(await assertAsyncRuntimeBridgeV1(bridge), true);

  const host = await AsyncRuntimeHostV1.connect(bridge);
  const client = createPolicyClientV1({
    id: "model:remote-fixture",
    kind: "model",
    async decide(observation) {
      await Promise.resolve();
      return {
        actorId: observation.self.id,
        type: "ADD",
        params: { amount: 5 },
      };
    },
  });

  await host.attachClient(client);
  const report = await host.turn("model:remote-fixture");

  assert.equal(report.observation.value, 10);
  assert.equal((await host.snapshot()).value, 15);
  assert.equal(report.queueReceipts[0].queued, true);
  assert.equal(report.cycle.events[0].type, "ACTION_ACCEPTED");
});

test("async host event cursor consumes remote events once", async () => {
  const host = await AsyncRuntimeHostV1.connect(
    delayedBridge(createCounterBridge()),
  );

  const client = createPolicyClientV1({
    id: "script:async-cursor",
    kind: "script",
    decide: () => null,
  });
  await host.attachClient(client);

  await host.submit("script:async-cursor", {
    actorId: "counter",
    type: "ADD",
    params: { amount: 2 },
  });
  const first = await host.advance();

  assert.equal(first.events.length, 1);
  assert.equal((await host.pollEvents()).length, 0);
  assert.equal((await host.status()).eventCursor, 1);
});

test("async host keeps an independent immutable receipt transcript", async () => {
  const host = await AsyncRuntimeHostV1.connect(
    delayedBridge(createCounterBridge(1)),
  );

  const client = createPolicyClientV1({
    id: "script:async-ledger",
    kind: "script",
    decide: () => ({
      actorId: "counter",
      type: "ADD",
      params: { amount: 1 },
    }),
  });

  await host.attachClient(client);
  await host.turn("script:async-ledger");

  const receipts = host.receipts();
  assert.equal(Object.isFrozen(receipts), true);
  assert.ok(receipts.some((receipt) => receipt.type === "HOST_ATTACHED"));
  assert.ok(receipts.some((receipt) => receipt.type === "CLIENT_ATTACHED"));
  assert.ok(receipts.some((receipt) => receipt.type === "INTENT_QUEUED"));
  assert.ok(receipts.some((receipt) => receipt.type === "CLIENT_TURN_COMPLETED"));
});

test("direct construction is refused so descriptor initialization cannot be skipped", () => {
  assert.throws(
    () => new AsyncRuntimeHostV1(createCounterBridge()),
    /Use AsyncRuntimeHostV1.connect/i,
  );
});
