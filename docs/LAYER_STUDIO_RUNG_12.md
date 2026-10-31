# PixelForge Layer Studio — Rung 12: World Sequence Tracks

## Cinematic discoveries anywhere, without boss fights

Rung 12 makes the existing **Cinematic Director** available throughout the **Room Atlas**, not only during boss intros and victories. A creator can place a discovery zone, author a short sequence of text/camera/lighting beats, and optionally grant a permanent world flag when the player explicitly completes that discovery.

All functionality is data-only, offline-first and local. No scripts, remote assets, network, cloud saving, voice playback or arbitrary events are executed.

## Play The Stone Archive

Start a new two-room Room Atlas. In the Lantern Vault, walk toward the central Stone Archive area (around X 710–860), then press **E** (or the controller/touch interaction control). This opens the three-beat discovery:

1. **A Hidden Inscription** begins with player framing, a dimmer room, and the caption "STONE RESONANCE".
2. **A Distant Gate** eases the camera toward world X=1320, reveals another passage, and darkens the chamber.
3. **The Archive Awakens** pulls back to a room-wide view while the light returns.

The player and game physics stay frozen while the overlay is open. **Next Beat** advances manually, and the timed playback advances automatically at the authored durations. **Skip & Complete Discovery** or **Complete Discovery** records the achievement, then closes the overlay and resumes gameplay.

Completing this starter track sets the persistent flag \`archive-revealed\`. That flag is available to quest objectives and Room Atlas door requirements.

**Escape closes without completion**, awards no flag, and leaves the zone available for another interaction. A one-time discovery already completed will not play again after backtracking or loading a save.

## Editor

Open **Layer Studio → Room Atlas → World Sequence Tracks**. You can:

- Add up to **8** world sequences per room, with stable ID, title, player activation rectangle, optional required world flag and optional awarded completion flag.
- Mark a track "once only"; leave it repeatable if you want a revisitable story scene.
- Add up to **4 beats per track**, each containing a title, text, duration, optional camera focus, world-space precise X, ambient darkness, and a readable caption cue.
- Choose camera defaults: player, boss if one exists, or whole room. A precise **Focus world X** overrides those defaults to frame an object, secret doorway or landscape detail.
- Show a guide rectangle for each authored discovery zone while editing.

World Sequence Tracks work independently of Room Atlas boss definitions. The normal boss attack telegraphs, quest system, story dialogue, relics, and portals remain intact.

## Runtime state

The optional per-room \`sequences\` payload uses \`pixelforge.layer-world-sequences.v1\`:

\`\`\`json
{
  "schema": "pixelforge.layer-world-sequences.v1",
  "tracks": [{
    "id": "the-stone-archive",
    "title": "The Stone Archive",
    "x": 710, "y": 373, "w": 150, "h": 126,
    "requiresFlag": "",
    "completionFlag": "archive-revealed",
    "once": true,
    "beats": [
      {"title":"An Inscription","text":"The hidden writing glows.","seconds":2,
       "focusX":1320,"ambient":0.5,"cue":"STONE RESONANCE"}
    ]
  }]
}
\`\`\`

Only valid lowercase flag IDs (letters, digits, underscores, hyphens, colons) are accepted. Values and sizes are bounded; invalid imports cannot execute code. Missing requirements fail closed.

**Timeline completion is explicit.** Opening or watching a world sequence never sets its completion flag. Clicking Finish/Skip & Complete, pressing E/Enter/Space while the panel is active, or using the panel’s controller interaction commits the discovery. Closing with Escape or otherwise cancelling clears the pending sequence without awarding a flag.

Sequence playback reuses the Rung 10 timing controller and Rung 11 camera and lighting renderer. It does not move the actor, alter collisions, grant inventory, advance a quest prematurely, or change Room Atlas architecture.

## Save and compatibility

- Adds optional \`sequenceSeen\` to the existing per-room Adventure Journal snapshots, **only** for rooms with authored world sequences.
- Saved IDs are filtered against the room’s actual authored tracks. Invented IDs are discarded on reload.
- Completed world flags use the existing global \`worldFlags\` registry, and are validated against authored flags when loading.
- Every existing old Room Atlas with no authored \`sequences\` retains its original data shape. Old single-room Stonebridge scenes do not gain sequence state.
- The outer \`pixelforge.layer-scene.v1\`, Room Atlas v1, and save v1 schema identifiers remain unchanged. A changed starter scene naturally has its own world fingerprint and save slots.
- The in-progress visual/camera timeline is temporary and is intentionally not saved. Completed receipt + flag progress persists across room travel, reload and backtracking.

## Testing and limits

\`tests/layer-world-sequences.test.js\` is part of the required \`npm run test:studio\` preflight. It covers world discovery triggering, explicit completion/cancellation, zero duplicate one-time replay, quest/door flag integration, precise camera focus, save/restore and backtracking, malicious import constraints, legacy scene compatibility and editor/play hooks.

This is a short **interactive discovery cinematic**, not a full cutscene movie editor, sound/voice engine, branching sequence graph, multitrack character rig animator, or physical VR test. Captions are text; there are no remote resources and no arbitrary JavaScript callbacks.

## Next rung

Possible Rung 13: composable story decisions, discovery prerequisites and room-scoped music/caption metadata, retaining bounded data-only semantics.
