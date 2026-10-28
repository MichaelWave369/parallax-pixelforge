# PixelForge Godot 4 local GLB project package v2

**Scope:** private, one-way, operator-approved static scene export. This is not a validated Godot runtime, an asset rights grant, or a gameplay export.

## Workflow

1. Open PixelForge VR Studio. Import a local, rights-cleared GLB through the existing governed ASSET-ID import path. Importing an existing JSON world requires the operator to rebind each matching GLB from their own computer.
2. Use **World File → Export Godot project ZIP**. When asset-proxy objects exist, the browser asks for explicit confirmation before packaging private bytes. If any exact SHA-256 file was not selected this session, export fails rather than substituting an unrelated file.
3. Extract the ZIP into a NEW folder. Open project.godot with Godot 4.x, wait for its GLB importer to complete, then open scene.tscn in the 3D editor. Verify transform, visibility, materials and source identity.
4. Keep the original PixelForge JSON as canonical. Do not publish the ZIP with purchased assets unless the actual license permits redistribution.

## What is inside

- project.godot: minimal Godot project file, not runnable gameplay.
- scene.tscn: independent primitive BoxMesh nodes plus Godot PackedScene references to assets/<sha256>.glb. Source object IDs, names, and Y-axis transforms remain in metadata.
- assets/<sha256>.glb: actual source GLB bytes explicitly selected or rebound by the user in that browser session. Deduplicated and bounded.
- manifest.json: file hashes, byte sizes, source version and explicit unverified status.

All packaging happens locally in browser memory with no uploads. Exact bytes, SHA-256 digest, size and GLB structure are rechecked at export. The ZIP is a deterministic, uncompressed STORE archive. Filenames are generated from fixed names or hexadecimal hashes, preventing traversal. The operator must explicitly approve packaging private asset bytes.

## Limits and review requirements

- Max 8 distinct GLBs, and an 80 MB upper bound on total retained private source data. Large assets can still preview but may not be retained for packaging.
- The .tscn-only export remains unchanged by default and still refuses silently substituting GLB proxies.
- No collision, physics, navigation, quests, NPCs, agent authority, WebXR headset guarantees, packaged executables, automatic release or rights attestation.
- Godot native editor import, model material appearance and real Quest performance remain **NOT TESTED** until actual manual validation.
- Unreal, Unity and Bevy scene adapters remain planned; existing Unreal-to-PixelForge GLB export is a separate pipeline.

## Automated checks

Run npm run test:engine-exports or the normal full npm test preflight. Synthetic embedded binary GLB fixtures validate byte-for-byte archive integrity, deterministic output, two objects using one GLB, hash mismatch refusal, missing file refusal, and ZIP path traversal/duplicate rejection.

Do not claim successful Godot import merely because the ZIP passed PixelForge CI.
