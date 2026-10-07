import { createBridgeV1 } from "./bridge-v1.js";

const DIRECTIONS = Object.freeze({
  UP: [0, -1],
  DOWN: [0, 1],
  LEFT: [-1, 0],
  RIGHT: [1, 0],
});

function clone(value) {
  return structuredClone(value);
}

function assertScene(scene) {
  if (!scene || typeof scene !== "object")
    throw new TypeError("runtime scene packet must be an object");
  if (scene.schema !== "pixelforge.runtime-scene.v5.11")
    throw new TypeError("expected pixelforge.runtime-scene.v5.11 scene packet");
  if (scene.sceneId !== "bouncehome-grove")
    throw new TypeError("first cartridge bridge is pinned to bouncehome-grove");
  const width = scene.map?.width;
  const height = scene.map?.height;
  const collision = scene.map?.layers?.collision;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0)
    throw new TypeError("scene map dimensions are invalid");
  if (!Array.isArray(collision) || collision.length !== width * height)
    throw new TypeError("scene collision layer does not match map dimensions");
  return true;
}

function tileIndex(x, y, width) {
  return y * width + x;
}

function integerTile(centerCoordinate) {
  return Math.floor(centerCoordinate);
}

export function createLegendBouncehomeBridge(scenePacket) {
  assertScene(scenePacket);
  const scene = clone(scenePacket);
  const width = scene.map.width;
  const height = scene.map.height;
  const collision = scene.map.layers.collision;

  let tick = 0;
  let nextEvent = 1;
  let pending = [];
  const controllers = new Map();
  const ledger = [];
  const frames = [];
  const player = {
    id: "more-bounce",
    x: scene.runtime.player.x,
    y: scene.runtime.player.y,
    facing: scene.runtime.player.facing,
    animation: scene.runtime.player.animation,
  };

  function isBlocked(x, y) {
    const tx = integerTile(x);
    const ty = integerTile(y);
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) return true;
    return collision[tileIndex(tx, ty, width)] === true;
  }

  function emit(type, controllerId, payload) {
    const event = {
      id: "legend:" + nextEvent++,
      tick,
      schemaVersion: 1,
      type,
      controllerId,
      sourceId: player.id,
      payload: clone(payload),
    };
    ledger.push(event);
    return event;
  }

  const adapter = {
    describe() {
      return {
        protocol: "pixelforge-runtime-bridge",
        version: 1,
        gameId: "the-legend-of-more-bounce",
        runtimeVersion: "legend-bouncehome/1",
        deterministic: true,
        clockMode: "external",
        advanceSemantics: "simulation-step",
        replayExact: false,
      };
    },

    registerController(descriptor) {
      if (!descriptor?.id || !descriptor?.kind)
        throw new TypeError("controller descriptor requires id and kind");
      controllers.set(descriptor.id, clone(descriptor));
      return { ok: true };
    },

    observe(controllerId) {
      if (!controllers.has(controllerId))
        throw new Error("controller is not registered");

      return {
        schemaVersion: 1,
        tick,
        sceneId: scene.sceneId,
        sceneTitle: scene.title,
        cartridgeId: "the-legend-of-more-bounce",
        self: clone(player),
        map: {
          width,
          height,
          tileSize: scene.map.tileSize,
        },
        allowedActions: ["MOVE"],
      };
    },

    submit(controllerId, intent, intentTick = tick) {
      if (!controllers.has(controllerId))
        throw new Error("controller is not registered");

      pending.push({
        controllerId,
        tick: intentTick,
        intent: clone(intent),
      });

      return { queued: true, tick: intentTick };
    },

    advance(roots = []) {
      pending.push(...clone(roots));
      const eventStart = ledger.length;
      const frameRoots = pending;
      pending = [];

      for (const root of frameRoots) {
        const { controllerId, intent } = root;

        if (root.tick !== tick) {
          emit("ACTION_REJECTED", controllerId, {
            actionType: intent?.type ?? "unknown",
            reason: "WRONG_TICK",
          });
          continue;
        }

        const direction = intent?.params?.direction;
        const delta = DIRECTIONS[direction];

        if (
          intent?.type !== "MOVE" ||
          intent?.actorId !== player.id ||
          !delta
        ) {
          emit("ACTION_REJECTED", controllerId, {
            actionType: intent?.type ?? "unknown",
            reason: "MALFORMED_ACTION",
          });
          continue;
        }

        const targetX = player.x + delta[0];
        const targetY = player.y + delta[1];

        if (isBlocked(targetX, targetY)) {
          emit("MOVE_BLOCKED", controllerId, {
            direction,
            from: { x: player.x, y: player.y },
            attempted: { x: targetX, y: targetY },
          });
          continue;
        }

        const from = { x: player.x, y: player.y };
        player.x = targetX;
        player.y = targetY;
        player.facing =
          direction === "LEFT"
            ? "left"
            : direction === "RIGHT"
              ? "right"
              : player.facing;
        player.animation = "walk";

        emit("PLAYER_MOVED", controllerId, {
          direction,
          from,
          to: { x: player.x, y: player.y },
        });
      }

      frames.push({
        tick,
        roots: clone(frameRoots),
        player: clone(player),
      });
      tick += 1;

      return ledger.slice(eventStart);
    },

    events(since = 0) {
      return ledger.slice(since);
    },

    snapshot() {
      return {
        schemaVersion: 1,
        cartridgeId: "the-legend-of-more-bounce",
        sceneId: scene.sceneId,
        tick,
        player: clone(player),
        controllers: [...controllers.values()].map(clone),
        ledger: clone(ledger),
      };
    },

    recording() {
      return {
        schemaVersion: 1,
        cartridgeId: "the-legend-of-more-bounce",
        sceneId: scene.sceneId,
        frames: clone(frames),
        final: {
          tick,
          player: clone(player),
        },
      };
    },

    authority() {
      return Object.fromEntries(
        [...controllers.keys()].map((id) => [id, ["MOVE"]]),
      );
    },

    hash() {
      return JSON.stringify({
        cartridgeId: "the-legend-of-more-bounce",
        sceneId: scene.sceneId,
        tick,
        player,
        ledger,
      });
    },
  };

  return createBridgeV1(adapter);
}
