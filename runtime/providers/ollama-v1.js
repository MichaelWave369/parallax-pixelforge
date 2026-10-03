import {
  MODEL_POLICY_RESPONSE_SCHEMA,
  MODEL_PROVIDER_RESPONSE_SCHEMA,
  createModelProviderV1,
} from "../model-policy-v1.js";
import {
  assertJsonSafe,
  assertNonEmptyString,
  immutableCopy,
  jsonClone,
} from "../core-v1.js";

export const OLLAMA_PROVIDER_ID = "ollama:local";
export const OLLAMA_CHAT_PATH = "/api/chat";

function normalizeBaseUrl(value) {
  const baseUrl = value ?? "http://127.0.0.1:11434";
  assertNonEmptyString(baseUrl, "ollama.baseUrl");

  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new TypeError("ollama.baseUrl must be a valid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol))
    throw new TypeError("ollama.baseUrl must use http or https");

  parsed.pathname = parsed.pathname.replace(/\/$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function defaultSystemPrompt(maxIntents) {
  return [
    "You are a bounded game-control policy.",
    "Return ONLY valid JSON. Do not include markdown or commentary.",
    `The response schema is exactly {"schema":"${MODEL_POLICY_RESPONSE_SCHEMA}","intents":[...]}`,
    `Return at most ${maxIntents} intent(s).`,
    "Every intent must be chosen only from what the observation permits.",
    "Do not invent hidden state, authority, actions, actors, tools, or game facts.",
  ].join("\n");
}

function extractMaxIntents(request) {
  const value = request?.responseContract?.maxIntents;
  return Number.isSafeInteger(value) && value >= 0 ? value : 1;
}

function buildChatBody({
  model,
  request,
  system,
  options,
  keepAlive,
}) {
  const maxIntents = extractMaxIntents(request);
  const messages = [
    {
      role: "system",
      content: [defaultSystemPrompt(maxIntents), system].filter(Boolean).join("\n\n"),
    },
    {
      role: "user",
      content: JSON.stringify(request),
    },
  ];

  const body = {
    model,
    stream: false,
    format: "json",
    messages,
  };

  if (options && Object.keys(options).length) body.options = jsonClone(options);
  if (keepAlive !== undefined) body.keep_alive = keepAlive;

  assertJsonSafe(body, "ollama.request");
  return body;
}

export function createOllamaProviderV1({
  model,
  baseUrl = "http://127.0.0.1:11434",
  fetchImpl = globalThis.fetch,
  timeoutMs = 60_000,
  system = "",
  options = {},
  keepAlive,
  headers = {},
} = {}) {
  assertNonEmptyString(model, "ollama.model");
  if (typeof fetchImpl !== "function")
    throw new TypeError("Ollama provider requires fetch()");
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 10 * 60_000
  )
    throw new TypeError("ollama.timeoutMs must be an integer from 1 to 600000");
  if (typeof system !== "string")
    throw new TypeError("ollama.system must be a string");
  assertJsonSafe(options, "ollama.options");
  assertJsonSafe(headers, "ollama.headers");

  const endpoint = `${normalizeBaseUrl(baseUrl)}${OLLAMA_CHAT_PATH}`;

  return createModelProviderV1({
    id: OLLAMA_PROVIDER_ID,
    metadata: {
      transport: "ollama-chat",
      model,
      structuredOutput: "json",
      streaming: false,
    },

    async invoke(request, context) {
      const body = buildChatBody({
        model,
        request,
        system,
        options,
        keepAlive,
      });

      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(new Error("Ollama request timed out")),
        timeoutMs,
      );

      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...jsonClone(headers),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted)
          throw new Error(
            `Ollama request timed out after ${timeoutMs}ms`,
            { cause: error },
          );
        throw new Error(
          `Ollama request failed: ${
            error instanceof Error ? error.message : "network error"
          }`,
          { cause: error },
        );
      } finally {
        clearTimeout(timer);
      }

      if (!response || typeof response.ok !== "boolean")
        throw new TypeError("Ollama fetch returned an invalid response object");

      let payload;
      try {
        payload = await response.json();
      } catch (error) {
        throw new Error("Ollama response was not valid JSON", { cause: error });
      }

      assertJsonSafe(payload, "ollama.response");

      if (!response.ok) {
        const detail =
          typeof payload?.error === "string" && payload.error
            ? payload.error
            : `HTTP ${response.status ?? "error"}`;
        throw new Error(`Ollama rejected request: ${detail}`);
      }

      const output = payload?.message?.content;
      if (typeof output !== "string" || output.trim().length === 0)
        throw new Error("Ollama response missing message.content");

      const usage = {};
      if (Number.isFinite(payload.prompt_eval_count))
        usage.promptTokens = payload.prompt_eval_count;
      if (Number.isFinite(payload.eval_count))
        usage.completionTokens = payload.eval_count;
      if (Number.isFinite(payload.total_duration))
        usage.totalDurationNs = payload.total_duration;

      return immutableCopy({
        schema: MODEL_PROVIDER_RESPONSE_SCHEMA,
        providerId: OLLAMA_PROVIDER_ID,
        model:
          typeof payload.model === "string" && payload.model
            ? payload.model
            : model,
        output,
        ...(Object.keys(usage).length ? { usage } : {}),
        metadata: {
          requestId: context.requestId ?? null,
          done: payload.done === true,
          doneReason:
            typeof payload.done_reason === "string"
              ? payload.done_reason
              : null,
        },
      });
    },
  });
}
