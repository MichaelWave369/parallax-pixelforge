export const PIXELFORGE_RUNTIME_PROTOCOL = "pixelforge-runtime-bridge";
export const PIXELFORGE_RUNTIME_VERSION = 1;

export const RUNTIME_BRIDGE_METHODS = Object.freeze([
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
]);

export const CLOCK_MODES = Object.freeze(["external", "engine"]);

export function jsonClone(value) {
  if (value === undefined) return undefined;
  assertJsonSafe(value);
  return JSON.parse(JSON.stringify(value));
}

export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

export function immutableCopy(value) {
  return deepFreeze(jsonClone(value));
}

export function assertJsonSafe(value, label = "value") {
  if (value === undefined)
    throw new TypeError(`${label} must be JSON-safe; undefined is not a wire value`);

  const seen = new Set();
  const visit = (item, path) => {
    if (item === null) return;
    const type = typeof item;
    if (["string", "boolean"].includes(type)) return;
    if (type === "number") {
      if (!Number.isFinite(item))
        throw new TypeError(`${path} must contain only finite numbers`);
      return;
    }
    if (type !== "object")
      throw new TypeError(`${path} contains non-JSON value of type ${type}`);

    if (seen.has(item))
      throw new TypeError(`${path} contains a circular reference`);
    seen.add(item);

    if (Array.isArray(item)) {
      item.forEach((nested, index) => visit(nested, `${path}[${index}]`));
    } else {
      const proto = Object.getPrototypeOf(item);
      if (proto !== Object.prototype && proto !== null)
        throw new TypeError(`${path} must contain plain objects only`);
      for (const [key, nested] of Object.entries(item))
        visit(nested, `${path}.${key}`);
    }

    seen.delete(item);
  };

  visit(value, label);
  return true;
}

export function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

export function assertBridgeDescriptorV1(descriptor) {
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor))
    throw new TypeError("Bridge descriptor must be an object");

  assertJsonSafe(descriptor, "descriptor");

  if (descriptor.protocol !== PIXELFORGE_RUNTIME_PROTOCOL)
    throw new TypeError("Unsupported bridge protocol");
  if (descriptor.version !== PIXELFORGE_RUNTIME_VERSION)
    throw new TypeError("Unsupported bridge version");

  assertNonEmptyString(descriptor.gameId, "descriptor.gameId");
  assertNonEmptyString(descriptor.runtimeVersion, "descriptor.runtimeVersion");

  if (typeof descriptor.deterministic !== "boolean")
    throw new TypeError("descriptor.deterministic must be boolean");

  if (
    descriptor.clockMode !== undefined &&
    !CLOCK_MODES.includes(descriptor.clockMode)
  )
    throw new TypeError("descriptor.clockMode must be external or engine");

  if (
    descriptor.advanceSemantics !== undefined &&
    (typeof descriptor.advanceSemantics !== "string" ||
      descriptor.advanceSemantics.length === 0)
  )
    throw new TypeError("descriptor.advanceSemantics must be a non-empty string");

  if (
    descriptor.replayExact !== undefined &&
    typeof descriptor.replayExact !== "boolean"
  )
    throw new TypeError("descriptor.replayExact must be boolean when present");

  return true;
}

export function clockSemantics(descriptor) {
  assertBridgeDescriptorV1(descriptor);
  const clockMode =
    descriptor.clockMode ?? (descriptor.deterministic ? "external" : "engine");

  return immutableCopy({
    clockMode,
    advanceSemantics:
      descriptor.advanceSemantics ??
      (clockMode === "external" ? "simulation-step" : "flush-controller-batch"),
    replayExact:
      descriptor.replayExact ??
      (descriptor.deterministic && clockMode === "external"),
  });
}

export function assertControllerDescriptorV1(descriptor) {
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor))
    throw new TypeError("Controller descriptor must be an object");

  assertJsonSafe(descriptor, "controller");
  assertNonEmptyString(descriptor.id, "controller.id");
  assertNonEmptyString(descriptor.kind, "controller.kind");

  if (descriptor.actor !== undefined)
    assertNonEmptyString(descriptor.actor, "controller.actor");
  if (descriptor.binding !== undefined)
    assertNonEmptyString(descriptor.binding, "controller.binding");
  if (descriptor.profile !== undefined)
    assertNonEmptyString(descriptor.profile, "controller.profile");

  return true;
}

export function createSubmittedRoot(controllerId, intent, tick) {
  assertNonEmptyString(controllerId, "controllerId");
  if (!Number.isSafeInteger(tick) || tick < 0)
    throw new TypeError("tick must be a non-negative safe integer");
  if (!intent || typeof intent !== "object" || Array.isArray(intent))
    throw new TypeError("intent must be an object");
  assertJsonSafe(intent, "intent");

  return immutableCopy({ controllerId, tick, intent });
}

export function assertSubmittedRootV1(root) {
  if (!root || typeof root !== "object" || Array.isArray(root))
    throw new TypeError("Submitted root must be an object");

  const controllerId = root.controllerId ?? root.controller_id;
  assertNonEmptyString(controllerId, "root.controllerId");

  if (!Number.isSafeInteger(root.tick) || root.tick < 0)
    throw new TypeError("root.tick must be a non-negative safe integer");

  if (!root.intent || typeof root.intent !== "object" || Array.isArray(root.intent))
    throw new TypeError("root.intent must be an object");

  assertJsonSafe(root, "root");
  return true;
}

export function assertQueueReceiptV1(receipt) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt))
    throw new TypeError("Queue receipt must be an object");
  assertJsonSafe(receipt, "receipt");
  if (receipt.queued !== true)
    throw new TypeError("Queue receipt must set queued: true");
  if (!Number.isSafeInteger(receipt.tick) || receipt.tick < 0)
    throw new TypeError("Queue receipt tick must be a non-negative safe integer");
  return true;
}

export function assertEventV1(event) {
  if (!event || typeof event !== "object" || Array.isArray(event))
    throw new TypeError("Runtime event must be an object");
  assertJsonSafe(event, "event");
  assertNonEmptyString(event.type, "event.type");
  return true;
}

export function assertEventStreamV1(events) {
  if (!Array.isArray(events))
    throw new TypeError("Runtime events must be an array");
  events.forEach(assertEventV1);
  return true;
}

export function assertObservationV1(observation) {
  if (!observation || typeof observation !== "object" || Array.isArray(observation))
    throw new TypeError("Observation must be an object");
  assertJsonSafe(observation, "observation");
  return true;
}

export function assertSnapshotV1(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot))
    throw new TypeError("Snapshot must be an object");
  assertJsonSafe(snapshot, "snapshot");
  return true;
}

export function assertRecordingV1(recording) {
  if (!recording || typeof recording !== "object" || Array.isArray(recording))
    throw new TypeError("Recording must be an object");
  assertJsonSafe(recording, "recording");
  return true;
}

export function assertAuthorityViewV1(authority) {
  if (!authority || typeof authority !== "object" || Array.isArray(authority))
    throw new TypeError("Authority view must be an object");
  assertJsonSafe(authority, "authority");
  return true;
}

export function assertRuntimeHashV1(hash) {
  if (typeof hash !== "string" || hash.length === 0)
    throw new TypeError("Runtime hash must be a non-empty string");
  return true;
}
