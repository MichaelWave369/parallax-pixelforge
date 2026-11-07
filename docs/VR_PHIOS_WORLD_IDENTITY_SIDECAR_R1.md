# PixelForge VR Studio → PhiOS project identity sidecar R1

**Status:** Producer candidate, not installed, not catalog-admitted, not an approved PhiOS project adapter.

PhiOS's existing reviewed PhiOffice integration now has a provider-qualified browser-local V2 metadata format. PixelForge VR Studio is a useful potential **second source** because it already has a real portable world format, `pixelforge.vr-world.v1`, exported from **World File → Export JSON** and checked by `vr-studio/world.js`. But its world format contains a *title*, editable scene objects and runtime capability limits, **not a stable project identifier**. Titles, object IDs and editable world hashes must not become implicit cross-app identities.

## New producer behavior

Inside PixelForge **VR Studio → World File**, the operator can enter a deliberately chosen stable project ID and click **Export PhiOS identity-only JSON**. The browser requests a download named `pixelforge-phios-project-identity.v0.1.json`. The producer constructs the header directly from the active, validated VR world and the explicitly entered ID. It never reads an arbitrary external manifest or exports world objects.

Example, with a manually entered `my-vr-world-01`:

```json
{
  "schema": "pixelforge.phios-vr-world-identity.v0.1",
  "projectId": "my-vr-world-01",
  "title": "Untitled VR World",
  "worldFormat": "pixelforge.vr-world.v1"
}
```

The strict sidecar reader accepts only those four fields and that exact schema/world format. Project IDs are bounded to **1–64 ASCII** letters/digits/dot/dash/underscore, start with a letter or digit, and reject path syntax, repeated dots and trailing dots. Titles are bounded and reject controls/bidirectional override characters. The JSON is capped at 4 KiB.

The *candidate identity projection*, for a future independently reviewed PhiOS parser, would be `project:my-vr-world-01` with provider `pixelforge`. This is **not** a currently admitted PhiOS adapter. The sidecar has no permissions or authenticity signature and a user could choose the same ID for two different worlds. The user must reuse the chosen ID for future edits of the same world and use a distinct one for a different world. This R1 sidecar is not automatically persisted in scene JSON or bound to a world-file hash.

The separate `Export JSON` still exports the actual scene, and Unreal/Fab GLB import is unchanged. **No private Unreal assets, GLB bytes, hashes, source paths, scene geometry, credentials, licensing claims, or executor rights** are transferred through this identity header. Export does not install apps, grant project read access or attest ownership. Verify that the requested browser download actually landed before relying on the sidecar.

## Acceptance

```sh
npm run test:vr
```

The new offline test suite checks the existing validated VR world, explicit stable ID across scene revisions, distinct IDs for same titles, strict schema, malformed/oversized payloads, unreviewed versions, control characters, and zero private asset fields. Existing VR Studio tests and engine-export checks remain in the same suite.

**Next, separately reviewed integration gate:** After this producer has passed CI and been inspected in a real browser, add a **named independent parser** inside PhiOS, bind source schema `pixelforge.phios-vr-world-identity.v0.1` to `providerAppId=pixelforge`, validate V2 tuples against the existing PhiOffice source, and test two identical text project IDs from different providers in a disposable browser. A distinct cross-origin PixelForge origin, explicit PhiOS operator consent, field allowlists, rebind/revoke and fresh-session behavior must pass before any active second-provider admission. A self-asserted JSON file cannot authorize an external app.

This is a path toward a CREATIVE_PIPELINE application inside PhiOS, **not** evidence that PixelForge can be natively installed on Windows, macOS, Linux, Quest, or the PhiOS x86_64 image.
