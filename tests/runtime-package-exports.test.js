import assert from "node:assert/strict";
import test from "node:test";

import * as sdk from "parallax-pixelforge/runtime";
import * as core from "parallax-pixelforge/runtime/core-v1";
import * as bridge from "parallax-pixelforge/runtime/bridge-v1";
import * as conformance from "parallax-pixelforge/runtime/conformance-v1";
import * as host from "parallax-pixelforge/runtime/host-v1";
import * as asyncHost from "parallax-pixelforge/runtime/async-host-v1";
import * as agentSession from "parallax-pixelforge/runtime/agent-session-v1";
import * as modelPolicy from "parallax-pixelforge/runtime/model-policy-v1";
import * as ollama from "parallax-pixelforge/runtime/providers/ollama-v1";

test("package self-reference exposes Runtime SDK v1 public entry points", () => {
  assert.equal(sdk.PIXELFORGE_RUNTIME_PROTOCOL, "pixelforge-runtime-bridge");
  assert.equal(sdk.PIXELFORGE_RUNTIME_VERSION, 1);
  assert.equal(typeof sdk.createBridgeV1, "function");
  assert.equal(typeof sdk.createSubmittedRoot, "function");
  assert.equal(typeof sdk.clockSemantics, "function");
  assert.equal(typeof sdk.runRuntimeBridgeProbeV1, "function");
  assert.equal(typeof sdk.RuntimeHostV1, "function");
  assert.equal(typeof sdk.createPolicyClientV1, "function");
  assert.equal(typeof sdk.AsyncRuntimeHostV1, "function");
  assert.equal(typeof sdk.assertAsyncRuntimeBridgeV1, "function");
  assert.equal(typeof sdk.runAgentSessionV1, "function");
  assert.equal(typeof sdk.AgentSessionError, "function");
  assert.equal(typeof sdk.createModelProviderV1, "function");
  assert.equal(typeof sdk.createModelPolicyClientV1, "function");
  assert.equal(typeof sdk.createOllamaProviderV1, "function");
});

test("subpath exports resolve to the same core functions", () => {
  assert.equal(core.createSubmittedRoot, sdk.createSubmittedRoot);
  assert.equal(bridge.createBridgeV1, sdk.createBridgeV1);
  assert.equal(
    conformance.runRuntimeBridgeProbeV1,
    sdk.runRuntimeBridgeProbeV1,
  );
  assert.equal(host.RuntimeHostV1, sdk.RuntimeHostV1);
  assert.equal(host.createPolicyClientV1, sdk.createPolicyClientV1);
  assert.equal(asyncHost.AsyncRuntimeHostV1, sdk.AsyncRuntimeHostV1);
  assert.equal(asyncHost.assertAsyncRuntimeBridgeV1, sdk.assertAsyncRuntimeBridgeV1);
  assert.equal(agentSession.runAgentSessionV1, sdk.runAgentSessionV1);
  assert.equal(agentSession.AgentSessionError, sdk.AgentSessionError);
  assert.equal(modelPolicy.createModelProviderV1, sdk.createModelProviderV1);
  assert.equal(modelPolicy.createModelPolicyClientV1, sdk.createModelPolicyClientV1);
  assert.equal(ollama.createOllamaProviderV1, sdk.createOllamaProviderV1);
});
