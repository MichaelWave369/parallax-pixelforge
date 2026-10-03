export const PIXELFORGE_RUNTIME_BRIDGE_PROTOCOL = "pixelforge-runtime-bridge";
export const PIXELFORGE_RUNTIME_BRIDGE_VERSION = 1;

const METHODS = [
  "describe",
  "registerController",
  "observe",
  "submit",
  "advance",
  "events",
  "snapshot",
  "recording",
  "authority",
  "hash",
];

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function jsonSafe(value) {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

export function assertBridgeV1(bridge) {
  if (!bridge || typeof bridge !== "object")
    throw new TypeError("PixelForge runtime bridge must be an object");

  for (const method of METHODS)
    if (typeof bridge[method] !== "function")
      throw new TypeError(`PixelForge runtime bridge missing method: ${method}`);

  const descriptor = bridge.describe();
  if (!descriptor || typeof descriptor !== "object")
    throw new TypeError("Bridge describe() must return an object");
  if (descriptor.protocol !== PIXELFORGE_RUNTIME_BRIDGE_PROTOCOL)
    throw new TypeError("Unsupported bridge protocol");
  if (descriptor.version !== PIXELFORGE_RUNTIME_BRIDGE_VERSION)
    throw new TypeError("Unsupported bridge version");
  if (typeof descriptor.gameId !== "string" || !descriptor.gameId)
    throw new TypeError("Bridge descriptor requires gameId");
  if (typeof descriptor.runtimeVersion !== "string" || !descriptor.runtimeVersion)
    throw new TypeError("Bridge descriptor requires runtimeVersion");
  if (!jsonSafe(descriptor))
    throw new TypeError("Bridge descriptor must be JSON-safe");

  return true;
}

export function immutableCopy(value) {
  const visit = (item) => {
    if (!item || typeof item !== "object" || Object.isFrozen(item)) return;
    Object.values(item).forEach(visit);
    Object.freeze(item);
  };
  const copy = clone(value);
  visit(copy);
  return copy;
}

export function createBridgeV1(adapter) {
  assertBridgeV1(adapter);

  return Object.freeze({
    describe: () => immutableCopy(adapter.describe()),
    registerController: (descriptor) => clone(adapter.registerController(clone(descriptor))),
    observe: (controllerId, actorId) => immutableCopy(adapter.observe(controllerId, actorId)),
    submit: (controllerId, intent, tick) =>
      clone(adapter.submit(controllerId, clone(intent), tick)),
    advance: (roots = []) => immutableCopy(adapter.advance(clone(roots))),
    events: (since = 0) => immutableCopy(adapter.events(since)),
    snapshot: () => immutableCopy(adapter.snapshot()),
    recording: () => immutableCopy(adapter.recording()),
    authority: () => immutableCopy(adapter.authority()),
    hash: () => String(adapter.hash()),
  });
}

export const BRIDGE_V1_METHODS = Object.freeze([...METHODS]);
