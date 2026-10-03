import assert from "node:assert/strict";
import test from "node:test";

import {
  BRIDGE_V1_METHODS,
  assertBridgeV1,
  createBridgeV1,
} from "../runtime/bridge-v1.js";
import { createCounterBridge } from "../runtime/reference-counter.js";

test("bridge v1 exposes only the small engine-facing contract", () => {
  const bridge = createCounterBridge(3);
  assert.deepEqual(Object.keys(bridge).sort(), [...BRIDGE_V1_METHODS].sort());
  assert.equal(assertBridgeV1(bridge), true);
});

test("reference cartridge runs through register/observe/submit/step/events/snapshot", () => {
  const bridge = createCounterBridge(3);

  bridge.registerController({ id: "script:1", kind: "script" });
  const observation = bridge.observe("script:1");
  assert.equal(Object.isFrozen(observation), true);
  assert.equal(observation.value, 3);
  assert.deepEqual(observation.allowedActions, ["ADD"]);

  const decision = bridge.submit("script:1", {
    actorId: "counter",
    type: "ADD",
    params: { amount: 4 },
  });
  assert.deepEqual(decision, { accepted: true, reason: "ALLOW" });

  bridge.advance();
  assert.equal(bridge.snapshot().value, 7);
  assert.equal(bridge.snapshot().tick, 1);
  assert.equal(bridge.events().length, 1);
  assert.equal(bridge.events()[0].controllerId, "script:1");
  assert.equal(bridge.recording().frames.length, 1);
  assert.deepEqual(bridge.authority()["script:1"], ["ADD"]);
  assert.equal(typeof bridge.hash(), "string");
});

test("bridge wrapper returns copies instead of mutable engine ownership", () => {
  const bridge = createCounterBridge();
  bridge.registerController({ id: "human:1", kind: "human" });

  const snapshot = bridge.snapshot();
  assert.equal(Object.isFrozen(snapshot), true);
  assert.throws(() => {
    snapshot.value = 9000;
  });

  assert.equal(bridge.snapshot().value, 0);
});

test("contract rejects incomplete adapters", () => {
  assert.throws(() => createBridgeV1({}), /missing method/i);
});
