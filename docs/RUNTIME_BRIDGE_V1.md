# PixelForge Runtime Bridge v1

PixelForge cartridges may use any internal engine they want. A runtime becomes
**agent-native / externally inhabitable** when it can expose this small bridge.

The bridge is deliberately not a combat API, scene graph, renderer, ECS, physics
layer, or Oak Street Rumble dependency.

```text
Controller / Tool / Studio
          |
          v
     Runtime Bridge v1
          |
          +-- registerController()
          +-- observe()
          +-- submit()
          +-- advance()
          +-- events()
          +-- snapshot()
          +-- recording()
          +-- authority()
          +-- hash()
          |
          v
      Cartridge runtime
```

## Descriptor

`describe()` returns JSON-safe metadata:

```js
{
  protocol: "pixelforge-runtime-bridge",
  version: 1,
  gameId: "my-cartridge",
  runtimeVersion: "my-runtime/1",
  deterministic: true,
  clockMode: "external"
}
```

Only `protocol`, `version`, `gameId`, and `runtimeVersion` are required.
Clock and replay metadata are additive. See `RUNTIME_SHARED_CORE_V1.md` for the
semantics proven by Oak Street Rumble and Φ: Night Circuit.

## Contract

### registerController(descriptor)

Registers an observation/action participant. Registration does **not** imply
authority. A cartridge may reject unsupported controller kinds or bindings.

### observe(controllerId, actorId?)

Returns a JSON-safe immutable observation. The observation is the cartridge's
public perception boundary, not a reference to mutable engine state.

### submit(controllerId, intent, tick?)

Queues one already-resolved intent for a runtime-defined bridge step. A return
value may acknowledge that the root was queued, but it must not imply game
acceptance before the runtime processes it. Identity, grammar, authority and
game-rule acceptance are reported by the subsequent action decision/event
stream.

### advance(roots?)

Processes one runtime-defined bridge step.

For externally-stepped deterministic runtimes such as Oak Street Rumble, this
may be one fixed simulation tick. For engine-clocked runtimes such as Φ: Night
Circuit, it may flush one queued controller batch while the host engine retains
ownership of physics/frame advancement.

A runtime should declare its clock semantics in `describe()` when known.

### events(since?)

Returns append-only semantic/runtime events from an index.

### snapshot()

Returns a JSON-safe runtime snapshot. A cartridge may mark the snapshot
restorable when it is sufficient for exact restore; Bridge v1 does not assume
that all snapshots are restorable.

### recording()

Returns the runtime recording/root history defined by the cartridge. Exact
replay is a runtime capability, not a universal Bridge v1 guarantee.

### authority()

Returns a JSON-safe view of current controller/actor capability ownership.

### hash()

Returns a stable runtime-defined state string. Deterministic runtimes may use it
for exact comparison; engine-clocked runtimes may define a narrower stable
projection.

## Non-goals

Bridge v1 does not standardize:

- combat actions,
- actor stats,
- world geometry,
- rendering,
- audio,
- physics,
- inventory schema,
- AI provider calls,
- networking transports,
- save-file storage,
- frame rate.

Those belong to cartridges or later optional profiles.

## Reference cartridge

`runtime/reference-counter.js` is intentionally boring. It proves the bridge
works for something that has no player HP, enemies, rooms, sprites, or combat.

That is important. PixelForge should host runtimes, not quietly become a single
game's engine.
