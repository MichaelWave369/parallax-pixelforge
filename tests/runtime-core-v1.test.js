import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAuthorityViewV1,
  assertBridgeDescriptorV1,
  assertControllerDescriptorV1,
  assertEventStreamV1,
  assertJsonSafe,
  assertObservationV1,
  assertQueueReceiptV1,
  assertRecordingV1,
  assertRuntimeHashV1,
  assertSnapshotV1,
  clockSemantics,
  createSubmittedRoot,
} from "../runtime/core-v1.js";
import { runRuntimeBridgeProbeV1 } from "../runtime/conformance-v1.js";
import { createCounterBridge } from "../runtime/reference-counter.js";

test("shared descriptor contract accepts Counter/Oak deterministic semantics", () => {
  const descriptor = {
    protocol: "pixelforge-runtime-bridge",
    version: 1,
    gameId: "oak-street-rumble",
    runtimeVersion: "oak-runtime-kernel/1",
    deterministic: true,
  };

  assert.equal(assertBridgeDescriptorV1(descriptor), true);
  assert.deepEqual(clockSemantics(descriptor), {
    deterministic: true,
    clockMode: "external",
    advanceSemantics: "simulation-step",
    replayExact: null,
  });
});

test("shared descriptor contract preserves Night Circuit engine-clock semantics", () => {
  const descriptor = {
    protocol: "pixelforge-runtime-bridge",
    version: 1,
    gameId: "phi-night-circuit",
    runtimeVersion: "night-circuit/godot-0.18",
    deterministic: false,
    clockMode: "engine",
    advanceSemantics: "flush-controller-batch",
    replayExact: false,
  };

  assert.equal(assertBridgeDescriptorV1(descriptor), true);
  assert.deepEqual(clockSemantics(descriptor), {
    deterministic: false,
    clockMode: "engine",
    advanceSemantics: "flush-controller-batch",
    replayExact: false,
  });
});

test("minimal Bridge v1 descriptors remain valid and clock semantics stay unspecified", () => {
  const descriptor = {
    protocol: "pixelforge-runtime-bridge",
    version: 1,
    gameId: "legacy-cartridge",
    runtimeVersion: "legacy/1",
  };

  assert.equal(assertBridgeDescriptorV1(descriptor), true);
  assert.deepEqual(clockSemantics(descriptor), {
    deterministic: null,
    clockMode: "unspecified",
    advanceSemantics: "unspecified",
    replayExact: null,
  });
});

test("controller descriptor stays game-agnostic across Oak and Night Circuit vocabulary", () => {
  assert.equal(
    assertControllerDescriptorV1({
      id: "script:oak",
      kind: "script",
      binding: "player",
      profile: "nearby",
    }),
    true,
  );

  assert.equal(
    assertControllerDescriptorV1({
      id: "agent:night",
      kind: "agent",
      actor: "hunter",
      profile: "actor_scoped",
    }),
    true,
  );
});

test("submitted root helper produces immutable JSON-safe controller/tick/intent envelope", () => {
  const root = createSubmittedRoot(
    "model:1",
    {
      actorId: "hunter",
      type: "MOVE",
      params: { x: 1, y: 0 },
    },
    12,
  );

  assert.equal(Object.isFrozen(root), true);
  assert.equal(root.controllerId, "model:1");
  assert.equal(root.tick, 12);
  assert.throws(() => {
    root.tick = 99;
  });
});

test("wire helpers reject values that cannot cross language/runtime boundaries", () => {
  assert.throws(() => assertJsonSafe({ value: undefined }), /non-JSON|undefined/i);
  assert.throws(() => assertJsonSafe({ value: BigInt(1) }), /non-JSON|bigint/i);
  assert.throws(() => assertJsonSafe({ value: Infinity }), /finite/i);

  const circular = {};
  circular.self = circular;
  assert.throws(() => assertJsonSafe(circular), /circular/i);
});

test("minimum wire validators do not standardize game-specific payload schemas", () => {
  assert.equal(assertObservationV1({ room: "oak", self: { id: "reed" } }), true);
  assert.equal(assertObservationV1({ actor: "hunter", signals: {}, state: {} }), true);

  assert.equal(
    assertQueueReceiptV1({ queued: true, tick: 3, providerReceipt: "abc" }),
    true,
  );

  assert.equal(
    assertEventStreamV1([
      { type: "ACTION_ACCEPTED", controllerId: "human:1", payload: {} },
      { type: "AUTHORITY_DELEGATED", controller_id: "human:1", payload: {} },
    ]),
    true,
  );

  assert.equal(assertSnapshotV1({ schema: "anything", state: {} }), true);
  assert.equal(assertRecordingV1({ frames: [], exact_replay: false }), true);
  assert.equal(assertAuthorityViewV1({ hunter: { MOVE: ["script:1"] } }), true);
  assert.equal(assertRuntimeHashV1("abc123"), true);
});

test("shared conformance harness drives the reference cartridge through the public bridge", () => {
  const report = runRuntimeBridgeProbeV1({
    bridge: createCounterBridge(10),
    controller: { id: "script:probe", kind: "script" },
    makeIntent: () => ({
      actorId: "counter",
      type: "ADD",
      params: { amount: 5 },
    }),
  });

  assert.equal(Object.isFrozen(report), true);
  assert.equal(report.snapshot.value, 15);
  assert.equal(report.producedEvents[0].type, "ACTION_ACCEPTED");
  assert.equal(report.receipt.queued, true);
});
