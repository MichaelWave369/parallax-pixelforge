# PixelForge v6 · Rung 13: Offline Adventure Publishing

Rung 13 adds a one-click, standalone **single HTML file** export for the 3D World Player. The released file embeds validated playable-world JSON, bundled React, Three.js and Rapier runtime code, and CSS. It can run in a WebGL2 + WebAssembly-capable browser without a PixelForge server, CDN or installed Forge editor.

## Creator workflow

1. Open the Creator Forge (?forge=1), load or build a VR Studio scene and its physics sidecar. Optionally author pickups, switches, secrets, doors and a Finish marker.
2. In Physics, Game Logic or Build & Export, click **Publish Offline Adventure (.html)**. The same operation is available in the World Player (?play=1) for any validated imported playable world.
3. The website supplies its own prebuilt trusted player template, which is filled with an inert JSON description of the chosen world. This is a same-origin download during *publishing only*.
4. The browser downloads a sanitized-title file such as the-living-world-starter-course-offline.html. Transfer it to other people or devices; recipients can double-click the file and play offline.
5. Confirm playback and optional browser-local saves on target devices before sharing widely. Local file origin behavior differs between browsers.

The published release contains only the World Player, not the Forge authoring tools or private GLB asset vault. There is no package manager, server requirement, third-party CDN, new application account, arbitrary scripts, external JSON source or privileged bridge.

## Build architecture

A second Vite configuration (site/vite.publisher.config.js) bundles site/src/published-main.jsx with all runtime imports into **one ESM JavaScript chunk and one CSS file**. A build script (site/scripts/build-publisher.mjs) inlines both into dist/publisher-template.html and deletes its scratch artifacts.

The builder rejects unexpected extra runtime files, unresolved module imports, external CSS asset references, or an oversized template. The existing GitHub Pages Portal, Studio and VR/GLB assembled routes remain on their established build path. The updated site/scripts/verify.mjs checks that the template is self-contained and has a single valid data insertion slot.

The WebGL/physics code, CSS and any embedded WASM runtime assets are carried in the same HTML release. Publisher template size is capped at 12 MB, resulting adventure HTML at 12.2 MB, playable world JSON at 160 KB.

## Security design

- The exporter revalidates the complete pixelforge.playable-world.v1 document, including source-bound gameplay rules, event graph targets, physics constraints, and declared local-browser-only capabilities. Private asset proxies and unknown executable fields are not allowed.
- World data is inserted only as inert application/json. World text escapes HTML parser special characters (including less-than, greater-than and ampersand) so names or story text containing closing script tags cannot become executable HTML.
- The standalone entry parses that JSON with the same existing world validator and renders it as data.
- A Content Security Policy blocks network connections, remote scripts and media, forms and plug-ins. Locally bundled Rapier WASM may execute. Local save/ghost functionality is available only when the browser permits it on file URLs.
- A published HTML is *not* cryptographically signed and a modified third-party HTML file can still execute code. Treat untrusted HTML distributions as untrusted software.
- Existing Rung 9 playtest save and Rung 11 ghost formats stay independent of the published world and remain local-only.

## Functional scope

The export includes geometry, fixed/dynamic rigid bodies, walking/sprinting/jumping, door dissolve, quests, collectibles, checkpoints, branching objectives, standard gamepad mapping, optional local game progress, ghost playback and the local Playtest Inspector. It does not include private GLB meshes, source VR Studio projects, network multiplayer, licensed music, account services, external image/model files, or a native OS installer.

## Automated verification

Run from repository root:

    npm --prefix site test
    npm --prefix site install --no-audit --no-fund
    npm --prefix site run build

The offline-publisher test suite covers safe world JSON embedding, malicious closing-tag strings, template integrity and uniqueness, source/provenance rejection, filename sanitization, safe build source requirements and source-world immutability. Production CI also builds and verifies the fully inlined template. No network or dynamic import dependencies may be left in the resulting standalone player.

## Manual acceptance checklist

1. Publish the official sample and a custom-authored world from Forge and from World Player.
2. Disconnect from the network, double-click the downloaded HTML, and verify WebGL2 physics, scene geometry, switches, locked doors and Finish behavior.
3. Inspect browser devtools Network: the published game must issue zero external requests. Confirm no missing scripts/styles/WASM or CDN dependencies.
4. Test the same single-file release on Windows/Chrome, other desktop browsers, and supported mobile/VR browsers where local-file access exists.
5. Try a world containing malicious-looking text such as closing script tags. It must render as harmless text, not create executable HTML.
6. Confirm optional save/import/export and Gamepad API features; local file storage may be unavailable on some browsers.
7. Verify file remains within the output limit, with no authoring project, local asset vault, private GLB bytes or unexpected filesystem paths.
8. Re-run legacy Studio, VR Studio, Layer Studio and ordinary GitHub Pages route smoke tests.

## Future work

A future release can add rich game covers, HTML metadata, content signing, bundled third-party legal notices, or an optional distributable ZIP for creators who need separate LICENSE/README artifacts. This rung deliberately chooses the stricter and easier-to-share single HTML form.
