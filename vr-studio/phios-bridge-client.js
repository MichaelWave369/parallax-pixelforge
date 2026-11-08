/**
 * R12: opt-in, zero-authority PixelForge client for PhiOS workspace bridge v1.
 * Standalone PixelForge never enables this client. It cannot read local worlds,
 * export GLBs, grant capabilities or select a project automatically.
 *
 * parentOrigin must come from an independently checked page configuration,
 * never from an arbitrary incoming postMessage packet.
 */
export const PIXELFORGE_BRIDGE_PROTOCOL = "phios.workspace-bridge.v1";
export const PIXELFORGE_BRIDGE_MAX_BYTES = 2048;
const SESSION = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUEST = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const REF = /^project:[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const APP = "pixelforge";
const object = x => x !== null && typeof x === "object" && !Array.isArray(x);
const exact = (value, keys) => Object.keys(value).length === keys.length
  && Object.keys(value).every(key => keys.includes(key));

export function strictPhiOSParentOrigin(raw, childOrigin = null) {
  if (typeof raw !== "string" || !raw || raw.length > 300) {
    throw Error("Expected exact parent origin");
  }
  let url;
  try { url = new URL(raw); } catch { throw Error("Invalid parent origin"); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.origin !== raw || url.username || url.password ||
      !(url.protocol === "https:" || (url.protocol === "http:" && loopback)) ||
      (childOrigin !== null && raw === childOrigin)) {
    throw Error("Invalid or same-origin PhiOS parent origin");
  }
  return raw;
}

function validHostPacket(data) {
  if (!object(data) || data.protocol !== PIXELFORGE_BRIDGE_PROTOCOL ||
      data.app_id !== APP || data.execution_authority !== false ||
      typeof data.session_id !== "string" || !SESSION.test(data.session_id)) return false;
  const keys = ["protocol", "type", "app_id", "session_id", "execution_authority"];
  if (data.type === "host.ready") {
    keys.push("request_id", "read_approved");
    if (typeof data.read_approved !== "boolean") return false;
  } else if (data.type === "host.denied") {
    keys.push("request_id", "reason");
    if (data.reason !== "operator_approval_required") return false;
  } else if (data.type === "host.context") {
    keys.push("request_id", "project_ref");
    if (typeof data.project_ref !== "string" || !REF.test(data.project_ref) ||
        data.project_ref.includes("..") || data.project_ref.endsWith(".")) return false;
  } else if (data.type !== "host.bootstrap") return false;
  if (data.type !== "host.bootstrap" &&
      (typeof data.request_id !== "string" || !REQUEST.test(data.request_id))) return false;
  if (!exact(data, keys)) return false;
  try { return new TextEncoder().encode(JSON.stringify(data)).byteLength <= PIXELFORGE_BRIDGE_MAX_BYTES; }
  catch { return false; }
}

export function createPixelForgePhiOSBridgeClient({ parentOrigin, parentSource, childOrigin = null }) {
  if (!object(parentSource)) throw Error("Expected bound PhiOS parent frame");
  const targetOrigin = strictPhiOSParentOrigin(parentOrigin, childOrigin);
  let session = null, hello = null, pending = null, ready = false;
  const packet = (type, requestId) => ({
    protocol: PIXELFORGE_BRIDGE_PROTOCOL,
    type, app_id: APP, session_id: session, request_id: requestId,
  });
  return Object.freeze({
    handle(event) {
      if (!event || event.origin !== targetOrigin || event.source !== parentSource ||
          !validHostPacket(event.data)) return null;
      const msg = event.data;
      if (msg.type === "host.bootstrap") {
        if (session !== null) return null; // no implicit session switch
        session = msg.session_id;
        hello = globalThis.crypto.randomUUID();
        return Object.freeze({ kind: "outbound", targetOrigin,
          message: packet("app.hello", hello) });
      }
      if (msg.session_id !== session) return null;
      if (msg.type === "host.ready") {
        if (!hello || msg.request_id !== hello) return null;
        hello = null;
        ready = true;
        return Object.freeze({ kind: "ready", readApproved: msg.read_approved });
      }
      if (!ready || !pending || msg.request_id !== pending) return null;
      pending = null;
      if (msg.type === "host.denied") return Object.freeze({ kind: "denied" });
      if (msg.type === "host.context") {
        return Object.freeze({ kind: "project-ref", projectRef: msg.project_ref });
      }
      return null;
    },
    requestProjectRef() {
      if (!ready || !session || pending) {
        throw Error("PhiOS session not ready or request already pending");
      }
      pending = globalThis.crypto.randomUUID();
      return Object.freeze({ targetOrigin,
        message: packet("app.context.request", pending) });
    },
    disconnect() {
      session = null;
      hello = null;
      pending = null;
      ready = false;
    },
  });
}

/**
 * Embedded UI requires BOTH an explicit ?phios_parent_origin= query option
 * and a referrer from that exact parent origin. If browsers omit referrers,
 * the bridge remains disabled, rather than trusting a self-asserted value.
 * These values only guide communication. They do not authenticate a publisher.
 */
export function readPixelForgePhiOSEmbedConfig({ url, referrer, childOrigin, embedded }) {
  if (embedded !== true) return null;
  let page, parent;
  try {
    page = new URL(url);
    parent = page.searchParams.get("phios_parent_origin");
    if (page.searchParams.size !== 1 || !parent) return null;
    const expected = strictPhiOSParentOrigin(parent, childOrigin);
    const from = new URL(referrer);
    if (from.origin !== expected) return null;
    return Object.freeze({ parentOrigin: expected });
  } catch { return null; }
}
