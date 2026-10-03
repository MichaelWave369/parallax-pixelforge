import assert from "node:assert/strict";
import test from "node:test";

import * as sdk from "parallax-pixelforge/runtime";
import * as core from "parallax-pixelforge/runtime/core-v1";
import * as bridge from "parallax-pixelforge/runtime/bridge-v1";
import * as conformance from "parallax-pixelforge/runtime/conformance-v1";

test("package self-reference exposes Runtime SDK v1 public entry points", () => {
  assert.equal(sdk.PIXELFORGE_RUNTIME_PROTOCOL, "pixelforge-runtime-bridge");
  assert.equal(sdk.PIXELFORGE_RUNTIME_VERSION, 1);
  assert.equal(typeof sdk.createBridgeV1, "function");
  assert.equal(typeof sdk.createSubmittedRoot, "function");
  assert.equal(typeof sdk.clockSemantics, "function");
  assert.equal(typeof sdk.runRuntimeBridgeProbeV1, "function");
});

test("subpath exports resolve to the same core functions", () => {
  assert.equal(core.createSubmittedRoot, sdk.createSubmittedRoot);
  assert.equal(bridge.createBridgeV1, sdk.createBridgeV1);
  assert.equal(
    conformance.runRuntimeBridgeProbeV1,
    sdk.runRuntimeBridgeProbeV1,
  );
});
