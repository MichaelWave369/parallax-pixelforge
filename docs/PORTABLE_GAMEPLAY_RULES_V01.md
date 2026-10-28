# PixelForge Portable Gameplay Rules v1: keyboard visibility

**Goal:** begin a genuinely portable, declarative gameplay contract instead of pretending model interchange equals gameplay integration.

## User workflow

1. In PixelForge VR Studio, select an existing scene object.
2. Under Gameplay Rules choose key **E**, **F** or **Space**, and choose **Hide** or **Show**.
3. **Export Gameplay Rule JSON** creates one standalone engine-neutral `pixelforge.gameplay.key-visibility.v1` document.
4. **Export GDevelop Interaction ZIP** converts the same rule to native GDevelop 5 `KeyReleased` condition and `Hide` or `Show` action in a standard event, preserving editable 3D cubes and source manifest.
5. Open `game.json` in the real GDevelop desktop editor, inspect events and try preview before treating behavior as working in the runtime.

## Contract

Schema: `pixelforge.gameplay.key-visibility.v1`.
Fixed trigger `on=keyReleased` with allowlisted keys `e`, `f`, `space`.
Fixed effects `show` or `hide`, target specified by canonical source `objectId`.
One-click UI authors one rule. Library validator supports at most 12 nonconflicting rules per sidecar for future tooling.
Source world identity is checked on translation. Missing target IDs, arbitrary scripts, unexpected keys, duplicate IDs, repeated key/target combinations and unknown effects are rejected.
The portable sidecar is **not embedded** in PixelForge's original `pixelforge.vr-world.v1` JSON; save and share it separately until there is an explicit world-schema evolution plan.

## Native GDevelop mapping (grounded in official examples)

`KeyReleased` condition with parameters `['', key]`.
`Hide` action with `['PF_Obj_###']`, or `Show` action with `['PF_Obj_###', '']`.
Generated only from bounded, validated declarations. No runtime JavaScript or dynamic script injection.
Reference: https://github.com/GDevelopApp/GDevelop-examples (examples/3d-sokoban, paint, take-screenshot).

## Qualifying statements

CI validates deterministic schema, exact event values, source immutability, correct object mappings, fail-closed invalid inputs and existing exporter regressions.
**GDevelop editor execution is NOT yet validated.** The resulting project still has no player controller, collision, physics, spatial interactions, quest state, navigation or headset qualification.
PlayCanvas, Godot, Bevy and other targets do not yet consume this behavior sidecar. Each needs a separate runtime-specific acceptance gate. The PlayCanvas viewer export and the GDevelop blank-scene export remain unchanged unless the operator explicitly uses this new interaction button.

Next step: qualify the GDevelop output in its desktop editor and add the exact same portable key visibility event to PlayCanvas and Godot adapters with proper object-ID runtime mapping.
