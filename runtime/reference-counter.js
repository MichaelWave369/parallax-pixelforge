import { createBridgeV1 } from "./bridge-v1.js";

export function createCounterBridge(seed = 0) {
  let tick = 0;
  let value = seed;
  let nextEvent = 1;
  const controllers = new Map();
  const ledger = [];
  const frames = [];
  let pending = [];

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
      pending.push({
        controllerId,
        tick: intentTick,
        intent: structuredClone(intent),
      });
      return { queued: true, tick: intentTick };
    },

    advance(roots = []) {
      pending.push(...structuredClone(roots));
      const eventStart = ledger.length;
      const frameRoots = pending;
      pending = [];

      for (const root of frameRoots) {
        const { controllerId, intent } = root;
        let accepted = true;
        let reason = "ALLOW";

        if (root.tick !== tick) {
          accepted = false;
          reason = "WRONG_TICK";
        } else if (
          intent?.type !== "ADD" ||
          intent?.actorId !== "counter" ||
          !Number.isSafeInteger(intent?.params?.amount)
        ) {
          accepted = false;
          reason = "MALFORMED_ACTION";
        }

        if (accepted) value += intent.params.amount;

        ledger.push({
          id: `e:${nextEvent++}`,
          tick,
          schemaVersion: 1,
          type: accepted ? "ACTION_ACCEPTED" : "ACTION_REJECTED",
          controllerId,
          sourceId: intent?.actorId ?? "unknown",
          payload: {
            actionType: intent?.type ?? "unknown",
            reason,
            ...(accepted ? { amount: intent.params.amount, value } : {}),
          },
        });
      }

      frames.push({ tick, roots: structuredClone(frameRoots) });
      tick += 1;
      return ledger.slice(eventStart);
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
