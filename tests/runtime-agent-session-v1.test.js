import assert from "node:assert/strict";
import test from "node:test";

import { AsyncRuntimeHostV1 } from "../runtime/async-host-v1.js";
import {
  AGENT_SESSION_STOP_REASONS,
  AgentSessionError,
  runAgentSessionV1,
} from "../runtime/agent-session-v1.js";
import {
  RuntimeHostV1,
  createPolicyClientV1,
} from "../runtime/host-v1.js";
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

test("bounded session drives synchronous host until max-turn limit", async () => {
  const host = new RuntimeHostV1(createCounterBridge());
  const client = createPolicyClientV1({
    id: "script:session-turns",
    kind: "script",
    decide(observation) {
      return {
        actorId: observation.self.id,
        type: "ADD",
        params: { amount: 1 },
      };
    },
  });

  const result = await runAgentSessionV1({
    host,
    client,
    maxTurns: 3,
    maxTotalIntents: 10,
  });

  assert.equal(result.status, "stopped");
  assert.equal(result.stopReason, AGENT_SESSION_STOP_REASONS.MAX_TURNS);
  assert.equal(result.turnCount, 3);
  assert.equal(result.totalIntents, 3);
  assert.equal(host.snapshot().value, 3);
});

test("hard total-intent budget blocks an over-budget turn before submission", async () => {
  const host = new RuntimeHostV1(createCounterBridge());
  const client = createPolicyClientV1({
    id: "script:session-budget",
    kind: "script",
    decide(observation) {
      return [
        {
          actorId: observation.self.id,
          type: "ADD",
          params: { amount: 1 },
        },
        {
          actorId: observation.self.id,
          type: "ADD",
          params: { amount: 1 },
        },
      ];
    },
  });

  const result = await runAgentSessionV1({
    host,
    client,
    maxTurns: 10,
    maxTotalIntents: 3,
  });

  assert.equal(
    result.stopReason,
    AGENT_SESSION_STOP_REASONS.INTENT_BUDGET_BLOCKED,
  );
  assert.equal(result.turnCount, 1);
  assert.equal(result.totalIntents, 2);
  assert.equal(host.snapshot().value, 2);
  assert.equal(host.pollEvents().length, 0);
  assert.ok(
    result.receipts.some(
      (receipt) => receipt.type === "INTENT_BUDGET_BLOCKED",
    ),
  );
});

test("exact intent budget stops after the accepted turn", async () => {
  const host = new RuntimeHostV1(createCounterBridge());
  const client = createPolicyClientV1({
    id: "script:session-exact-budget",
    kind: "script",
    decide(observation) {
      return {
        actorId: observation.self.id,
        type: "ADD",
        params: { amount: 1 },
      };
    },
  });

  const result = await runAgentSessionV1({
    host,
    client,
    maxTurns: 10,
    maxTotalIntents: 2,
  });

  assert.equal(
    result.stopReason,
    AGENT_SESSION_STOP_REASONS.MAX_TOTAL_INTENTS,
  );
  assert.equal(result.turnCount, 2);
  assert.equal(result.totalIntents, 2);
  assert.equal(host.snapshot().value, 2);
});

test("consecutive empty-turn limit stops idle policies", async () => {
  const host = new RuntimeHostV1(createCounterBridge());
  const client = createPolicyClientV1({
    id: "script:session-idle",
    kind: "script",
    decide: () => null,
  });

  const result = await runAgentSessionV1({
    host,
    client,
    maxTurns: 20,
    maxTotalIntents: 5,
    maxConsecutiveEmptyTurns: 2,
  });

  assert.equal(
    result.stopReason,
    AGENT_SESSION_STOP_REASONS.EMPTY_TURN_LIMIT,
  );
  assert.equal(result.turnCount, 2);
  assert.equal(result.totalIntents, 0);
  assert.equal(host.snapshot().tick, 2);
});

test("custom stop condition ends the session without changing host semantics", async () => {
  const host = new RuntimeHostV1(createCounterBridge());
  const client = createPolicyClientV1({
    id: "script:session-stop",
    kind: "script",
    decide(observation) {
      return {
        actorId: observation.self.id,
        type: "ADD",
        params: { amount: 2 },
      };
    },
  });

  const result = await runAgentSessionV1({
    host,
    client,
    maxTurns: 10,
    maxTotalIntents: 10,
    stopWhen(_turn, session) {
      return session.turnCount >= 2 ? "fixture_complete" : false;
    },
  });

  assert.equal(result.stopReason, "fixture_complete");
  assert.equal(result.turnCount, 2);
  assert.equal(host.snapshot().value, 4);
});

