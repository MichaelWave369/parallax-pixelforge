import {
  PIXELFORGE_RUNTIME_PROTOCOL,
  PIXELFORGE_RUNTIME_VERSION,
  RUNTIME_BRIDGE_METHODS,
  assertAuthorityViewV1,
  assertBridgeDescriptorV1,
  assertControllerDescriptorV1,
  assertEventStreamV1,
  assertObservationV1,
  assertQueueReceiptV1,
  assertRecordingV1,
  assertRuntimeHashV1,
  assertSnapshotV1,
  immutableCopy,
  jsonClone,
} from "./core-v1.js";

export const PIXELFORGE_RUNTIME_BRIDGE_PROTOCOL = PIXELFORGE_RUNTIME_PROTOCOL;
export const PIXELFORGE_RUNTIME_BRIDGE_VERSION = PIXELFORGE_RUNTIME_VERSION;
export const BRIDGE_V1_METHODS = RUNTIME_BRIDGE_METHODS;

export function assertBridgeV1(bridge) {
  if (!bridge || typeof bridge !== "object")
    throw new TypeError("PixelForge runtime bridge must be an object");

  for (const method of BRIDGE_V1_METHODS)
    if (typeof bridge[method] !== "function")
      throw new TypeError(`PixelForge runtime bridge missing method: ${method}`);

  assertBridgeDescriptorV1(bridge.describe());
  return true;
}

/**
 * Wrap an adapter in the language-neutral Runtime Bridge v1 boundary.
 *
 * The wrapper enforces JSON-safe copies on every wire surface and validates the
 * minimum cross-engine contract. Game-specific schemas remain inside the game.
 */
export function createBridgeV1(adapter) {
  assertBridgeV1(adapter);

  return Object.freeze({
    describe: () => {
      const value = immutableCopy(adapter.describe());
      assertBridgeDescriptorV1(value);
      return value;
    },

    registerController: (descriptor) => {
      assertControllerDescriptorV1(descriptor);
      const value = jsonClone(adapter.registerController(jsonClone(descriptor)));
      if (value !== undefined) immutableCopy(value);
      return value;
    },

    observe: (controllerId, actorId) => {
      const value = immutableCopy(adapter.observe(controllerId, actorId));
      assertObservationV1(value);
      return value;
    },

    submit: (controllerId, intent, tick) => {
      const value = immutableCopy(
        adapter.submit(controllerId, jsonClone(intent), tick),
      );
      assertQueueReceiptV1(value);
      return value;
    },

    advance: (roots = []) => {
      const value = immutableCopy(adapter.advance(jsonClone(roots)));
      assertEventStreamV1(value);
      return value;
    },

    events: (since = 0) => {
      const value = immutableCopy(adapter.events(since));
      assertEventStreamV1(value);
      return value;
    },

    snapshot: () => {
      const value = immutableCopy(adapter.snapshot());
      assertSnapshotV1(value);
      return value;
    },

    recording: () => {
      const value = immutableCopy(adapter.recording());
      assertRecordingV1(value);
      return value;
    },

    authority: () => {
      const value = immutableCopy(adapter.authority());
      assertAuthorityViewV1(value);
      return value;
    },

    hash: () => {
      const value = String(adapter.hash());
      assertRuntimeHashV1(value);
      return value;
    },
  });
}
