import {
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
} from "./core-v1.js";

export function assertRuntimeBridgeV1(bridge) {
  if (!bridge || typeof bridge !== "object")
    throw new TypeError("Runtime bridge must be an object");

  for (const method of RUNTIME_BRIDGE_METHODS)
    if (typeof bridge[method] !== "function")
      throw new TypeError(`Runtime bridge missing method: ${method}`);

  assertBridgeDescriptorV1(bridge.describe());
  assertEventStreamV1(bridge.events(0));
  assertSnapshotV1(bridge.snapshot());
  assertRecordingV1(bridge.recording());
  assertAuthorityViewV1(bridge.authority());
  assertRuntimeHashV1(bridge.hash());
  return true;
}

/**
 * Exercise the common controller -> observation -> queued intent -> advance path.
 *
 * This intentionally does not require ACTION_ACCEPTED. Some runtimes require
 * explicit authority delegation first, and rejection is itself valid governed
 * behavior. Game-specific acceptance belongs in each game's qualification suite.
 */
export function runRuntimeBridgeProbeV1({
  bridge,
  controller,
  makeIntent,
  actorId,
}) {
  assertRuntimeBridgeV1(bridge);
  assertControllerDescriptorV1(controller);
  if (typeof makeIntent !== "function")
    throw new TypeError("makeIntent must be a function");

  const registration = bridge.registerController(controller);
  if (registration?.ok === false)
    throw new Error(
      `Controller registration failed: ${registration.reason ?? "unspecified"}`,
    );

  const observation = bridge.observe(controller.id, actorId);
  assertObservationV1(observation);

  const intent = makeIntent(observation);
  if (!intent || typeof intent !== "object" || Array.isArray(intent))
    throw new TypeError("makeIntent must return an intent object");

  const receipt = bridge.submit(controller.id, intent);
  assertQueueReceiptV1(receipt);

  const produced = bridge.advance();
  assertEventStreamV1(produced);

  const report = {
    descriptor: bridge.describe(),
    registration: registration ?? null,
    observation,
    receipt,
    producedEvents: produced,
    snapshot: bridge.snapshot(),
    recording: bridge.recording(),
    authority: bridge.authority(),
    hash: bridge.hash(),
  };

  assertSnapshotV1(report.snapshot);
  assertRecordingV1(report.recording);
  assertAuthorityViewV1(report.authority);
  assertRuntimeHashV1(report.hash);

  return immutableCopy(report);
}
