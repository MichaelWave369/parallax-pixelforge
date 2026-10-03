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
  deterministic: true
}
```

Only `protocol`, `version`, `gameId`, and `runtimeVersion` are required.

## Contract

### registerController(descriptor)

Registers an observation/action participant. Registration does **not** imply
authority. A cartridge may reject unsupported controller kinds or bindings.

### observe(controllerId, actorId?)

Returns a JSON-safe immutable observation. The observation is the cartridge's
public perception boundary, not a reference to mutable engine state.

### submit(controllerId, intent, tick?)

Submits one already-resolved intent. The runtime validates identity, action
grammar, authority and game rules. The return value should at minimum report
whether the intent was accepted and why.

### advance(roots?)

Advances one deterministic simulation step. Cartridges decide their own fixed
step duration. Any externally resolved roots supplied here are part of the
deterministic input history.

### events(since?)

Returns append-only semantic/runtime events from an index.

### snapshot()

Returns a complete JSON-safe checkpoint sufficient for exact restore when the
cartridge supports save/restore.

### recording()

Returns the deterministic replay/root history defined by the cartridge.

### authority()

Returns a JSON-safe view of current controller/actor capability ownership.

### hash()

Returns a stable string representing the runtime state used for deterministic
comparison.

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
