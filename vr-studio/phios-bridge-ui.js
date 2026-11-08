import {
  createPixelForgePhiOSBridgeClient,
  readPixelForgePhiOSEmbedConfig,
} from "./phios-bridge-client.js";

/**
 * Mounts only for a separately configured, distinct-origin PhiOS iframe.
 * The received project_ref is displayed as inert text, never looked up in
 * localStorage or used to mutate/open/export any PixelForge world or GLB.
 */
export function mountPixelForgePhiOSBridgeUI(win = globalThis, doc = document) {
  const panel = doc.getElementById("phiosBridgePanel");
  if (!panel) return false;
  const config = readPixelForgePhiOSEmbedConfig({
    url: win.location.href,
    referrer: doc.referrer,
    childOrigin: win.location.origin,
    embedded: win.parent !== win,
  });
  if (!config) return false;
  const status = doc.getElementById("phiosBridgeStatus");
  const received = doc.getElementById("phiosBridgeReceived");
  const request = doc.getElementById("phiosBridgeRequest");
  const disconnect = doc.getElementById("phiosBridgeDisconnect");
  if (!status || !received || !request || !disconnect) return false;
  let client;
  try {
    client = createPixelForgePhiOSBridgeClient({
      parentOrigin: config.parentOrigin,
      parentSource: win.parent,
      childOrigin: win.location.origin,
    });
  } catch { return false; }

  panel.hidden = false;
  request.disabled = true;
  let active = true;
  const handle = (event) => {
    if (!active) return;
    const response = client.handle(event);
    if (!response) return;
    if (response.kind === "outbound") {
      win.parent.postMessage(response.message, response.targetOrigin);
      status.textContent = "Φ PhiOS handshake received; checking the session";
    } else if (response.kind === "ready") {
      request.disabled = false;
      status.textContent = response.readApproved
        ? "Connected; request a project label only with your click"
        : "Connected; no project reference approved yet";
    } else if (response.kind === "denied") {
      received.textContent = "";
      status.textContent = "Project request denied; operator approval required in PhiOS";
    } else if (response.kind === "project-ref") {
      received.textContent = "Received project ID: " + response.projectRef
        + " (not world-file access)";
      status.textContent = "Received opaque project identity, no world content or rights";
    }
  };
  win.addEventListener("message", handle);
  request.addEventListener("click", () => {
    if (!active) return;
    try {
      const outbound = client.requestProjectRef();
      win.parent.postMessage(outbound.message, outbound.targetOrigin);
      status.textContent = "Request sent; awaiting PhiOS operator decision";
    } catch {
      status.textContent = "Request not possible: session not ready or another request pending";
    }
  });
  disconnect.addEventListener("click", () => {
    if (!active) return;
    active = false;
    client.disconnect();
    win.removeEventListener("message", handle);
    request.disabled = true;
    disconnect.disabled = true;
    received.textContent = "";
    status.textContent = "Locally disconnected; close the PhiOS frame to end the host session";
  });
  return true;
}
