# Real Godot 4.7.2 Native Engine Acceptance

## Purpose

Prior PixelForge Godot interaction PRs tested ZIP structures, .tscn text, and generated GDScript but did not load them in the actual engine. This rung adds an isolated GitHub Actions job that uses the **official Godot 4.7.2 Linux binary** to import a generated Godot project and run a real headless GDScript behavior test.

## How it works

1. Generate three original-content-only PixelForge worlds with the actual `exportGodotVisibilityProject()` API. Use `hide E`, `show Space`, and `hide F` cases. The worlds use built-in cuboids, never third-party GLBs.
2. Write deterministic ZIPs and extract each in the ephemeral GitHub runner, then copy a separate test-only GDScript SceneTree to each fixture.
3. Download the **official** Godot 4.7.2 Linux x86_64 editor ZIP from godotengine/godot-builds, using its published SHA-256 checksum. Do not commit engine binaries, execute unverified downloads, or trust latest-version redirects.
4. Import each generated project using `godot --headless --path <fixture> --import`. Fail on process errors and documented parser messages.
5. Run `godot --headless --path <fixture> --script res://visibility-smoke.gd` to instantiate the real generated scene, resolve target objects, reject pressed/modified/unrelated key events, and confirm key-release changes visibility. Require an explicit PASS marker in addition to exit zero.

## Scope and status

This tests **Godot 4.7.2 Linux headless parsing and behavior**, not its graphical editor UI, Windows build, Android/Quest output, native VR controllers, performance, or third-party asset import.
The workflow is a dedicated check and does not download Godot when running the ordinary `npm test` or building the web app. It runs for relevant PRs, pushes to main changing the Godot pipeline, or manual dispatch.
Upstream references:
- https://github.com/godotengine/godot-builds/releases/tag/4.7.2-stable
- https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html

## Test evidence

Review the job's output for `PIXELFORGE_GODOT_NATIVE_PASS:<mode>:<key>` for each scenario, as well as zero parser errors. **Do not claim native compatibility until this GitHub job passes.**
