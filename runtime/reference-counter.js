import { createBridgeV1 } from "./bridge-v1.js";

export function createCounterBridge(seed = 0) {
  let tick = 0;
  let value = seed;
  let nextEvent = 1;
  const controllers = new Map();
  const ledger = [];
  const frames = [];

  const adapter = {
    describe() {
      return {
        protocol: "pixelforge-runtime-bridge",
        version: 1,
        gameId: "pixelforge-reference-counter",
        runtimeVersion: "counter/1",
        deterministic: true,
      };
    },

    registerController(descriptor) {
      if (!descriptor?.id || !descriptor?.kind)
        throw new TypeError("controller descriptor requires id and kind");
      controllers.set(descriptor.id, structuredClone(descriptor));
      return { ok: true };
    },

    observe(controllerId) {
      if (!controllers.has(controllerId))
        throw new Error("controller is not registered");
      return {
        schemaVersion: 1,
        tick,
        self: { id: "counter" },
        value,
        allowedActions: ["ADD"],
      };
    },

    submit(controllerId, intent, intentTick = tick) {
      if (!controllers.has(controllerId))
        throw new Error("controller is not registered");
      if (intentTick !== tick)
        return { accepted: false, reason: "WRONG_TICK" };
      if (
        intent?.type !== "ADD" ||
        intent?.actorId !== "counter" ||
        !Number.isSafeInteger(intent?.params?.amount)
      )
        return { accepted: false, reason: "MALFORMED_ACTION" };

      value += intent.params.amount;
      const event = {
        id: `e:${nextEvent++}`,
        tick,
        schemaVersion: 1,
        type: "ACTION_ACCEPTED",
        controllerId,
        sourceId: "counter",
        payload: {
          actionType: "ADD",
          amount: intent.params.amount,
          value,
        },
      };
      ledger.push(event);
      frames.push({ tick, controllerId, intent: structuredClone(intent) });
      return { accepted: true, reason: "ALLOW" };
    },

    advance() {
      tick += 1;
      return [];
    },

    events(since = 0) {
      return ledger.slice(since);
    },

    snapshot() {
      return {
        schemaVersion: 1,
        game: "pixelforge-reference-counter",
        tick,
        value,
        controllers: [...controllers.values()],
        ledger,
      };
    },

    recording() {
      return {
        schemaVersion: 1,
        seed,
        frames,
        final: { tick, value },
      };
    },

    authority() {
      return Object.fromEntries(
        [...controllers.keys()].map((id) => [id, ["ADD"]]),
      );
    },

    hash() {
      return JSON.stringify({ tick, value, ledger });
    },
  };

  return createBridgeV1(adapter);
}
