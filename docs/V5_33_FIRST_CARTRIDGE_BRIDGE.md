# PixelForge v5.33 — First Real Cartridge Bridge

v5.32 proved that Runtime Bridge v1 could cross a local JSONL process boundary.
v5.33 proves that the same seam can carry a real PixelForge game artifact instead
of only the deterministic reference counter.

The first bridged cartridge is:

~~~text
The Legend of More Bounce
scene: Bouncehome Grove
source packet: games/the-legend-of-more-bounce/runtime/bouncehome-grove.runtime-scene.v5.11.json
~~~

## Why Bouncehome Grove

The scene packet already belongs to a real PixelForge cartridge and already
contains map dimensions, a collision layer, a player spawn, camera/runtime
metadata, a future scene transition, and PixelForge runtime-scene provenance.

This rung does not invent a fake demo map merely to make an adapter pass.

## Bridge behavior

The first cartridge bridge loads the actual v5.11 Bouncehome Grove scene packet
and exposes a deliberately small runtime grammar:

~~~text
MOVE UP
MOVE DOWN
MOVE LEFT
MOVE RIGHT
~~~

The bridge uses the scene packet's real collision layer.

Successful movement emits PLAYER_MOVED.
Blocked movement emits MOVE_BLOCKED.
Wrong-tick or malformed actions emit ACTION_REJECTED.

This is enough to prove that a governed external host can affect an actual
PixelForge cartridge state through Runtime Bridge v1 without bypassing the
cartridge's own rules.

## Run it

~~~bash
npm run runtime:serve:cartridge -- --cartridge the-legend-of-more-bounce
~~~

The server uses the same v5.32 JSONL transport. No new transport protocol is
introduced.

## What this proves

- a real PixelForge cartridge artifact can inhabit Runtime Bridge v1;
- the cartridge's actual scene/collision data controls runtime outcomes;
- an external host can observe, submit, advance, read semantic events, snapshot,
  record, inspect authority and read the runtime hash;
- the reference transport did not need to change.

## What this does not prove

It does not yet prove complete React-cartridge remote rendering, framebuffer or
audio streaming, save-slot semantics, every Legend chapter/mode, exact replay,
network play, SPARK integration, or Unreal integration.

## Next consumer

PhiCade can now replace its v5.32 reference-counter qualification with a pinned
v5.33 real-cartridge qualification.

After that cross-repository proof passes, SPARK is the next intended large
consumer.
