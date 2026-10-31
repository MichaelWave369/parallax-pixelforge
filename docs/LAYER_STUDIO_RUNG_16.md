# PixelForge Layer Studio — Rung 16: Branch Route Reports

## Export a hypothetical story route that anyone can check against the same authored world

Rung 16 gives Rung 15's **Story Path Simulator** a portable, reproducible output. An author can explore a branch, export its exact sequence of hypothetical actions, and send a readable Markdown explanation or machine-readable JSON receipt to a playtester. The JSON can be imported back into Layer Studio, replayed **against the current authored Room Atlas**, and loaded into the *simulator preview only* after verification.

**Nothing in this rung writes to Adventure Journal save slots, starts actual gameplay, uploads a project, or awards in-game rewards.** The report is a planning/verification artifact, not gameplay evidence.

## Export a report

1. Open **Layer Studio → World Branch Map → Story Path Simulator**.
2. Take hypothetical steps. Discover the Stone Archive, explicitly assume the key/relic/quest conditions if needed, travel to the Forgotten Reliquary, and choose either answer to the Forked Echo.
3. In **Rung 16 / Branch Route Reports**, choose:
   - **Export JSON Receipt** for deterministic replay, import and verification.
   - **Export Readable Markdown** for a human-readable timeline of decisions, newly earned flags, unverifiable assumptions and remaining blocked choices.
4. Both exports are local browser downloads. No project metadata, user account data or actual save state is sent elsewhere.

The report contains:
- A fixed schema identifier \`pixelforge.layer-route-report.v1\` and **hypothetical-story-path** marker.
- A stable, noncryptographic checksum of the authored story topology (rooms, portals, discovery tracks, authored world-flag sources, NPC choices and boss reward metadata). Pure art/color edits do not change it.
- Ordered exact actions, each with type, original and destination room, author-visible description, new flags and any non-flag travel requirements explicitly assumed.
- The final hypothetical room, visited rooms, earned world flags, completed once-only discovery receipts, assumed events and current key/relic/quest toggle.
- Blocked discoveries and portals in the final room, with grounded reasons.
- A conspicuous notice that this is a narrative planning simulation, not tested gameplay.

The generated JSON is deterministic: the same world and same surviving sequence of decisions produces the same bytes, without timestamps or local identifiers.

## Verify an imported JSON route

1. Choose an exported \`.json\` using **Verify An Exported Route**. Imports are limited to **256 KB**.
2. Click **Verify Selected JSON**. The verifier checks the report version and bounded structure, confirms the authored story topology checksum matches, and replays up to 64 actions using Rung 15's exact simulator logic.
3. The replay must reproduce **every** recorded action, transition, new flag, assumption, blocker and final result. Unknown choices, blocked doors, missing prerequisites, manually added flags, altered outcomes, or changed story topology are rejected.
4. When verification passes, click **Load Verified Route Into Simulator** to populate **only the hypothetical preview**, including its undo history. Nothing touches the game, saves, scene editor contents, or source repo.
5. The world fingerprint is checked again when loading, so edits made after verification cannot sneak through.

If the authored sequence/portal/story logic changes, a previously exported report returns **world-mismatch**. Export a new report against that revised world. If a replay step is no longer permitted, the verifier identifies the first blocked step. If the report's recorded outcomes contradict replay, the verifier returns **receipt-mismatch**.

## Example: comparing the Forked Echo routes

In the starter adventure, a report can record:

1. **Discover: The Stone Archive** → \`archive-revealed\`.
2. **Assume key/relic/quest checks passed** → declares the gate assumption.
3. **Travel: Lantern Vault → Forgotten Reliquary** → lists the unverified key check.
4. **Discover: The Forked Echo / Carry the forgotten promise** → \`fork-decided\`, \`echo-honored\`.
5. **Discover: The Kept Promise** → \`promise-kept\`.

Undo the last two discoveries and choose **Release the echo into silence** instead, then complete **The Hushed Chamber**. The second export contains only the surviving action history and its own flags. It does not claim that both exclusive branches were earned.

## Compatibility and implementation

- \`layer-studio/story-path-simulator.js\` adds a minimal, validated **action** to each in-memory history item. Undo removes it alongside the restored state. Rungs 1–15 gameplay and local saves are untouched.
- \`layer-studio/story-path-reports.js\` is a pure module exposing \`routeWorldSignature\`, \`routeWorldFingerprint\`, \`createRouteReport\`, \`verifyRouteReport\` and \`routeReportMarkdown\`. It has no browser storage, document API, network functions or runtime game commands.
- \`layer-studio/studio.js\` provides explicit user-driven JSON/Markdown downloads (Blob object URLs), local JSON import, validation status, and an opt-in button to load the verified result into the simulator.
- The fingerprint's canonical authored topology projection is shared by the simulator's reset behavior and receipt verification. Changing unrelated visual-only scene details does not invalidate a route.
- \`tests/layer-branch-route-reports.test.js\` is included in mandatory \`npm run test:studio\`; tests cover deterministic replay, both branch outcomes, undo, invalid actions, checksum mismatches, forged outcomes, safe Markdown, explicit gate assumptions, zero-step/legacy projects and UI wiring.

There are **no changes** to the \`pixelforge.layer-scene.v1\`, Room Atlas v1, World Sequence v1, boss, quest, or \`pixelforge.layer-save.v1\` formats. Reports are independent documents and never silently become game saves.

## Trust and scope limits

The \`fnv1a32\` checksum detects ordinary accidental authored-world changes, but **is not a secure hash, publisher signature or authentication of a playtester**. A determined person with control of the report and world may manufacture a self-consistent hypothetical route. Verification proves internal consistency with the local authored topology and replay rules, not a real-world event or physical playability.

The simulator still does not prove platforming, real combat success, actual NPC activation, key/relic possession, route geometry or quest resolution. Assumed events and non-flag portal requirements are explicitly labeled. The exported Markdown is escaped text, not executable HTML or JavaScript.

## Next horizon

Potential Rung 17: a small **Playtest Scenario Catalog** that stores local reusable routes *separately from saves*, compares their expected flags and flags story-topology regressions when a creator changes the adventure.
