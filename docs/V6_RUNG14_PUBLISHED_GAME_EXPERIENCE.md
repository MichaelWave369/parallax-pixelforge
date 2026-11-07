# PixelForge v6: Rung 14 · Published Game Experience

A published game now has its own **title screen, launch settings, creator identity, fullscreen controls and a focused game UI**. This rung extends Rung 13's network-free single HTML export without modifying the validated playable-world, gameplay rules, save-game, or ghost schemas.

## Author a release

In the Forge **Build & Export** workspace, set the release title, tagline, studio/creator name, semantic version and accent color. These same release fields are available in the World Player's **Offline World Publishing** panel.

Select **Publish Offline Adventure (.html)**. The resulting offline file has:

- A responsive title screen showing the chosen name, tagline, studio, release version and accent color.
- **Start Adventure**, which begins a fresh run only after a deliberate player action. Simply opening the HTML file does not start physics or move the avatar.
- Launch settings for **on-screen movement controls**, **advanced playtest tools** and **reduced decorative motion**. These are presentation choices held in memory for that browser session; they do not alter level geometry, scripts, physics rules, checkpoints or saves.
- A focused player display with title and creator details, **Fullscreen / Exit Fullscreen** and **Return to Title Screen** buttons. Fullscreen is requested only on a user click; unsupported or denied requests produce a visible status.
- Gameplay/quest HUD and player controls visible by default, while the existing ghost recording, Inspector, debug, library/import and authoring-style tools remain optional under **Show advanced playtest tools**.
- No network calls, remote fonts, external media, account or installer. Existing WebGL2 and WebAssembly requirements remain.

The return-to-title operation tears down the physics world and opens the launch screen. Starting again begins a new live run. Previously saved browser-local progress is **not deleted**; resume it explicitly if advanced tools are enabled and the browser allows storage on file URLs. No automatic save is implied.

## Release metadata contract

The release metadata is a separate presentation-only JSON block inside the single published HTML. It is never added to the authoritative `pixelforge.playable-world.v1` document. The exact contract is:

```json
{
  "format":"pixelforge.published-release.v1",
  "title":"My Adventure",
  "tagline":"A world worth exploring.",
  "creator":"Independent PixelForge Creator",
  "version":"1.0.0",
  "accent":"#70ecdb"
}
```

The title is capped at 100 characters, tagline at 160, creator at 80, version must be bounded numeric semantic version (optional short lowercase prerelease) and accent must be a six-digit hex color. Control characters and unknown fields are rejected. No URLs, executable scripts, permission changes, private model references or source GLB data are permitted.

The publisher revalidates release metadata, escapes HTML-significant characters before inserting it in a second **inert application/json script element**, and preserves the independent first script block for the strictly validated playable-world JSON. The standalone player parses both as data. Legacy Rung 13 published files without a release block remain independent files and are not rewritten; new runtimes can supply default metadata when a release block is absent.

## Changes and limits

- `PublishedGameShell.jsx`: title/launch screen with opt-in settings, guarded launch and return-to-title navigation.
- `release-metadata.js`: declarative release contract, bounded validation, safe encoding and defaults.
- `ReleaseMetadataEditor.jsx`: session-local authoring fields, reused in Forge and World Player.
- `WorldPlayer.jsx`: standalone branding, fullscreen controls and optional reduced developer UI. Embedded world remains validated and trusted only as data.
- `published-main.jsx` / offline publisher: load separate world/release data blocks, update the tab title safely, and bundle CSS/React/Three/Rapier into one HTML file.
- `site/scripts/verify.mjs` verifies both inert slots in the shipped publish template.
- Existing local saves use the same per-world digest: changing release title, tagline, creator, version or accent **does not invalidate game progress**. Changing world geometry or gameplay rules still changes the content digest and remains guarded.

The exported file still requires browser support for WebGL2 and WebAssembly. Fullscreen API and local file storage availability vary by browser/platform. Reduced motion controls decorative CSS transitions, not physical object motion, camera movement, or Rapier door animation. Soundtrack, native application installers, thumbnails, game-controller menu navigation and production Quest 3 qualification are not claimed.

## Verification

```bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
```

New `site/scripts/release-metadata.test.mjs` cases cover strict release metadata, source-independent world serialization, HTML escape safety against closing tags, defaults, file naming, version and color checks and forbidden executable fields. The Rung 13 publishing tests were extended to require the extra inert release slot without weakening world validation.

### Manual acceptance checklist

1. Build a world in Forge and enter distinct title, tagline, studio name, version and accent. Export the offline HTML, disconnect from the network and open it.
2. Verify the launch screen reflects the release identity, and that no player physics is running before **Start Adventure**.
3. Disable **on-screen movement controls**, start playing and verify keyboard and controller work while the touch D-pad is hidden. Return to title and re-enable it.
4. With **advanced playtest tools** disabled, verify the creator-oriented Ghost Runs, Inspector, save import/export and world library do not clutter the default player view. Enable it and ensure existing tools still work without changing rules.
5. Toggle **reduce decorative motion** and confirm transitions/animations in the interface stop; Rapier physics still runs normally.
6. Request and exit fullscreen through the player button. Confirm denial/unsupported behavior gives a visible status, not a crash. Return to title and start a fresh run.
7. Publish two releases of the same world with different marketing metadata. Confirm their original world documents and game-save digests are identical.
8. Try malicious-looking strings in metadata including closing HTML script tags and ampersands. Confirm they stay inert text, with no code execution or new network requests.
9. Verify existing Forge, Studio, Layer Studio, VR Studio and protected GLB boundaries, and that all runtimes remain bundled into a single released HTML file.
10. Perform actual offline browser testing on your intended desktop/mobile/headset platforms before claiming compatibility; CI doesn't replace hands-on game UX qualification.

## Next

Future rungs could add a game-cover/thumbnail pipeline, optional release notes/license screens, title-menu gamepad navigation and accessibility settings, an explicit local save picker accessible without playtest diagnostics, and creator-supplied music where redistribution rights are verified.