test("pre-aborted signal prevents attachment and gameplay activity", async () => {
  const controller = new AbortController();
  controller.abort();

  const host = new RuntimeHostV1(createCounterBridge());
  const client = createPolicyClientV1({
    id: "script:session-abort-before",
    kind: "script",
    decide: () => ({
      actorId: "counter",
      type: "ADD",
      params: { amount: 99 },
    }),
  });

  const result = await runAgentSessionV1({
    host,
    client,
    signal: controller.signal,
  });

  assert.equal(result.stopReason, AGENT_SESSION_STOP_REASONS.ABORTED);
  assert.equal(result.turnCount, 0);
  assert.equal(host.snapshot().value, 0);
  assert.deepEqual(host.status().attachedControllers, []);
});

test("abort during policy deliberation is honored before any intent submission", async () => {
  const controller = new AbortController();
  const host = new RuntimeHostV1(createCounterBridge());

  const client = createPolicyClientV1({
    id: "script:session-abort-decision",
    kind: "script",
    decide(observation) {
      controller.abort();
      return {
        actorId: observation.self.id,
        type: "ADD",
        params: { amount: 7 },
      };
    },
  });

  const result = await runAgentSessionV1({
    host,
    client,
    signal: controller.signal,
  });

  assert.equal(result.stopReason, AGENT_SESSION_STOP_REASONS.ABORTED);
  assert.equal(result.turnCount, 0);
  assert.equal(result.totalIntents, 0);
  assert.equal(host.snapshot().value, 0);
  assert.equal(host.pollEvents().length, 0);
});

test("same session runner drives AsyncRuntimeHostV1", async () => {
  const host = await AsyncRuntimeHostV1.connect(
    delayedBridge(createCounterBridge(10)),
  );

  const client = createPolicyClientV1({
    id: "model:session-async",
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

  const result = await runAgentSessionV1({
    host,
    client,
    maxTurns: 2,
    maxTotalIntents: 2,
  });

  assert.equal(
    result.stopReason,
    AGENT_SESSION_STOP_REASONS.MAX_TOTAL_INTENTS,
  );
  assert.equal(result.turnCount, 2);
  assert.equal((await host.snapshot()).value, 20);
});

test("unexpected client failure stops the session and exposes immutable failure receipts", async () => {
  const host = new RuntimeHostV1(createCounterBridge(3));
  const client = createPolicyClientV1({
    id: "script:session-failure",
    kind: "script",
    decide() {
      throw new Error("fixture model failed");
    },
  });

  await assert.rejects(
    () =>
      runAgentSessionV1({
        host,
        client,
      }),
    (error) => {
      assert.ok(error instanceof AgentSessionError);
      assert.equal(error.result.status, "failed");
      assert.equal(
        error.result.stopReason,
        AGENT_SESSION_STOP_REASONS.FAILED,
      );
      assert.ok(
        error.result.receipts.some(
          (receipt) => receipt.type === "SESSION_FAILED",
        ),
      );
      assert.equal(Object.isFrozen(error.result), true);
      return true;
    },
  );

  assert.equal(host.snapshot().value, 3);
});

test("session receipts summarize activity without copying full observations by default", async () => {
  const host = new RuntimeHostV1(createCounterBridge());
  const client = createPolicyClientV1({
    id: "script:session-receipts",
    kind: "script",
    decide(observation) {
      return {
        actorId: observation.self.id,
        type: "ADD",
        params: { amount: 1 },
      };
    },
  });

  const result = await runAgentSessionV1({
    host,
    client,
    maxTurns: 1,
    maxTotalIntents: 5,
  });

  assert.equal("turns" in result, false);
  const serialized = JSON.stringify(result.receipts);
  assert.equal(serialized.includes('"observation"'), false);
  assert.equal(serialized.includes('"intents"'), false);
  assert.ok(
    result.receipts.some(
      (receipt) => receipt.type === "SESSION_TURN_COMPLETED",
    ),
  );
});

test("retainTurns explicitly preserves full turn reports for qualification use", async () => {
  const host = new RuntimeHostV1(createCounterBridge());
  const client = createPolicyClientV1({
    id: "script:session-retain",
    kind: "script",
    decide(observation) {
      return {
        actorId: observation.self.id,
        type: "ADD",
        params: { amount: 1 },
      };
    },
  });

  const result = await runAgentSessionV1({
    host,
    client,
    maxTurns: 1,
    maxTotalIntents: 5,
    retainTurns: true,
  });

  assert.equal(result.turns.length, 1);
  assert.equal(result.turns[0].observation.value, 0);
  assert.equal(result.turns[0].intents[0].type, "ADD");
});
