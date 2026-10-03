import {
  assertBridgeDescriptorV1,
  assertControllerDescriptorV1,
  assertEventStreamV1,
  assertObservationV1,
  assertQueueReceiptV1,
  assertRecordingV1,
  assertRuntimeHashV1,
  assertSnapshotV1,
  clockSemantics,
  immutableCopy,
  jsonClone,
} from "./core-v1.js";
import { assertRuntimeBridgeV1 } from "./conformance-v1.js";

function normalizeIntents(value) {
  if (value == null) return [];
  const intents = Array.isArray(value) ? value : [value];
  for (const intent of intents) {
    if (!intent || typeof intent !== "object" || Array.isArray(intent))
      throw new TypeError("Policy decisions must be intent objects");
  }
  return jsonClone(intents);
}

export function createPolicyClientV1({
  id,
  kind = "script",
  actor,
  binding,
  profile,
  decide,
  metadata,
}) {
  const descriptor = {
    id,
    kind,
    ...(actor ? { actor } : {}),
    ...(binding ? { binding } : {}),
    ...(profile ? { profile } : {}),
    ...(metadata ? { metadata } : {}),
  };
  assertControllerDescriptorV1(descriptor);

  if (typeof decide !== "function")
    throw new TypeError("Policy client requires decide(observation)");

  return Object.freeze({
    descriptor: immutableCopy(descriptor),
    decide,
  });
}

/**
 * Generic in-process host for any Runtime Bridge v1 implementation.
 *
 * The host never inspects game-specific state. It understands only the shared
 * bridge vocabulary and the runtime's declared clock semantics.
 */
export class RuntimeHostV1 {
  #bridge;
  #descriptor;
  #semantics;
  #eventCursor = 0;
  #sequence = 0;
  #receipts = [];
  #clients = new Map();

  constructor(bridge) {
    assertRuntimeBridgeV1(bridge);
    this.#bridge = bridge;
    this.#descriptor = immutableCopy(bridge.describe());
    assertBridgeDescriptorV1(this.#descriptor);
    this.#semantics = clockSemantics(this.#descriptor);

    this.#record("HOST_ATTACHED", {
      descriptor: this.#descriptor,
      semantics: this.#semantics,
    });
  }

  get descriptor() {
    return this.#descriptor;
  }

  get semantics() {
    return this.#semantics;
  }

  attachClient(client) {
    if (!client || typeof client !== "object")
      throw new TypeError("Client must be an object");
    assertControllerDescriptorV1(client.descriptor);
    if (typeof client.decide !== "function")
      throw new TypeError("Client requires decide(observation)");

    const id = client.descriptor.id;
    if (this.#clients.has(id))
      throw new Error(`Client already attached: ${id}`);

    const registration = this.#bridge.registerController(
      jsonClone(client.descriptor),
    );
    if (registration?.ok === false)
      throw new Error(
        `Controller registration failed: ${registration.reason ?? "unspecified"}`,
      );

    this.#clients.set(id, client);
    this.#record("CLIENT_ATTACHED", {
      controllerId: id,
      descriptor: client.descriptor,
      registration: registration ?? null,
    });

    return immutableCopy(registration ?? { ok: true });
  }

  observe(controllerId, actorId) {
    const observation = immutableCopy(
      this.#bridge.observe(controllerId, actorId),
    );
    assertObservationV1(observation);
    this.#record("OBSERVATION_READ", {
      controllerId,
      ...(actorId ? { actorId } : {}),
    });
    return observation;
  }

  submit(controllerId, intent, tick) {
    const receipt = immutableCopy(
      this.#bridge.submit(controllerId, jsonClone(intent), tick),
    );
    assertQueueReceiptV1(receipt);
    this.#record("INTENT_QUEUED", {
      controllerId,
      receipt,
    });
    return receipt;
  }

  advance(roots = []) {
    const direct = immutableCopy(this.#bridge.advance(jsonClone(roots)));
    assertEventStreamV1(direct);

    const events = this.pollEvents();
    const report = immutableCopy({
      semantics: this.#semantics,
      directEvents: direct,
      events,
      hash: this.hash(),
    });

    this.#record("BRIDGE_ADVANCED", {
      directEventCount: direct.length,
      consumedEventCount: events.length,
      hash: report.hash,
    });

    return report;
  }

  pollEvents() {
    const events = immutableCopy(this.#bridge.events(this.#eventCursor));
    assertEventStreamV1(events);
    this.#eventCursor += events.length;

    if (events.length)
      this.#record("EVENTS_CONSUMED", {
        from: this.#eventCursor - events.length,
        count: events.length,
      });

    return events;
  }

  async turn(controllerId, actorId) {
    const client = this.#clients.get(controllerId);
    if (!client) throw new Error(`Client not attached: ${controllerId}`);

    const observation = this.observe(controllerId, actorId);
    const decided = await client.decide(observation);
    const intents = normalizeIntents(decided);
    const queueReceipts = intents.map((intent) =>
      this.submit(controllerId, intent),
    );
    const cycle = this.advance();

    const report = immutableCopy({
      controllerId,
      observation,
      intents,
      queueReceipts,
      cycle,
    });

    this.#record("CLIENT_TURN_COMPLETED", {
      controllerId,
      intentCount: intents.length,
      eventCount: cycle.events.length,
      hash: cycle.hash,
    });

    return report;
  }

  snapshot() {
    const value = immutableCopy(this.#bridge.snapshot());
    assertSnapshotV1(value);
    return value;
  }

  recording() {
    const value = immutableCopy(this.#bridge.recording());
    assertRecordingV1(value);
    return value;
  }

  authority() {
    return immutableCopy(this.#bridge.authority());
  }

  hash() {
    const value = String(this.#bridge.hash());
    assertRuntimeHashV1(value);
    return value;
  }

  receipts() {
    return immutableCopy(this.#receipts);
  }

  status() {
    return immutableCopy({
      descriptor: this.#descriptor,
      semantics: this.#semantics,
      attachedControllers: [...this.#clients.keys()],
      eventCursor: this.#eventCursor,
      hostReceiptCount: this.#receipts.length,
      hash: this.hash(),
    });
  }

  #record(type, payload) {
    this.#sequence += 1;
    this.#receipts.push({
      id: `host:${this.#sequence}`,
      type,
      payload: jsonClone(payload),
    });
  }
}
