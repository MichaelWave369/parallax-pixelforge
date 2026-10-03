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
  clockSemantics,
  immutableCopy,
  jsonClone,
} from "./core-v1.js";

const INTERNAL = Symbol("AsyncRuntimeHostV1");

function assertAsyncBridgeShape(bridge) {
  if (!bridge || typeof bridge !== "object")
    throw new TypeError("Async runtime bridge must be an object");

  for (const method of RUNTIME_BRIDGE_METHODS)
    if (typeof bridge[method] !== "function")
      throw new TypeError(`Async runtime bridge missing method: ${method}`);

  return true;
}

function normalizeIntents(value) {
  if (value == null) return [];
  const intents = Array.isArray(value) ? value : [value];
  for (const intent of intents) {
    if (!intent || typeof intent !== "object" || Array.isArray(intent))
      throw new TypeError("Policy decisions must be intent objects");
  }
  return jsonClone(intents);
}

export async function assertAsyncRuntimeBridgeV1(bridge) {
  assertAsyncBridgeShape(bridge);

  const descriptor = immutableCopy(await bridge.describe());
  assertBridgeDescriptorV1(descriptor);

  const events = immutableCopy(await bridge.events(0));
  assertEventStreamV1(events);

  const snapshot = immutableCopy(await bridge.snapshot());
  assertSnapshotV1(snapshot);

  const recording = immutableCopy(await bridge.recording());
  assertRecordingV1(recording);

  const authority = immutableCopy(await bridge.authority());
  assertAuthorityViewV1(authority);

  const hash = String(await bridge.hash());
  assertRuntimeHashV1(hash);

  return true;
}

/**
 * Transport-capable counterpart to RuntimeHostV1.
 *
 * Every bridge operation may return a value or Promise. This keeps model/policy
 * clients identical while allowing the runtime itself to live in Godot, a
 * worker, subprocess, TCP service, WebSocket endpoint, or another process.
 */
export class AsyncRuntimeHostV1 {
  #bridge;
  #descriptor;
  #semantics;
  #eventCursor = 0;
  #sequence = 0;
  #receipts = [];
  #clients = new Map();

  constructor(bridge, token) {
    if (token !== INTERNAL)
      throw new TypeError("Use AsyncRuntimeHostV1.connect(bridge)");
    assertAsyncBridgeShape(bridge);
    this.#bridge = bridge;
  }

  static async connect(bridge) {
    const host = new AsyncRuntimeHostV1(bridge, INTERNAL);
    const descriptor = immutableCopy(await bridge.describe());
    assertBridgeDescriptorV1(descriptor);

    host.#descriptor = descriptor;
    host.#semantics = clockSemantics(descriptor);
    host.#record("HOST_ATTACHED", {
      descriptor: host.#descriptor,
      semantics: host.#semantics,
      asynchronous: true,
    });
    return host;
  }

  get descriptor() {
    return this.#descriptor;
  }

  get semantics() {
    return this.#semantics;
  }

  async attachClient(client) {
    if (!client || typeof client !== "object")
      throw new TypeError("Client must be an object");
    assertControllerDescriptorV1(client.descriptor);
    if (typeof client.decide !== "function")
      throw new TypeError("Client requires decide(observation)");

    const id = client.descriptor.id;
    if (this.#clients.has(id))
      throw new Error(`Client already attached: ${id}`);

    const registration = await this.#bridge.registerController(
      jsonClone(client.descriptor),
    );
    if (registration?.ok === false)
      throw new Error(
        `Controller registration failed: ${registration.reason ?? "unspecified"}`,
      );

    const safeRegistration =
      registration === undefined
        ? { ok: true }
        : immutableCopy(registration);

    this.#clients.set(id, client);
    this.#record("CLIENT_ATTACHED", {
      controllerId: id,
      descriptor: client.descriptor,
      registration: safeRegistration,
    });

    return safeRegistration;
  }

  async observe(controllerId, actorId) {
    const observation = immutableCopy(
      await this.#bridge.observe(controllerId, actorId),
    );
    assertObservationV1(observation);
    this.#record("OBSERVATION_READ", {
      controllerId,
      ...(actorId ? { actorId } : {}),
    });
    return observation;
  }

  async submit(controllerId, intent, tick) {
    const receipt = immutableCopy(
      await this.#bridge.submit(controllerId, jsonClone(intent), tick),
    );
    assertQueueReceiptV1(receipt);
    this.#record("INTENT_QUEUED", {
      controllerId,
      receipt,
    });
    return receipt;
  }

  async advance(roots = []) {
    const direct = immutableCopy(
      await this.#bridge.advance(jsonClone(roots)),
    );
    assertEventStreamV1(direct);

    const events = await this.pollEvents();
    const hash = await this.hash();
    const report = immutableCopy({
      semantics: this.#semantics,
      directEvents: direct,
      events,
      hash,
    });

    this.#record("BRIDGE_ADVANCED", {
      directEventCount: direct.length,
      consumedEventCount: events.length,
      hash,
    });

    return report;
  }

  async pollEvents() {
    const events = immutableCopy(
      await this.#bridge.events(this.#eventCursor),
    );
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

    const observation = await this.observe(controllerId, actorId);
    const decided = await client.decide(observation);
    const intents = normalizeIntents(decided);

    const queueReceipts = [];
    for (const intent of intents)
      queueReceipts.push(await this.submit(controllerId, intent));

    const cycle = await this.advance();
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

  async snapshot() {
    const value = immutableCopy(await this.#bridge.snapshot());
    assertSnapshotV1(value);
    return value;
  }

  async recording() {
    const value = immutableCopy(await this.#bridge.recording());
    assertRecordingV1(value);
    return value;
  }

  async authority() {
    const value = immutableCopy(await this.#bridge.authority());
    assertAuthorityViewV1(value);
    return value;
  }

  async hash() {
    const value = String(await this.#bridge.hash());
    assertRuntimeHashV1(value);
    return value;
  }

  receipts() {
    return immutableCopy(this.#receipts);
  }

  async status() {
    return immutableCopy({
      descriptor: this.#descriptor,
      semantics: this.#semantics,
      attachedControllers: [...this.#clients.keys()],
      eventCursor: this.#eventCursor,
      hostReceiptCount: this.#receipts.length,
      hash: await this.hash(),
    });
  }

  #record(type, payload) {
    this.#sequence += 1;
    this.#receipts.push({
      id: `async-host:${this.#sequence}`,
      type,
      payload: jsonClone(payload),
    });
  }
}
