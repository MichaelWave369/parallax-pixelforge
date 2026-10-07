import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { createLegendBouncehomeBridge } from "../runtime/legend-bouncehome-v1.js";

const scene = JSON.parse(
  fs.readFileSync(
    "games/the-legend-of-more-bounce/runtime/bouncehome-grove.runtime-scene.v5.11.json",
    "utf8",
  ),
);

function controller(id = "test-controller") {
  return { id, kind: "human" };
}

function move(direction) {
  return {
    type: "MOVE",
    actorId: "more-bounce",
    params: { direction },
  };
}

test("Legend bridge loads the actual Bouncehome Grove scene packet", () => {
  const bridge = createLegendBouncehomeBridge(scene);
  const descriptor = bridge.describe();

  assert.equal(descriptor.gameId, "the-legend-of-more-bounce");
  assert.equal(descriptor.clockMode, "external");

  bridge.registerController(controller());
  const observation = bridge.observe("test-controller");

  assert.equal(observation.sceneId, "bouncehome-grove");
  assert.equal(observation.self.x, 2.5);
  assert.equal(observation.self.y, 8.5);
  assert.deepEqual(observation.allowedActions, ["MOVE"]);
});

test("governed movement follows the real scene collision layer", () => {
  const bridge = createLegendBouncehomeBridge(scene);
  bridge.registerController(controller());

  bridge.submit("test-controller", move("RIGHT"), 0);
  const first = bridge.advance();
  assert.equal(first.length, 1);
  assert.equal(first[0].type, "PLAYER_MOVED");

  let observation = bridge.observe("test-controller");
  assert.equal(observation.self.x, 3.5);
  assert.equal(observation.self.y, 8.5);

  bridge.submit("test-controller", move("LEFT"), 1);
  bridge.advance();
  bridge.submit("test-controller", move("LEFT"), 2);
  bridge.advance();

  observation = bridge.observe("test-controller");
  assert.equal(observation.self.x, 1.5);

  bridge.submit("test-controller", move("LEFT"), 3);
  const blocked = bridge.advance();
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].type, "MOVE_BLOCKED");

  observation = bridge.observe("test-controller");
  assert.equal(observation.self.x, 1.5);
  assert.equal(observation.self.y, 8.5);
});

test("wrong-tick and malformed actions fail closed", () => {
  const bridge = createLegendBouncehomeBridge(scene);
  bridge.registerController(controller());

  bridge.submit("test-controller", move("RIGHT"), 7);
  const wrongTick = bridge.advance();
  assert.equal(wrongTick[0].type, "ACTION_REJECTED");
  assert.equal(wrongTick[0].payload.reason, "WRONG_TICK");

  bridge.submit(
    "test-controller",
    { type: "TELEPORT", actorId: "more-bounce", params: {} },
    1,
  );
  const malformed = bridge.advance();
  assert.equal(malformed[0].type, "ACTION_REJECTED");
  assert.equal(malformed[0].payload.reason, "MALFORMED_ACTION");
});

test("snapshot, recording, events, authority and hash remain available", () => {
  const bridge = createLegendBouncehomeBridge(scene);
  bridge.registerController(controller("phi"));

  bridge.submit("phi", move("RIGHT"), 0);
  bridge.advance();

  assert.equal(bridge.events(0).length, 1);
  assert.equal(bridge.snapshot().sceneId, "bouncehome-grove");
  assert.equal(bridge.recording().frames.length, 1);
  assert.deepEqual(bridge.authority().phi, ["MOVE"]);
  assert.ok(bridge.hash().includes("the-legend-of-more-bounce"));
});
