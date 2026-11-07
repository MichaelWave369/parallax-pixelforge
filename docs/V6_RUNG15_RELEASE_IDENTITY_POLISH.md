# PixelForge v6 · Rung 15: Cover Art, Credits, License Notices & Controller Title Navigation

A published PixelForge adventure can now carry **creator-supplied original cover art**, **up to eight contributor credits**, an explicit **creator-content redistribution notice**, and complete **engine/runtime license texts** in its existing self-contained offline HTML release. A standard gamepad can navigate and launch the title screen without using a mouse.

This rung preserves original VR Studio data, the Rung 5–14 playable-world/quest/save/ghost contracts, local-first operation and the no-network CSP.

## Creator publishing workflow

1. Open the Forge's **Build & Export** workspace or the World Player's **Offline World Publishing** panel.
2. Author release title, creator name, tagline, semantic version and accent as in Rung 14.
3. In the new **Cover, Credits & Rights** editor, acknowledge that you can redistribute the chosen cover. Upload a small **PNG, JPEG or WebP** cover (maximum 320,000 original bytes). The image is read locally, checked for a matching binary signature and embedded as a bounded base64 data URL in the HTML; it is **not uploaded** or fetched from a remote server.
4. Provide meaningful cover alt text for screen readers, up to **eight** role/name contributor credits, and a plain-text rights or redistribution notice for original game content. Default notice makes no claim that the creator grants any particular license.
5. Click **Publish Offline Adventure (.html)**. The exporter uses the same trusted, build-produced player template and safely inserts the cover/credits as a third inert JSON payload. Existing authoritative world data and creator files remain unchanged.
6. Open the exported HTML with the network off. The title screen displays the cover. Choose **Credits & Licenses** to see creator credits, creator-supplied content terms and the full bundled dependency license texts.

The publisher never accepts SVG, GIF, remote image URLs, data-bearing scripts or unbounded files as cover art. An uploaded image is a visual asset; browser image decoders are platform software and should still be kept current. The rights acknowledgement is an author assertion, not verification of authorship, licensing or provenance.

## Separate declarative data

Rung 15 adds a *third* separate inert block, not new fields in playable-world.v1 or published-release.v1:

    pixelforge.published-extras.v1
    { format, cover:null | {dataUrl,alt}, credits:[{role,name}], contentNotice }

Each field has strict limits: at most 320,000 decoded cover bytes, 140 characters of alt text, 8 credits of bounded role/name text, 640 characters of creator content notice, 450,000 bytes of normalized JSON, no unknown fields. The accepted cover MIME types must match their PNG/JPEG/WebP file signature. Base64 must be canonical. HTML parser significant characters in text are encoded before insertion. The original world SHA-256 identity and game-save/ghost behavior remain unchanged by branding or cover changes.

A fourth inert JSON block contains **full software license texts**, read at build time from the installed, pinned runtime packages. The release build fails if expected packages, versions or license texts are missing, mismatched, or unexpectedly large. The build requires the actual first-party PixelForge MIT file plus React 19.2.0, React DOM 19.2.0 and Three 0.180.0 MIT licenses, and Rapier 0.20.0 Apache-2.0 license. The viewer displays the original text in expandable, scrollable panels. Runtime exports do not require internet access to view these terms.

This is a compliance aid, not a legal opinion. Developers must still verify asset licenses, attribution and notices for any other content they later bundle into a game.

## Title and gamepad behavior

The title screen now displays a bounded, local cover at its top. An explicit **Credits & Licenses** button opens a separate reader. Keyboard focus, Tab and Enter remain native accessible actions.

For a browser-supported **standard-mapped** Gamepad API device:

- **D-pad Up/Down** or **left-stick Up/Down** (65% activation threshold) moves between Start Adventure, Credits and the three launch settings, wrapping at the ends
- **A** or **Start/Menu** activates the focused control
- **B** returns from the Credits reader to the title
- Holding a button does **not** repeatedly activate it; actions fire on rising edges
- Unsupported layouts and disconnected controllers neutralize all title inputs, while keyboard and pointer continue to work

Gamepad polling runs only while the title/credits screen is mounted. Starting the game unmounts the title polling loop; the original in-game Gamepad controls remain in charge. The browser may require a physical button press before it exposes an attached controller. No VR-controller support or controller rumble is implied.

## Security, storage and licensing boundaries

- The published HTML remains one file with inline runtime and styles, **no external runtime dependencies and CSP connect-src 'none'**.
- The cover image uses only data:image/png, image/jpeg or image/webp and is never interpreted as world executable code or a remote fetch URL.
- No creator assets or private GLB vault files are bundled except an explicitly selected, bounded cover image.
- The cover, credit and licensing metadata are presentation data, not world rules or capabilities.
- Existing browser save slots and ghost data keep their exact world-content-based keys.
- The creator content notice is separate from the included open-source engine licenses. Neither grants any new game permission.

## Automated tests

    npm --prefix site test
    npm --prefix site install --no-audit --no-fund
    npm --prefix site run build

Additional tests validate PNG/JPEG/WebP byte signatures, data URL safety, size/quota caps, malicious-looking text, HTML escaping, unknown field rejection, credits limits, license reader schema, menu focus wrapping, controller edge triggers and unsupported/disconnected gamepad behavior. The production build additionally requires actual full license text for every bundled runtime package and verifies the inert JSON blocks.

## Manual acceptance checklist

1. Publish an adventure with creator-owned cover art, custom title, credits and terms. Disconnect all network connectivity, open the HTML and confirm the cover image, title, licenses, and gameplay run offline.
2. Inspect the downloaded HTML to verify all licensed software texts are present and the cover does not trigger any external request.
3. Test a 320 KB image, SVG/GIF, malformed PNG with forged MIME, enormous image, a credit with script-looking text, and a missing rights confirmation.
4. Verify release metadata changes do not change the original playable-world digest, saved progress, Ghost Run IDs, creator scene or protected GLB assets.
5. With an Xbox-style standard gamepad, navigate every setting and Credits reader using D-pad/stick/A/B/Start. Hold a control for several seconds and confirm there is only one activation; unplug the controller and continue by keyboard.
6. Test keyboard Tab, Shift+Tab, Enter, Escape/browser back expectations and focus visibility. Verify the Credits screen can be used with assistive technology and long license text scrolls.
7. Confirm published builds contain no new modules or external CSS, and pass full existing Studio/VR runtime preflight. Visually qualify on desktop and mobile browsers; CI alone does not establish production usability.

## Next rung

Possible Rung 16: a player-friendly saved-game picker on the title screen, explicit Continue/New Adventure, release version migration warnings, and a release-readiness checklist. These should remain distinct from playtest/debug controls, and never turn offline HTML into an account or telemetry service.
