import test from "node:test";
import assert from "node:assert/strict";
import {
  PIXELFORGE_BRIDGE_PROTOCOL,
  createPixelForgePhiOSBridgeClient,
  readPixelForgePhiOSEmbedConfig,
  strictPhiOSParentOrigin,
} from "../vr-studio/phios-bridge-client.js";

const origin = "http://127.0.0.1:4671";
const childOrigin = "http://127.0.0.1:4672";
const parent = {};
const session = "f10342be-61dd-4ff2-bc32-4d8340fd6789";
const host = (type, extras = {}) => ({
  protocol: PIXELFORGE_BRIDGE_PROTOCOL, type, app_id: "pixelforge",
  session_id: session, execution_authority: false, ...extras,
});
const event = (data, from = origin, source = parent) => ({
  origin: from, source, data,
});
const client = () => createPixelForgePhiOSBridgeClient({
  parentOrigin: origin, childOrigin, parentSource: parent,
});
function helloAndReady(instance) {
  const hello = instance.handle(event(host("host.bootstrap")));
  assert.equal(hello.kind, "outbound");
  assert.equal(hello.targetOrigin, origin);
  const accepted = instance.handle(event(host("host.ready", {
    request_id: hello.message.request_id, read_approved: false,
  })));
  assert.deepEqual(accepted, { kind: "ready", readApproved: false });
  return hello;
}

test("standalone browser or missing/mismatched referrer does not enable PhiOS bridge", () => {
  const options = {
    url: childOrigin + "/?phios_parent_origin=" + encodeURIComponent(origin),
    referrer: origin + "/project",
    childOrigin, embedded: true,
  };
  assert.deepEqual(readPixelForgePhiOSEmbedConfig(options), { parentOrigin: origin });
  for (const invalid of [
    { ...options, embedded: false },
    { ...options, referrer: "" },
    { ...options, referrer: "https://rogue.test/evil" },
    { ...options, url: childOrigin + "/" },
    { ...options, url: childOrigin + "/?phios_parent_origin=" + encodeURIComponent(childOrigin) },
    { ...options, url: childOrigin + "/?phios_parent_origin=" + encodeURIComponent(origin) + "&grant=1" },
    { ...options, url: childOrigin + "/?phios_parent_origin=*" },
  ]) assert.equal(readPixelForgePhiOSEmbedConfig(invalid), null);
});

test("parent origin is exact HTTPS or loopback, never wildcard, credential or foreign HTTP", () => {
  for (const value of ["*", "http://example.org", "https://example.org/path",
    "https://example.org/", "https://user:pass@example.org", childOrigin, ""]) {
    assert.throws(() => strictPhiOSParentOrigin(value, childOrigin));
  }
  assert.equal(strictPhiOSParentOrigin(origin, childOrigin), origin);
  assert.equal(strictPhiOSParentOrigin("https://phi-field.com", childOrigin), "https://phi-field.com");
});

test("bootstrap is source/origin bound, single-session, and only sends app.hello", () => {
  const x = client();
  assert.throws(() => x.requestProjectRef(), /not ready/);
  assert.equal(x.handle(event(host("host.bootstrap"), "https://rogue.test")), null);
  assert.equal(x.handle(event(host("host.bootstrap"), origin, {})), null);
  assert.equal(x.handle(event({ ...host("host.bootstrap"), app_id: "phioffice" })), null);
  assert.equal(x.handle(event({ ...host("host.bootstrap"), extraGrant: true })), null);
  const hello = x.handle(event(host("host.bootstrap")));
  assert.deepEqual(Object.keys(hello.message),
    ["protocol", "type", "app_id", "session_id", "request_id"]);
  assert.equal(hello.message.type, "app.hello");
  assert.equal(hello.message.app_id, "pixelforge");
  assert.equal(hello.message.session_id, session);
  assert.equal(x.handle(event(host("host.bootstrap"))), null);
  assert.equal(x.handle(event({ ...host("host.bootstrap"), session_id: globalThis.crypto.randomUUID() })), null);
});

