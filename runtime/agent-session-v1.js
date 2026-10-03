import {
  assertControllerDescriptorV1,
  assertEventStreamV1,
  assertObservationV1,
  assertQueueReceiptV1,
  assertJsonSafe,
  immutableCopy,
  jsonClone,
} from "./core-v1.js";

export const AGENT_SESSION_SCHEMA = "pixelforge/agent-session/1";

export const AGENT_SESSION_STOP_REASONS = Object.freeze({
  MAX_TURNS: "max_turns",
  MAX_TOTAL_INTENTS: "max_total_intents",
  INTENT_BUDGET_BLOCKED: "intent_budget_blocked",
  EMPTY_TURN_LIMIT: "empty_turn_limit",
  MAX_DURATION: "max_duration",
  ABORTED: "aborted",
  STOP_CONDITION: "stop_condition",
  FAILED: "failed",
});

function integerInRange(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new TypeError(`${label} must be an integer from ${min} to ${max}`);
  return value;
}

function normalizeIntents(value) {
  if (value == null) return [];
  const intents = Array.isArray(value) ? value : [value];

  return intents.map((intent, index) => {
    if (!intent || typeof intent !== "object" || Array.isArray(intent))
      throw new TypeError(`decision intent[${index}] must be an object`);
    assertJsonSafe(intent, `decision intent[${index}]`);
    return jsonClone(intent);
  });
}

async function maybeHostStatus(host) {
  if (typeof host.status !== "function") return null;
  try {
    return immutableCopy(await host.status());
  } catch {
    return null;
  }
}

export class AgentSessionError extends Error {
  constructor(message, result, cause) {
    super(message, { cause });
    this.name = "AgentSessionError";
    this.result = result;
  }
}

/**
 * Run a bounded policy session over either RuntimeHostV1 or AsyncRuntimeHostV1.
 *
 * The runner owns observe -> decide -> budget check -> submit -> advance so the
 * total intent budget is enforced before any over-budget intent reaches a game.
 */
