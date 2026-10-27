# ΦPACK v0.1 | PixelForge Universal Content Packaging

**Status:** first working package format and importer, not a universal engine or a multi-game compatibility guarantee.

ΦPACK is a portable, versioned **data-only ZIP subset** for reusable game content. The first supported adapter wraps PixelForge's existing v5.11 Runtime Composer scenes without changing game rules. The eventual ΦWAD (raycasting), ΦCART (arcade), ΦWORLD (3D), and ΦXR (XR) profiles are proposed follow-ons, **not implemented yet**.

## Browser workshop

Open [ΦPACK Workshop](../phipack/index.html) from a local HTTP server or the repository's GitHub Pages deployment. Choose an existing PixelForge v5.11 Runtime Scene JSON, click Export, and download its .phipack. Import a .phipack to view its manifest and scene summary. Everything happens locally in the browser.

## Node commands

From the repository root, using Node 24:

~~~sh
npm run phipack:build -- games/the-legend-of-more-bounce/runtime/bouncehome-grove.runtime-scene.v5.11.json bouncehome.phipack
npm run phipack:inspect -- bouncehome.phipack
npm run phipack:validate -- bouncehome.phipack
npm run test:phipack
~~~

Build never overwrites an existing file. The example contains the existing scene JSON, not new artwork or a new playable engine. Exports default to private (redistributionAllowed = false). Rights metadata is creator-supplied, **not** a license clearance mechanism.

## v0.1 on-disk contract

A .phipack is a deterministic ZIP container with uncompressed STORE entries and UTF-8 paths.

~~~text
bouncehome.phipack
  manifest.json
  scenes/main.runtime-scene.json
~~~

The manifest includes format, formatVersion = 0.1.0, kind = scene, id, title, profile, entry, assets (path, MIME type, size and CRC32), plus rights (license and redistributionAllowed).

The browser-compatible API lives in phipack/core.js:
- makeRuntimeScenePack(scene, options): produce a complete Uint8Array package.
- decodePack(bytes): read and verify manifest and file entries without extracting to disk.
- loadRuntimeScenePack(bytes): validate and return existing v5.11 scene data.
- validateManifest(manifest): validate the contract.

Games can integrate via an adapter that takes the package's validated scene and translates **supported** features into their internal runtime. There is no implicit assumption that 2D tiles, Doom walls, 3D geometry, and XR spaces mean the same thing.

## Trust boundary

- All paths must be relative, canonical, and unique. Path traversal, hidden extra files, malformed or compressed ZIP entries, encrypted entries, ZIP comments, and multi-disk archives fail validation.
- Limits: 16 MiB per archive, 8 MiB per file, 128 ZIP entries. CRC32 guards against incidental corruption, **not tampering by a determined adversary**. A future version should use cryptographic hashes/signatures and explicit trust decisions for externally obtained content.
- No executable scripts, plugins, external references or arbitrary network fetches are installed or run. Host games retain rendering, simulation, physics, and controller authority.
- Engines must still impose runtime-specific limits on object counts, images, audio, maps, collisions, and complexity before use.
- Never bundle commercially licensed or restricted Unreal/Fab or other third-party content without permission. An author setting redistributionAllowed to true is not proof of authorization.
- The v0.1 browser workshop is deliberately separate from PixelForge's existing Studio editor so existing projects remain unchanged. Direct Studio integration is the next milestone.

## Next milestones

1. Add Export/Import ΦPACK to PixelForgeStudio's Runtime Composer toolbar with project-local warnings and previews.
2. Build and test the Michael Wave & Ori raycasting/ΦWAD adapter against the actual game source, including collision conversion, entities, enemies and difficulty metadata.
3. Add explicit capability negotiation and rejection receipts for other engine adapters via existing Runtime Bridge contracts.
4. Support reusable art/audio packages, multiple scenes, stronger integrity checks and community sharing controls.
5. Integrate BackyardProductionCompany, Domistika, PhiCade, NightCircuit and PhiOS XR through separately qualified adapters.

**Guiding rule:** author content once, reuse it only where a game's adapter explicitly supports it.
