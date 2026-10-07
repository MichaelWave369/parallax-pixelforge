import readline from "node:readline";
import {
  RUNTIME_BRIDGE_METHODS,
  jsonClone,
} from "./core-v1.js";

export const RUNTIME_JSONL_REQUEST_SCHEMA =
  "pixelforge.runtime-transport.request.v1";
export const RUNTIME_JSONL_RESPONSE_SCHEMA =
  "pixelforge.runtime-transport.response.v1";

function errorPayload(id, code, message) {
  return {
    schema: RUNTIME_JSONL_RESPONSE_SCHEMA,
    id: id ?? null,
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function assertRequestShape(request) {
  if (!request || typeof request !== "object" || Array.isArray(request))
    throw new TypeError("request must be an object");

  if (request.schema !== RUNTIME_JSONL_REQUEST_SCHEMA)
    throw new TypeError("unsupported request schema");

  if (
    (typeof request.id !== "string" && typeof request.id !== "number") ||
    String(request.id).length === 0
  )
    throw new TypeError("request id must be a non-empty string or number");

  if (
    typeof request.method !== "string" ||
    !RUNTIME_BRIDGE_METHODS.includes(request.method)
  )
    throw new TypeError("unsupported Runtime Bridge method");

  if (
    request.params !== undefined &&
    !Array.isArray(request.params)
  )
    throw new TypeError("request params must be an array when present");

  return true;
}

/**
 * Dispatch exactly one JSON-safe request against a Runtime Bridge v1 object.
 *
 * This is transport only. It does not grant controller authority, reinterpret
 * game rules, or claim replay/determinism properties the bridge did not expose.
 */
export async function dispatchRuntimeJsonlRequestV1(bridge, request) {
  let safeRequest;
  try {
    safeRequest = jsonClone(request);
    assertRequestShape(safeRequest);
  } catch (error) {
    return errorPayload(
      request?.id,
      "INVALID_REQUEST",
      error instanceof Error ? error.message : String(error),
    );
  }

  try {
    const result = await bridge[safeRequest.method](
      ...(safeRequest.params ?? []),
    );
    return {
      schema: RUNTIME_JSONL_RESPONSE_SCHEMA,
      id: safeRequest.id,
      ok: true,
      result: result === undefined ? null : jsonClone(result),
    };
  } catch (error) {
    return errorPayload(
      safeRequest.id,
      "BRIDGE_ERROR",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Serve Runtime Bridge v1 over newline-delimited JSON.
 *
 * Requests are processed strictly in input order so a transported runtime keeps
 * the same sequencing semantics as an in-process bridge. EOF owns lifecycle;
 * there is intentionally no privileged remote shutdown method in v1.
 */
export async function serveRuntimeJsonlBridgeV1(
  bridge,
  {
    input = process.stdin,
    output = process.stdout,
  } = {},
) {
  if (!bridge || typeof bridge !== "object")
    throw new TypeError("bridge must be an object");
  if (!input || typeof input.on !== "function")
    throw new TypeError("input must be a readable stream");
  if (!output || typeof output.write !== "function")
    throw new TypeError("output must be a writable stream");

  const lines = readline.createInterface({
    input,
    crlfDelay: Infinity,
    terminal: false,
  });

  for await (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let response;
    try {
      const request = JSON.parse(line);
      response = await dispatchRuntimeJsonlRequestV1(bridge, request);
    } catch (error) {
      response = errorPayload(
        null,
        "MALFORMED_JSON",
        error instanceof Error ? error.message : String(error),
      );
    }

    output.write(JSON.stringify(response) + "\n");
  }
}
