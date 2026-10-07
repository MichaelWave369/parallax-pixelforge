import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";

import { createCounterBridge } from "../runtime/reference-counter.js";
import {
  RUNTIME_JSONL_REQUEST_SCHEMA,
  RUNTIME_JSONL_RESPONSE_SCHEMA,
  serveRuntimeJsonlBridgeV1,
} from "../runtime/jsonl-transport-v1.js";

async function runLines(lines, seed = 0) {
  const input = new PassThrough();
  const output = new PassThrough();
  let text = "";
  output.setEncoding("utf8");
  output.on("data", (chunk) => {
    text += chunk;
  });

  const serving = serveRuntimeJsonlBridgeV1(
    createCounterBridge(seed),
    { input, output },
  );

  for (const line of lines)
    input.write(typeof line === "string" ? line + "\n" : JSON.stringify(line) + "\n");
  input.end();

  await serving;

  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function request(id, method, params = []) {
  return {
    schema: RUNTIME_JSONL_REQUEST_SCHEMA,
    id,
    method,
    params,
  };
}

test("JSONL transport carries the complete counter bridge path in order", async () => {
  const responses = await runLines([
    request("describe", "describe"),
    request("register", "registerController", [
      { id: "phicade-seat-1", kind: "human" },
    ]),
    request("observe-0", "observe", ["phicade-seat-1"]),
    request("submit", "submit", [
      "phicade-seat-1",
      {
        type: "ADD",
        actorId: "counter",
        params: { amount: 7 },
      },
      0,
    ]),
    request("advance", "advance"),
    request("observe-1", "observe", ["phicade-seat-1"]),
    request("events", "events", [0]),
    request("authority", "authority"),
    request("hash", "hash"),
  ]);

  assert.equal(responses.length, 9);
  assert.ok(
    responses.every(
      (response) =>
        response.schema === RUNTIME_JSONL_RESPONSE_SCHEMA &&
        response.ok === true,
    ),
  );

  assert.equal(
    responses[0].result.protocol,
    "pixelforge-runtime-bridge",
  );
  assert.equal(responses[2].result.value, 0);
  assert.equal(responses[4].result[0].type, "ACTION_ACCEPTED");
  assert.equal(responses[5].result.value, 7);
  assert.equal(responses[6].result.length, 1);
  assert.deepEqual(responses[7].result["phicade-seat-1"], ["ADD"]);

  const hash = JSON.parse(responses[8].result);
  assert.equal(hash.tick, 1);
  assert.equal(hash.value, 7);
});

test("transport fails closed on unsupported methods", async () => {
  const [response] = await runLines([
    {
      schema: RUNTIME_JSONL_REQUEST_SCHEMA,
      id: "bad-method",
      method: "grantAuthorityBecauseIAskedNicely",
      params: [],
    },
  ]);

  assert.equal(response.ok, false);
  assert.equal(response.error.code, "INVALID_REQUEST");
  assert.match(response.error.message, /unsupported Runtime Bridge method/);
});

test("transport reports malformed JSON without killing the session", async () => {
  const responses = await runLines([
    "{not-json",
    request("describe-after-error", "describe"),
  ]);

  assert.equal(responses.length, 2);
  assert.equal(responses[0].ok, false);
  assert.equal(responses[0].error.code, "MALFORMED_JSON");
  assert.equal(responses[1].ok, true);
  assert.equal(
    responses[1].result.gameId,
    "pixelforge-reference-counter",
  );
});
