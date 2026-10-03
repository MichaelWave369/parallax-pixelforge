import {
  assertControllerDescriptorV1,
  assertJsonSafe,
  assertNonEmptyString,
  immutableCopy,
  jsonClone,
} from "./core-v1.js";

export const MODEL_POLICY_REQUEST_SCHEMA = "pixelforge/model-policy-request/1";
export const MODEL_POLICY_RESPONSE_SCHEMA = "pixelforge/model-policy-response/1";
export const MODEL_PROVIDER_RESPONSE_SCHEMA = "pixelforge/model-provider-response/1";

function cloneJson(value, label) {
  assertJsonSafe(value, label);
  return jsonClone(value);
}

function parseJsonObject(value, label) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new TypeError(`${label} must contain valid JSON`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new TypeError(`${label} must be a JSON object`);
  assertJsonSafe(parsed, label);
  return parsed;
}

export function createModelProviderV1({
  id,
  invoke,
  metadata = {},
}) {
  assertNonEmptyString(id, "provider.id");
  if (typeof invoke !== "function")
    throw new TypeError("Model provider requires invoke(request, context)");
  assertJsonSafe(metadata, "provider.metadata");

  const descriptor = immutableCopy({
    schema: "pixelforge/model-provider/1",
    id,
    metadata,
  });

  return Object.freeze({
    descriptor,

    async invoke(request, context = {}) {
      assertJsonSafe(request, "provider.request");
      assertJsonSafe(context, "provider.context");

      const result = await invoke(
        immutableCopy(request),
        immutableCopy(context),
      );

      const response = parseJsonObject(result, "provider.response");
      if (response.schema !== MODEL_PROVIDER_RESPONSE_SCHEMA)
        throw new TypeError(
          `provider.response.schema must be ${MODEL_PROVIDER_RESPONSE_SCHEMA}`,
        );
      if (!Object.prototype.hasOwnProperty.call(response, "output"))
        throw new TypeError("provider.response must contain output");

      assertJsonSafe(response.output, "provider.response.output");
      if (response.providerId !== undefined)
        assertNonEmptyString(response.providerId, "provider.response.providerId");
      if (response.model !== undefined)
        assertNonEmptyString(response.model, "provider.response.model");

      return immutableCopy(response);
    },
  });
}

export function createModelPolicyClientV1({
  id,
  provider,
  actor,
  binding,
  profile,
  instructions = "",
  metadata = {},
  maxIntentsPerTurn = 1,
  buildRequest = defaultModelRequestV1,
  parseResponse = defaultModelResponseParserV1,
}) {
  if (!provider || typeof provider !== "object")
    throw new TypeError("Model policy client requires a provider");
  if (!provider.descriptor || typeof provider.invoke !== "function")
    throw new TypeError("Invalid model provider");
  if (typeof buildRequest !== "function")
    throw new TypeError("buildRequest must be a function");
  if (typeof parseResponse !== "function")
    throw new TypeError("parseResponse must be a function");
  if (
    !Number.isSafeInteger(maxIntentsPerTurn) ||
    maxIntentsPerTurn < 0 ||
    maxIntentsPerTurn > 32
  )
    throw new TypeError("maxIntentsPerTurn must be an integer from 0 to 32");
  if (typeof instructions !== "string")
    throw new TypeError("instructions must be a string");
  assertJsonSafe(metadata, "client.metadata");

  const descriptor = {
    id,
    kind: "model",
    ...(actor ? { actor } : {}),
    ...(binding ? { binding } : {}),
    ...(profile ? { profile } : {}),
    metadata: {
      ...jsonClone(metadata),
      providerId: provider.descriptor.id,
      modelPolicySchema: MODEL_POLICY_REQUEST_SCHEMA,
    },
  };
  assertControllerDescriptorV1(descriptor);

  let sequence = 0;
  const receipts = [];

  const record = (type, payload) => {
    sequence += 1;
    receipts.push({
      id: `model:${sequence}`,
      type,
      payload: cloneJson(payload, "model.receipt.payload"),
    });
  };

  const decide = async (observation) => {
    sequence += 1;
    const requestId = `${id}:request:${sequence}`;

    try {
      const request = await buildRequest(
        immutableCopy(observation),
        immutableCopy({
          requestId,
          controller: descriptor,
          provider: provider.descriptor,
          instructions,
          maxIntentsPerTurn,
        }),
      );

      assertJsonSafe(request, "model.request");
      record("MODEL_REQUEST_BUILT", {
        requestId,
        providerId: provider.descriptor.id,
      });

      const providerResponse = await provider.invoke(request, {
        requestId,
        controllerId: id,
      });

      record("MODEL_PROVIDER_COMPLETED", {
        requestId,
        providerId: provider.descriptor.id,
        ...(providerResponse.model ? { model: providerResponse.model } : {}),
      });

      const parsed = await parseResponse(
        providerResponse,
        immutableCopy({
          requestId,
          observation,
          controller: descriptor,
          maxIntentsPerTurn,
        }),
      );

      const intents = normalizeModelIntentsV1(parsed, maxIntentsPerTurn);

      record("MODEL_INTENTS_PARSED", {
        requestId,
        intentCount: intents.length,
      });

      return intents;
    } catch (error) {
      record("MODEL_TURN_FAILED", {
        requestId,
        providerId: provider.descriptor.id,
        error:
          error instanceof Error && error.message
            ? error.message
            : "model policy failure",
      });
      throw error;
    }
  };

  return Object.freeze({
    descriptor: immutableCopy(descriptor),
    decide,
    providerDescriptor: provider.descriptor,
    modelReceipts: () => immutableCopy(receipts),
  });
}

export function defaultModelRequestV1(observation, context) {
  return immutableCopy({
    schema: MODEL_POLICY_REQUEST_SCHEMA,
    requestId: context.requestId,
    controller: context.controller,
    instructions: context.instructions,
    observation,
    responseContract: {
      schema: MODEL_POLICY_RESPONSE_SCHEMA,
      shape: {
        intents: "array",
      },
      maxIntents: context.maxIntentsPerTurn,
    },
  });
}

export function defaultModelResponseParserV1(providerResponse) {
  const payload = parseJsonObject(
    providerResponse.output,
    "provider.response.output",
  );

  if (payload.schema !== MODEL_POLICY_RESPONSE_SCHEMA)
    throw new TypeError(
      `model output schema must be ${MODEL_POLICY_RESPONSE_SCHEMA}`,
    );
  if (!Array.isArray(payload.intents))
    throw new TypeError("model output intents must be an array");

  return payload.intents;
}

export function normalizeModelIntentsV1(value, maxIntentsPerTurn = 1) {
  if (!Array.isArray(value))
    throw new TypeError("Parsed model intents must be an array");
  if (value.length > maxIntentsPerTurn)
    throw new RangeError(
      `Model returned ${value.length} intents; budget is ${maxIntentsPerTurn}`,
    );

  const intents = value.map((intent, index) => {
    if (!intent || typeof intent !== "object" || Array.isArray(intent))
      throw new TypeError(`intent[${index}] must be an object`);
    assertJsonSafe(intent, `intent[${index}]`);
    return intent;
  });

  return immutableCopy(intents);
}
