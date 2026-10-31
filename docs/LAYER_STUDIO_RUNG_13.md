# PixelForge Layer Studio — Rung 13: Branching Discoveries & Story Consequences

## Discoveries now ask the player to decide

Rung 13 extends Rung 12 World Sequence Tracks with **optional player choices**, each with a distinct persistent **world-flag consequence**. The same data-only engine can then gate later discovery tracks with **Requires Flag** and **Lock If Flag Exists**.

This is opt-in. Existing single-room scenes, old Room Atlas adventures, Rung 12 non-branching world sequences, boss scenes, quest progress and three browser-local save slots continue to use their previous v1 schemas. No new script engine, remote assets, executable code or online services are introduced.

## Bundled example: The Forked Echo

The two-room starter adventure has a coherent three-part decision:

1. In Lantern Vault, discover **The Stone Archive** and complete its cinematic to earn \`archive-revealed\`.
2. Travel to **The Forgotten Reliquary**. Around world X=695, find **The Forked Echo**, which only appears after the archive flag has been earned.
3. Two cinematic beats reveal a divided memory. At the conclusion, choose between:
   - **Carry the forgotten promise**, setting \`echo-honored\`.
   - **Release the echo into silence**, setting \`echo-silenced\`.

Both choices also mark the once-only fork \`fork-decided\`. Only the explicitly selected choice flag is awarded.

Continue to world X≈1040. The same physical space hosts two separate follow-up discovery sequences, each visible only under its own condition:

| Branch flag earned | Follow-up discovery | New completion flag |
| --- | --- | --- |
| \`echo-honored\` | **The Kept Promise** | \`promise-kept\` |
| \`echo-silenced\` | **The Hushed Chamber** | \`chamber-hushed\` |

Each follow-up also explicitly excludes the opposite branch flag. The unchosen path remains locked. The completion flags can be used by existing quests, doors and other story events.

## Authoring no-code choices

Open **PixelForge → Layer Studio → Room Atlas → World Sequence Tracks**.

For any authored sequence, find the **Rung 13: Branching Discoveries** controls. Use **+ Choice** to create up to three responses. Give each a player-facing label and an optional **Choice World Flag**. Add or remove responses and select individual choices for editing.

Set the sequence to **Once Only** if the decision should be exclusive for that adventure. A repeatable sequence can be deliberately authored to offer another choice on later visits.

For follow-up tracks, configure:
- **Requires World Flag**: the global world state that must already be true.
- **Lock If World Flag Exists**: the global world state that must still be false.

Both conditions are checked before a player can open the track. These constraints compose with the existing once-only condition and its activation rectangle.

## Player experience

Older non-branching sequences still offer the original **Complete Discovery** or **Skip & Complete Discovery** action.

When a sequence has authored choices, the last beat instead presents individual response buttons. The player can:

- Watch the full cinematic and let it reach its decision panel.
- Use **Next Beat** or **Skip to the Decision** to advance without awarding any world state.
- Choose with mouse/touch, number keys 1–3, or **Up/Down** then **Enter**, **E**, or Xbox X to confirm the highlighted response.

No branch flag is set until a valid authored response is actually chosen. Pressing Escape or closing the panel cancels the attempt and awards nothing. Invalid or missing choice IDs fail closed: the sequence remains open and no completion/choice flag is awarded.

A completed once-only fork cannot reopen in the same adventure. The choice and its follow-up results persist across room travel, explicit browser save/load, and backtracking. A previously earned world flag can also be used by the already-existing quest journal or a conditional door requirement.

## Data contract

The existing optional room-level \`pixelforge.layer-world-sequences.v1\` format gets two optional additions to each track:

\`\`\`json
{
  "schema": "pixelforge.layer-world-sequences.v1",
  "tracks": [{
    "id": "forked-echo",
    "title": "The Forked Echo",
    "requiresFlag": "archive-revealed",
    "completionFlag": "fork-decided",
    "once": true,
    "x": 695, "y": 375, "w": 150, "h": 125,
    "beats": [
      {"title":"TWO VOICES","text":"Two memories diverge.","seconds":2}
    ],
    "choices": [
      {"id":"honor","label":"Carry the promise","setFlag":"echo-honored"},
      {"id":"silence","label":"Release the echo","setFlag":"echo-silenced"}
    ]
  },{
    "id":"promise-path",
    "title":"The Kept Promise",
    "requiresFlag":"echo-honored",
    "unlessFlag":"echo-silenced",
    "completionFlag":"promise-kept",
    "once":true,
    "x":1040,"y":380,"w":135,"h":120,
    "beats":[{"title":"A VOICE REMEMBERED","text":"The promise lives on.","seconds":2}]
  }]
}
\`\`\`

The optional \`choices\` array is capped at three entries. Every choice has a bounded, stable ID, a plain-text label of at most 90 characters, and a validated optional \`setFlag\`. Imported non-data fields like \`script\`, \`onclick\`, \`url\`, or functions are discarded by normalization. URL-scheme-looking identifiers are not valid flags.

The optional \`unlessFlag\` complements \`requiresFlag\` and deliberately stays absent from older projects unless authored. Unknown but syntactically valid requirement IDs are not treated as completed. Choice flags are included in \`knownWorldFlags\`, meaning the existing quest/door evaluation logic can consume them without a new interface.

**Progress is still local:** the existing \`pixelforge.layer-save.v1\` includes the per-room \`sequenceSeen\` receipt and global \`worldFlags\`. Active timeline UI and camera positions are ephemeral. Saved IDs are constrained to authored world definitions; a user manually editing their own browser save is not cryptographically prevented from adding a known valid flag.

## Verification and scope

\`tests/layer-branching-discoveries.test.js\` is included in mandatory \`npm run test:studio\`. It covers both choices, explicit choice-ID validation, one-time exclusivity, separate follow-up prerequisites, cancel and resume, quest/door flag use, save/backtracking, malicious import bounds, old non-branching sequences and editor/play wiring.

This is **a bounded two-stage story branch**, not a full arbitrary dialogue graph, cutscene editor, dialogue recording studio, real audio system, or online quest service. Manual desktop, touch and Xbox controller playtesting remains a separate acceptance gate.

Potential next rung: a visual **World Branch Map** displaying authored choice flags, discoveries, and dependencies, with warnings for circular or unreachable routes before publishing.
