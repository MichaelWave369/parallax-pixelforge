import assert from "node:assert/strict";
import test from "node:test";

import { createBridgeV1 } from "../runtime/bridge-v1.js";
import {
  RuntimeHostV1,
  createPolicyClientV1,
} from "../runtime/host-v1.js";
import { createCounterBridge } from "../runtime/reference-counter.js";

function createEngineClockBridge() {
  let bridgeTick = 0;
  let eventId = 0;
  let pending = [];
  const controllers = new Map();
  const ledger = [];

  return createBridgeV1({
    describe() {
      return {
        protocol: "pixelforge-runtime-bridge",
        version: 1,
        gameId: "engine-clock-fixture",
        runtimeVersion: "fixture/1",
        deterministic: false,
        clockMode: "engine",
        advanceSemantics: "flush-controller-batch",
        replayExact: false,
      };
    },

    registerController(descriptor) {
      controllers.set(descriptor.id, structuredClone(descriptor));
      return { ok: true };
    },

    observe(controllerId) {
      if (!controllers.has(controllerId))
        throw new Error("unknown controller");
      return {
        actor: "hunter",
        state: { stance: "ready" },
        bridge: {
          allowed_actions: ["PING"],
          bridge_tick: bridgeTick,
        },
      };
    },

    submit(controllerId, intent, tick = bridgeTick) {
      pending.push({
        controllerId,
        tick,
        intent: structuredClone(intent),
      });
      return { queued: true, tick };
    },

    advance(roots = []) {
      pending.push(...structuredClone(roots));
      const start = ledger.length;
      const batch = pending;
      pending = [];

      for (const root of batch) {
        eventId += 1;
        ledger.push({
          id: `evt:${eventId}`,
          type: root.intent?.type === "PING"
            ? "ACTION_ACCEPTED"
            : "ACTION_REJECTED",
          controllerId: root.controllerId,
          payload: {
            actionType: root.intent?.type ?? "unknown",
            bridgeTick,
          },
        });
      }

      bridgeTick += 1;
      return ledger.slice(start);
    },

    events(since = 0) {
      return ledger.slice(since);
    },

    snapshot() {
      return {
        schema: "engine-clock-fixture/snapshot/1",
        restorable: false,
        bridgeTick,
      };
    },

    recording() {
      return {
        schema: "engine-clock-fixture/recording/1",
        exactReplay: false,
        eventCount: ledger.length,
      };
    },

    authority() {
      return Object.fromEntries(
        [...controllers.keys()].map((id) => [id, ["PING"]]),
      );
    },

    hash() {
      return `engine:${bridgeTick}:${ledger.length}`;
    },
  });
}

test("generic host drives deterministic Counter without knowing cartridge state schema", async () => {
  const host = new RuntimeHostV1(createCounterBridge(10));

  const client = createPolicyClientV1({
    id: "script:counter",
    kind: "script",
    decide(observation) {
      return {
        actorId: observation.self.id,
        type: "ADD",
        params: { amount: 5 },
      };
    },
  });

  host.attachClient(client);
  const report = await host.turn("script:counter");

  assert.equal(report.observation.value, 10);
  assert.equal(report.queueReceipts[0].queued, true);
  assert.equal(report.cycle.events[0].type, "ACTION_ACCEPTED");
  assert.equal(host.snapshot().value, 15);
  assert.equal(host.semantics.clockMode, "external");
  assert.equal(host.semantics.advanceSemantics, "simulation-step");
});

test("same host drives engine-clock runtime without pretending advance means physics tick", async () => {
  const host = new RuntimeHostV1(createEngineClockBridge());

  const client = createPolicyClientV1({
    id: "model:hunter",
    kind: "model",
    actor: "hunter",
    async decide(observation) {
      await Promise.resolve();
      assert.equal(observation.actor, "hunter");
      return {
        actorId: "hunter",
        type: "PING",
        params: {},
      };
    },
  });

  host.attachClient(client);
  const report = await host.turn("model:hunter", "hunter");

  assert.equal(host.semantics.deterministic, false);
  assert.equal(host.semantics.clockMode, "engine");
  assert.equal(host.semantics.advanceSemantics, "flush-controller-batch");
  assert.equal(host.semantics.replayExact, false);
  assert.equal(report.cycle.events[0].type, "ACTION_ACCEPTED");
  assert.equal(host.snapshot().restorable, false);
  assert.equal(host.recording().exactReplay, false);
});

test("host event cursor consumes append-only bridge events exactly once", () => {
  const host = new RuntimeHostV1(createCounterBridge());
  const client = createPolicyClientV1({
    id: "script:cursor",
    kind: "script",
    decide: () => null,
  });

  host.attachClient(client);

  host.submit("script:cursor", {
    actorId: "counter",
    type: "ADD",
    params: { amount: 1 },
  });
  const first = host.advance();

  assert.equal(first.events.length, 1);
  assert.equal(host.pollEvents().length, 0);

  host.submit("script:cursor", {
    actorId: "counter",
    type: "ADD",
    params: { amount: 2 },
  });
  const second = host.advance();

  assert.equal(second.events.length, 1);
  assert.equal(host.snapshot().value, 3);
  assert.equal(host.status().eventCursor, 2);
});

test("host transcript records boundary activity without embedding mutable bridge ownership", async () => {
  const host = new RuntimeHostV1(createCounterBridge(2));
  const client = createPolicyClientV1({
    id: "script:ledger",
    kind: "script",
    decide: () => ({
      actorId: "counter",
      type: "ADD",
      params: { amount: 3 },
    }),
  });

  host.attachClient(client);
  await host.turn("script:ledger");

  const receipts = host.receipts();
  assert.equal(Object.isFrozen(receipts), true);
  assert.ok(receipts.some((receipt) => receipt.type === "HOST_ATTACHED"));
  assert.ok(receipts.some((receipt) => receipt.type === "CLIENT_ATTACHED"));
  assert.ok(receipts.some((receipt) => receipt.type === "INTENT_QUEUED"));
  assert.ok(receipts.some((receipt) => receipt.type === "EVENTS_CONSUMED"));
  assert.ok(receipts.some((receipt) => receipt.type === "CLIENT_TURN_COMPLETED"));

  assert.throws(() => {
    receipts.push({ type: "FORGED" });
  });
});

test("policy client supports zero, one, or multiple intents per observation", async () => {
  const host = new RuntimeHostV1(createCounterBridge());

  host.attachClient(
    createPolicyClientV1({
      id: "script:multi",
      kind: "script",
      decide: () => [
        { actorId: "counter", type: "ADD", params: { amount: 2 } },
        { actorId: "counter", type: "ADD", params: { amount: 4 } },
      ],
    }),
  );

  const report = await host.turn("script:multi");
  assert.equal(report.intents.length, 2);
  assert.equal(report.queueReceipts.length, 2);
  assert.equal(report.cycle.events.length, 2);
  assert.equal(host.snapshot().value, 6);
});
