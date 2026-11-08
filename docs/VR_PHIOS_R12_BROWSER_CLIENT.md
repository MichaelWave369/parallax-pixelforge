# PixelForge VR → PhiOS R12 client · exact-origin, no-world-data handshake

**Scope:** experimental browser-only client implementation. Not a native PixelForge installation, automated launch, publisher authentication, signed deployment, project ownership check, access to VR-world bytes or approval to act on project data.

The R11 PixelForge `pixelforge.phios-vr-world-identity.v0.1` sidecar exporter and PhiOS's V2 metadata import are already merged. R12 adds the *client* half of the existing `phios.workspace-bridge.v1` protocol to the real PixelForge VR Studio UI.

## Standalone-first behavior

A regular visit to PixelForge VR Studio has **no bridge event listener**, no iframe-specific UI, no automatic project selection and no outgoing messages. R12's bridge panel is hidden until all these conditions are true:

1. The studio is in a separate-origin iframe (`window.parent !== window`).
2. Its URL contains **only** the exact `phios_parent_origin` parameter, with an exact HTTPS origin (or explicit local-loopback HTTP origin) different from the PixelForge origin.
3. The actual browser `document.referrer` matches that expected parent's origin.
4. A host message arrives from **that** origin and **the actual `window.parent` WindowProxy** with exact versioned packet fields, `app_id: pixelforge`, a bounded session UUID, and `execution_authority: false`.

A missing referrer is **not** treated as trust; the bridge stays off. Browser referrers are a configuration consistency check, not proof of publisher identity or cryptographic authentication. No new external app or site is automatically trusted by PhiOS.

## Protocol

The host sends `host.bootstrap` with its session identity. PixelForge replies `app.hello` with a fresh request ID. The host's correlated `host.ready` enables a visible **Request project reference** button; no project request is sent automatically. Every request must correlate its session and request ID to an exact host response:

- `host.denied`: clear any displayed reference and report that the PhiOS operator must approve.
- `host.context`: display **only** an opaque `project:...` reference string as inert text, never look up or open a scene.
- **Disconnect from PhiOS**: stop the listener, clear the displayed reference, and disable future requests until a new iframe instance is created.

The PixelForge bridge code never calls the VR world store, asset shelf, GLB import, engine export, localStorage, files, or a private catalog. No direct code path exists from a received reference to world mutation or ownership assertion. Revocation cannot erase information a previously approved app already received; the reference is **never** treated as a credential.

The parent must separately register and configure the exact PixelForge URL, origin, frame source and operator-approval path. This PR does **not** modify PhiOS or approve that connection.

## Acceptance

```sh
npm run test:vr
node --test tests/vr-phios-bridge.test.js
```

The 7 tests cover standalone disabling, referrer/origin agreement, wrong-source packets, app impersonation, duplicate bootstraps, correlated handshake, default-deny, forged rights, untrusted paths/content, stale replies and disconnected sessions. Existing PixelForge rendered-export test still verifies its sidecar UI. Full two-origin Chrome qualification is a **separate PhiOS host PR**, not evidence established by client-unit checks.

No production endpoints, social identity integrations, source-signature claims, runtime installation, grants or native file privileges are included.
