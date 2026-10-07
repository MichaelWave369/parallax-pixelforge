# PixelForge Runtime Bridge JSONL Transport v1

## Purpose

Runtime Bridge v1 is intentionally engine- and transport-neutral. v5.32 adds a
small reference transport so another local process can inhabit a PixelForge
runtime without importing PixelForge internals or inventing a privileged control
path.

The first intended external consumer is **PhiCade**.

```text
PhiCade / another host
        |
        | newline-delimited JSON
        v
Runtime JSONL Transport v1
        |
        v
PixelForge Runtime Bridge v1
        |
        v
cartridge runtime
```

This is a transport adapter, not a new authority layer.

## Wire schemas

Request:

```text
pixelforge.runtime-transport.request.v1
```

Response:

```text
pixelforge.runtime-transport.response.v1
```

A request contains:

```json
{
  "schema": "pixelforge.runtime-transport.request.v1",
  "id": "request-1",
  "method": "observe",
  "params": ["controller-1"]
}
```

A response contains either a result:

```json
{
  "schema": "pixelforge.runtime-transport.response.v1",
  "id": "request-1",
  "ok": true,
  "result": {}
}
```

or a bounded error:

```json
{
  "schema": "pixelforge.runtime-transport.response.v1",
  "id": "request-1",
  "ok": false,
  "error": {
    "code": "BRIDGE_ERROR",
    "message": "controller is not registered"
  }
}
```

## Exposed methods

Only the existing Runtime Bridge v1 method set is callable:

- `describe`
- `registerController`
- `observe`
- `submit`
- `advance`
- `events`
- `snapshot`
- `recording`
- `authority`
- `hash`

Unknown methods fail closed.

There is no remote `eval`, filesystem access, shell command, model-provider
handle, or privileged `shutdown` method. EOF owns the reference process
lifecycle.

## Ordering

The server processes requests strictly in input order.

That matters because transport must not quietly change the sequencing semantics
of an in-process Runtime Bridge. If a future transport supports concurrency, it
must define that behavior separately instead of changing v1.

## Reference process

Run the deterministic reference counter over stdio:

```bash
npm run runtime:serve:reference
```

Optional seed:

```bash
npm run runtime:serve:reference -- --seed 10
```

Protocol messages are written to stdout. Diagnostics go to stderr so a host can
treat stdout as a clean JSONL channel.

## Authority boundary

The transport does **not** turn registration into authority.

A host may register a controller and submit an intent, but the cartridge runtime
still decides whether that intent is accepted. Runtime events carry the outcome.

Likewise this rung does not claim that a transported runtime has:

- exact replay,
- restorable snapshots,
- deterministic timing,
- rendered framebuffer output,
- audio output,
- external-process qualification,
- commercial readiness.

Those remain runtime-specific capabilities and evidence claims.

## PhiCade handoff

The intended next proof is a PhiCade `BRIDGED_RUNTIME` adapter that:

1. launches or connects to the reference JSONL process;
2. calls `describe`;
3. registers a governed PhiCade controller;
4. maps an authorized PhiCade action into a PixelForge intent;
5. advances the PixelForge bridge;
6. consumes semantic events;
7. records the runtime hash and transport evidence.

The first proof should use the boring deterministic counter. A real cartridge
such as SPARK should only be connected after the seam itself is qualified.