export async function runAgentSessionV1({
  host,
  client,
  actorId,
  attachClient = true,
  maxTurns = 10,
  maxTotalIntents = 10,
  maxConsecutiveEmptyTurns = 3,
  maxDurationMs = 300_000,
  stopWhen,
  signal,
  retainTurns = false,
} = {}) {
  if (!host || typeof host !== "object")
    throw new TypeError("Agent session requires a host");
  for (const method of ["observe", "submit", "advance"])
    if (typeof host[method] !== "function")
      throw new TypeError(`Agent session host missing method: ${method}`);

  if (!client || typeof client !== "object")
    throw new TypeError("Agent session requires a client");
  assertControllerDescriptorV1(client.descriptor);
  if (typeof client.decide !== "function")
    throw new TypeError("Agent session client requires decide(observation)");

  if (attachClient && typeof host.attachClient !== "function")
    throw new TypeError("Agent session host cannot attach clients");

  integerInRange(maxTurns, 1, 10_000, "maxTurns");
  integerInRange(maxTotalIntents, 0, 100_000, "maxTotalIntents");
  integerInRange(
    maxConsecutiveEmptyTurns,
    1,
    10_000,
    "maxConsecutiveEmptyTurns",
  );
  integerInRange(maxDurationMs, 1, 86_400_000, "maxDurationMs");

  if (stopWhen !== undefined && typeof stopWhen !== "function")
    throw new TypeError("stopWhen must be a function");
  if (typeof retainTurns !== "boolean")
    throw new TypeError("retainTurns must be boolean");

  const controllerId = client.descriptor.id;
  const startedAt = Date.now();
  let sequence = 0;
  let turnCount = 0;
  let totalIntents = 0;
  let totalEvents = 0;
  let emptyStreak = 0;
  const receipts = [];
  const retainedTurns = [];

  const record = (type, payload = {}) => {
    sequence += 1;
    const receipt = {
      id: `session:${sequence}`,
      schema: AGENT_SESSION_SCHEMA,
      type,
      payload: jsonClone(payload),
    };
    receipts.push(receipt);
    return receipt;
  };

  const summary = () => ({
    controllerId,
    actorId: actorId ?? null,
    turnCount,
    totalIntents,
    totalEvents,
    consecutiveEmptyTurns: emptyStreak,
  });

  const finish = async (status, stopReason, extra = {}) => {
    record("SESSION_STOPPED", {
      status,
      stopReason,
      ...summary(),
      ...extra,
    });

    return immutableCopy({
      schema: AGENT_SESSION_SCHEMA,
      status,
      stopReason,
      ...summary(),
      elapsedMs: Math.max(0, Date.now() - startedAt),
      hostStatus: await maybeHostStatus(host),
      receipts,
      ...(retainTurns ? { turns: retainedTurns } : {}),
      ...extra,
    });
  };

  const checkBoundaryStop = async () => {
    if (signal?.aborted)
      return finish("stopped", AGENT_SESSION_STOP_REASONS.ABORTED);

    if (Date.now() - startedAt >= maxDurationMs)
      return finish("stopped", AGENT_SESSION_STOP_REASONS.MAX_DURATION);

    if (turnCount >= maxTurns)
      return finish("stopped", AGENT_SESSION_STOP_REASONS.MAX_TURNS);

    if (totalIntents >= maxTotalIntents && maxTotalIntents > 0)
      return finish(
        "stopped",
        AGENT_SESSION_STOP_REASONS.MAX_TOTAL_INTENTS,
      );

    return null;
  };

  record("SESSION_STARTED", {
    controllerId,
    actorId: actorId ?? null,
    limits: {
      maxTurns,
      maxTotalIntents,
      maxConsecutiveEmptyTurns,
      maxDurationMs,
    },
  });

  try {
    const preAttachStop = await checkBoundaryStop();
    if (preAttachStop) return preAttachStop;

    if (attachClient) {
      const registration = await host.attachClient(client);
      record("SESSION_CLIENT_ATTACHED", {
        controllerId,
        registration: registration ?? null,
      });
    }

    while (true) {
      const boundaryStop = await checkBoundaryStop();
      if (boundaryStop) return boundaryStop;

      const observation = immutableCopy(
        await host.observe(controllerId, actorId),
      );
      assertObservationV1(observation);

      const decided = await client.decide(observation);
      const intents = normalizeIntents(decided);

      if (signal?.aborted)
        return finish("stopped", AGENT_SESSION_STOP_REASONS.ABORTED);

      if (Date.now() - startedAt >= maxDurationMs)
        return finish("stopped", AGENT_SESSION_STOP_REASONS.MAX_DURATION);

      if (totalIntents + intents.length > maxTotalIntents) {
        record("INTENT_BUDGET_BLOCKED", {
          turnNumber: turnCount + 1,
          proposedIntentCount: intents.length,
          remainingIntentBudget: maxTotalIntents - totalIntents,
        });
        return finish(
          "stopped",
          AGENT_SESSION_STOP_REASONS.INTENT_BUDGET_BLOCKED,
        );
      }

      const queueReceipts = [];
      for (const intent of intents) {
        const receipt = immutableCopy(
          await host.submit(controllerId, intent),
        );
        assertQueueReceiptV1(receipt);
        queueReceipts.push(receipt);
      }

      const cycle = immutableCopy(await host.advance());
      const events = cycle?.events ?? cycle?.directEvents ?? [];
      assertEventStreamV1(events);

      turnCount += 1;
      totalIntents += intents.length;
      totalEvents += events.length;
      emptyStreak = intents.length === 0 ? emptyStreak + 1 : 0;

      const turnReport = immutableCopy({
        turnNumber: turnCount,
        controllerId,
        observation,
        intents,
        queueReceipts,
        cycle,
      });

      if (retainTurns) retainedTurns.push(turnReport);

      record("SESSION_TURN_COMPLETED", {
        turnNumber: turnCount,
        intentCount: intents.length,
        eventCount: events.length,
        totalIntents,
        totalEvents,
        consecutiveEmptyTurns: emptyStreak,
      });

      if (stopWhen) {
        const decision = await stopWhen(
          turnReport,
          immutableCopy({
            ...summary(),
            elapsedMs: Math.max(0, Date.now() - startedAt),
          }),
        );

        if (decision === true || typeof decision === "string") {
          const reason =
            typeof decision === "string" && decision.trim()
              ? decision.trim()
              : AGENT_SESSION_STOP_REASONS.STOP_CONDITION;
          record("SESSION_STOP_CONDITION_MET", {
            turnNumber: turnCount,
            reason,
          });
          return finish("stopped", reason);
        }
      }

      if (emptyStreak >= maxConsecutiveEmptyTurns)
        return finish(
          "stopped",
          AGENT_SESSION_STOP_REASONS.EMPTY_TURN_LIMIT,
        );

      if (totalIntents >= maxTotalIntents && maxTotalIntents > 0)
        return finish(
          "stopped",
          AGENT_SESSION_STOP_REASONS.MAX_TOTAL_INTENTS,
        );
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "agent session failed";

    record("SESSION_FAILED", {
      ...summary(),
      error: message,
    });

    const result = immutableCopy({
      schema: AGENT_SESSION_SCHEMA,
      status: "failed",
      stopReason: AGENT_SESSION_STOP_REASONS.FAILED,
      ...summary(),
      elapsedMs: Math.max(0, Date.now() - startedAt),
      hostStatus: await maybeHostStatus(host),
      receipts,
      ...(retainTurns ? { turns: retainedTurns } : {}),
      error: { message },
    });

    throw new AgentSessionError(message, result, error);
  }
}
