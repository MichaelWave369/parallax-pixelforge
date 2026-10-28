# PixelForge: Godot 4 portable gameplay adapter v1

**Status:** a complete Godot 4 source-project ZIP with Godot text scene and bounded GDScript has been generated and structurally tested. The actual Godot editor import and keyboard runtime remain **UNVERIFIED**.

## User steps

1. Open PixelForge VR Studio and select one object. Under GAMEPLAY RULES choose E/F/Space and Show or Hide.
2. Click **Export Godot Interaction ZIP**. This is a separate opt-in output; Godot static scene and private GLB asset ZIP exports remain unchanged.
3. If the source contains imported private GLB objects, approve **placeholder cuboids** explicitly. No original purchased asset bytes, textures or GLBs are included.
4. Extract the ZIP to a new local directory. Open `project.godot` in **Godot 4.x**, inspect `scene.tscn`, and run the main scene to test release of the selected key.
5. Inspect the script and entity behavior. Godot editor/import/runtime acceptance is an independent manual gate, not something CI has proven.

## ZIP files

- `project.godot`: minimal standalone project that sets `run/main_scene` to the actual preview scene.
- `scene.tscn`: validated standard PixelForge cuboid scene, with one extra script ExtResource, a fixed Camera3D, and a DirectionalLight3D.
- `scripts/visibility_rules.gd`: generated, standalone GDScript with a fixed allowlisted `_unhandled_key_input()` listener and visibility toggles.
- `gameplay.json`: compiled engine-specific rule payload derived from the **same** source `pixelforge.gameplay.key-visibility.v1` blueprint translated by GDevelop and PlayCanvas.
- `manifest.json`: source object IDs, Godot node names, placeholder flags, explicit status and limitations.
- `README.md`: inspection and manual acceptance workflow.

## Technical contract and security

- Input triggers: native Godot 4 `InputEventKey`, `not pressed`, `not echo`; keys KEY_E, KEY_F, KEY_SPACE only.
- Mapping: existing Godot exporter writes nodes `Obj_1`, `Obj_2` and so on; the behavior translator derives matching node paths by canonical source object ID, never human display name.
- Actions: `Node3D.visible = true/false`. Node discovery runs before activation; if a required target is missing, no action executes.
- No arbitrary JavaScript or GDScript supplied in the blueprint. The only script is **fixed, generator-authored** source with validated constants, node IDs and boolean effects.
- External Godot model references are not exported here. The old hash-verified private GLB Godot pack remains separately available and intentionally has no gameplay script.
- The PixelForge source JSON is not modified or given new runtime permissions.

## Testing and acceptance

`npm run test:engine-exports` includes `tests/godot-gameplay-project.test.js`. It checks deterministic archive content; generated native GDScript and resource linking; camera/light and node counts; three-engine blueprint compilation agreement; script injection refusal; fail-closed asset proxy behavior; and preservation of old static exports.

**Not tested in CI:** running Godot binary, parsing in the actual editor, visual quality, camera framing, keyboard delivery on a real OS or Quest 3/OpenXR compatibility.

## Next rung

Open all three projects in their target editors and record actual runtime acceptance. After that, extend the neutral gameplay spec with spatial triggers and movement, keeping generated scripts constrained and per-engine tested.

Official Godot docs:
- https://docs.godotengine.org/en/stable/classes/class_inputeventkey.html
- https://docs.godotengine.org/en/stable/classes/class_node3d.html
