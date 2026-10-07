import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadExternalSparkThresholdBridgeV1 } from "../runtime/external-spark-v1.js";

function makeFixture({ version = "0.17.0", gameId = "spark-the-substrate" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pixelforge-spark-fixture-"));
  fs.mkdirSync(path.join(root, "runtime"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "spark-substrate",
      version,
      type: "module",
    }),
  );

  const adapterSource = \`
export function createSparkThresholdAdapterV1() {
  let tick = 0;
  let queued = null;
  let x = 480;
  const controllers = new Set();
  const events = [];
  return {
    describe() {
      return {
        protocol: "pixelforge-runtime-bridge",
        version: 1,
        gameId: \${JSON.stringify(gameId)},
        runtimeVersion: "spark-threshold/0.17.0-bridge-v1",
        deterministic: true,
        clockMode: "external",
        advanceSemantics: "simulation-step",
        replayExact: false
      };
    },
    registerController(controller) {
      controllers.add(controller.id);
      return { ok: true };
    },
    observe(controllerId) {
      if (!controllers.has(controllerId)) throw new Error("controller not registered");
      return {
        schemaVersion: 1,
        tick,
        state: {
          room: "threshold",
          form: "spark",
          player: { x, y: 390, maxHp: 112 }
        }
      };
    },
    submit(controllerId, intent, intentTick) {
      if (!controllers.has(controllerId)) throw new Error("controller not registered");
      queued = { controllerId, intent, tick: intentTick };
      return { queued: true, tick: intentTick };
    },
    advance() {
      if (queued?.intent?.type === "MOVE" && queued.tick === tick) {
        const from = x;
        x += 4;
        events.push({
          type: "SPARK_PLAYER_MOVED",
          tick,
          controllerId: queued.controllerId,
          payload: { from: { x: from, y: 390 }, to: { x, y: 390 } }
        });
      }
      queued = null;
      tick += 1;
      return events.slice(-1);
    },
    events(since = 0) { return events.slice(since); },
    snapshot() { return { schemaVersion: 1, tick, x }; },
    recording() { return { schemaVersion: 1, tick, events }; },
    authority() {
      return Object.fromEntries([...controllers].map((id) => [id, ["MOVE", "DASH", "PULSE"]]));
    },
    hash() { return "fixture-hash-" + tick + "-" + x; }
  };
}
\`;

  fs.writeFileSync(
    path.join(root, "runtime", "spark-threshold-adapter-v1.js"),
    adapterSource,
  );
  return root;
}

test("external SPARK loader wraps a compatible adapter with Runtime Bridge v1", async () => {
  const root = makeFixture();
  try {
    const bridge = await loadExternalSparkThresholdBridgeV1(root);
    const descriptor = bridge.describe();
    assert.equal(descriptor.gameId, "spark-the-substrate");
    assert.equal(descriptor.runtimeVersion, "spark-threshold/0.17.0-bridge-v1");

    bridge.registerController({ id: "seat-1", kind: "human" });
    const before = bridge.observe("seat-1");
    assert.equal(before.state.player.x, 480);
    assert.equal(before.state.player.maxHp, 112);

    bridge.submit(
      "seat-1",
      { type: "MOVE", actorId: "spark", params: { x: 1, y: 0 } },
      0,
    );
    const events = bridge.advance();
    assert.equal(events[0].type, "SPARK_PLAYER_MOVED");

    const after = bridge.observe("seat-1");
    assert.ok(after.state.player.x > before.state.player.x);
    assert.deepEqual(bridge.authority()["seat-1"], ["MOVE", "DASH", "PULSE"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("external SPARK loader fails closed on version mismatch", async () => {
  const root = makeFixture({ version: "0.16.9" });
  try {
    await assert.rejects(
      () => loadExternalSparkThresholdBridgeV1(root),
      /expected SPARK 0\\.17\\.0/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("external SPARK loader rejects a wrong game descriptor", async () => {
  const root = makeFixture({ gameId: "not-spark" });
  try {
    await assert.rejects(
      () => loadExternalSparkThresholdBridgeV1(root),
      /unexpected SPARK gameId/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