test("ready, request, denial and context demand correlated session and request IDs", () => {
  const x = client();
  const hello = x.handle(event(host("host.bootstrap")));
  assert.equal(x.handle(event(host("host.ready", {
    request_id: "wrong", read_approved: true,
  }))), null);
  assert.equal(x.handle(event({ ...host("host.ready", {
    request_id: hello.message.request_id, read_approved: true,
  }), session_id: globalThis.crypto.randomUUID() })), null);
  assert.deepEqual(x.handle(event(host("host.ready", {
    request_id: hello.message.request_id, read_approved: false,
  }))), { kind: "ready", readApproved: false });
  const req = x.requestProjectRef();
  assert.equal(req.message.type, "app.context.request");
  assert.deepEqual(Object.keys(req.message),
    ["protocol", "type", "app_id", "session_id", "request_id"]);
  assert.throws(() => x.requestProjectRef(), /pending/);
  assert.equal(x.handle(event(host("host.context", {
    request_id: "not-the-request", project_ref: "project:secret",
  }))), null);
  assert.deepEqual(x.handle(event(host("host.denied", {
    request_id: req.message.request_id, reason: "operator_approval_required",
  }))), { kind: "denied" });
  const after = x.requestProjectRef();
  assert.deepEqual(x.handle(event(host("host.context", {
    request_id: after.message.request_id, project_ref: "project:valid-01",
  }))), { kind: "project-ref", projectRef: "project:valid-01" });
  assert.equal(x.handle(event(host("host.context", {
    request_id: after.message.request_id, project_ref: "project:stale",
  }))), null);
});

test("refuse additional content, world objects, forged authority or unreviewed project refs", () => {
  const x = client();helloAndReady(x);
  const req = x.requestProjectRef();
  for (const fake of [
    { asset: "private.glb" },
    { world: { objects: ["secret"] } },
    { execution_authority: true },
    { owner: "private-user@example.test" },
    { project_ref: "../../secrets" },
    { project_ref: "project:../home" },
    { project_ref: "project:too..many" },
    { project_ref: "project:x".repeat(70) },
    { app_id: "phioffice" },
  ]) {
    const m = host("host.context", { request_id: req.message.request_id,
      project_ref: "project:valid", ...fake });
    assert.equal(x.handle(event(m)), null);
  }
  assert.deepEqual(x.handle(event(host("host.context", {
    request_id: req.message.request_id, project_ref: "project:valid",
  }))), { kind: "project-ref", projectRef: "project:valid" });
});

test("disconnect clears pending handoff and never resumes a stale session", () => {
  const x = client();helloAndReady(x);
  const req = x.requestProjectRef();
  x.disconnect();
  assert.throws(() => x.requestProjectRef(), /not ready/);
  assert.equal(x.handle(event(host("host.context", {
    request_id: req.message.request_id, project_ref: "project:stale",
  }))), null);
  assert.equal(x.handle(event(host("host.ready", {
    request_id: req.message.request_id, read_approved: true,
  }))), null);
});

test("oversized and malformed packets do not gain access", () => {
  const x = client();const hello=x.handle(event(host("host.bootstrap")));
  const bad = host("host.ready", {
    request_id: hello.message.request_id, read_approved: true,
    note: "a".repeat(4000),
  });
  assert.equal(x.handle(event(bad)), null);
  assert.equal(x.handle(event([])), null);
  assert.equal(x.handle(event(null)), null);
  assert.equal(x.handle(event(host("host.ready", {
    request_id: hello.message.request_id, read_approved: "true",
  }))), null);
  assert.deepEqual(x.handle(event(host("host.ready", {
    request_id: hello.message.request_id, read_approved: false,
  }))), { kind: "ready", readApproved: false });
});
