extends SceneTree
# Real Godot 4.7.2 headless runtime acceptance for generated PixelForge projects.
# This test is inserted into temporary fixture directories, never a user's project.

func _initialize() -> void:
    call_deferred("_run_checks")

func _fail(message: String) -> void:
    printerr("PIXELFORGE_GODOT_NATIVE_FAILURE: " + message)
    quit(1)

func _send_key(root: Node, key: Key, is_pressed: bool, with_ctrl: bool = false) -> void:
    var event: InputEventKey = InputEventKey.new()
    event.keycode = key
    event.pressed = is_pressed
    event.echo = false
    event.ctrl_pressed = with_ctrl
    root.call("_unhandled_key_input", event)

func _run_checks() -> void:
    var json_text: String = FileAccess.get_file_as_string("res://gameplay.json")
    var payload: Variant = JSON.parse_string(json_text)
    if not payload is Dictionary:
        _fail("gameplay.json is not a dictionary")
        return
    var rules: Variant = payload.get("rules", [])
    if not rules is Array or rules.size() != 1:
        _fail("Expected exactly one compiled gameplay rule")
        return
    var rule: Dictionary = rules[0]
    var keys: Dictionary = {"e": KEY_E, "f": KEY_F, "space": KEY_SPACE}
    var name: String = str(rule.get("nodeName", ""))
    var keyname: String = str(rule.get("key", ""))
    if not keys.has(keyname):
        _fail("Unexpected key in compiled blueprint")
        return

    var packed: PackedScene = load("res://scene.tscn") as PackedScene
    if packed == null:
        _fail("Godot cannot load the generated scene")
        return
    var root: Node = packed.instantiate()
    if root == null:
        _fail("Godot cannot instantiate the generated scene")
        return
    get_root().add_child(root)
    await process_frame

    var target: Node3D = root.get_node_or_null(NodePath(name)) as Node3D
    if target == null or not root.has_method("_unhandled_key_input"):
        _fail("Missing target or generated GDScript method")
        return

    var expected: bool = bool(rule.get("visible", false))
    target.visible = not expected

    # A pressed key must not activate the visibility rule.
    _send_key(root, keys[keyname], true)
    if target.visible == expected:
        _fail("Key press activated a release-only rule")
        return

    # An unrelated key release must not activate.
    var other: Key = KEY_F if keys[keyname] != KEY_F else KEY_E
    _send_key(root, other, false)
    if target.visible == expected:
        _fail("Unrelated key activated the rule")
        return

    # Ctrl-modified release must not activate.
    _send_key(root, keys[keyname], false, true)
    if target.visible == expected:
        _fail("Modifier was not ignored")
        return

    # The intended release must toggle the target to the requested state.
    _send_key(root, keys[keyname], false)
    if target.visible != expected:
        _fail("Required key release did not change target visibility")
        return

    var mode: String = "show" if expected else "hide"
    print("PIXELFORGE_GODOT_NATIVE_PASS:" + mode + ":" + keyname)
    quit(0)
