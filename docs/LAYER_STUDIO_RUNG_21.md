# PixelForge Layer Studio — Rung 21: Authoring Test Missions

## Release checklists that distinguish simulated story logic from real gameplay evidence

Rungs 15–20 can simulate authored narratives, export and replay hypothetical receipts, track coverage, guide untested branches and find a minimum set of verified *hypothetical* scenarios. Rung 21 adds **authoring test missions**, named checklists that organize those authored targets into release-review goals.

**There are two explicitly different observations for every mission goal:**

1. **Narrative simulation coverage**: derived automatically from Rung 18's current Route Coverage Matrix, which itself requires a fully verified Rung 16 *hypothetical* route receipt.
2. **Hands-on gameplay outcome**: a separate, manually entered **author-reported** observation. The author must deliberately say they played the real game, select pass/fail/blocked, and record meaningful notes. No story simulation is allowed to fill this field automatically.

A checklist reaches **Author Checklist Complete** only if it has at least one goal and **every** goal has both current verified *hypothetical* narrative coverage and a current **author-reported** manual pass. Even then, completion is **not certification**, an independently validated playtest, or permission to ship a game. Actual gameplay results are not instrumented or authenticated by this rung.

## In the editor

Navigate to **PixelForge → Layer Studio → World Branch Map → Rung 21 / Authoring Test Missions**.

1. Enter a **New Mission Name**, such as \`Chapter 1 / Branch Release QA\`, and optional mission notes. Choose **Create Test Mission**.
2. With the mission selected, choose one **authored story goal** from the current Room Atlas. Targets include rooms, discovery tracks, exact choice outcomes, world flags, portal passages and authored events. Choose **Add Goal To Mission**. Duplicate target entries are rejected.
3. Each goal displays two statuses side by side:
   - **SIM:** \`verified\`, \`needs-review\`, \`uncovered\` or \`missing\` based on the current saved hypothetical scenario catalog and authored world.
   - **GAME:** \`not-run\`, \`passed\`, \`failed\`, \`blocked\` or \`stale\` based on **author-reported** real gameplay notes, never Rung 15 simulator actions.
4. For a real playtest, select an outcome and describe **what happened in the actual game** (at least eight characters, up to 500). Check **I personally tested this result in the actual game, not just the story simulator**, then click **Record Author-Reported Result**. Without explicit confirmation and notes, saving the result fails closed.
5. To reset a manual result, select **Not run / clear result** and record it; this erases that goal's old manual result but not its narrative goal definition.
6. Choose **Remove Goal** or **Remove Selected Mission** to discard checklist entries (with a confirmation before deletion). The source adventure, saved gameplay, and stored scenario receipts remain unchanged.
7. Choose **Export Mission Report JSON** to download a read-only snapshot of the currently computed mission review, with separate author-reported manual and narrative fields. It is a human-review artifact, **not an Adventure Journal save**, release certificate, or automatically importable game state.

The mission book persists locally under its own versioned key:
\`pixelforge.layer-test-missions.v1.local\`.

It is separate from the layer editor's working scene, Adventure Journal saves, Rung 17's scenario catalog, and Rung 16's hypothetical route receipts. When browser storage fails, entries stay in memory and the editor explicitly tells the author to export their work rather than pretending it was saved.

## World change detection

The narrative simulator uses the **authored story topology fingerprint** from Rung 16. That is intentionally insensitive to unrelated artwork edits.

Manual gameplay evidence, however, is tied to a **full authored Room Atlas fingerprint**. Editing level geometry, art, or story authoring can change this fingerprint, marking a previously recorded manual observation **STALE**. The note remains visible as historical context, but **no longer counts** toward a completed checklist.

Both fingerprints are **non-cryptographic change detectors**. They cannot authenticate a tester or prove which executable/game build was actually played, and they may not detect changes to external dependencies not contained in the Room Atlas. Checking a box is still only the creator's own statement. Independent build verification, tested device/OS details, recorded runtime evidence, and release signoff remain separate manual responsibilities.

## Example: the Forked Echo release mission

Create \`Chapter 1 / Fork Regression\`, then add two exact authored goals:

- \`Carry the forgotten promise\` in the Forgotten Reliquary.
- \`Release the echo into silence\` in the Forgotten Reliquary.

Saving only the **Honor** hypothetical scenario makes the Honor goal's **SIM** status verified, but the Silence goal remains uncovered. Adding the separate **Silence** hypothetical scenario allows both SIM statuses to verify. The GAME statuses remain **Not run** until an author tests each route in the real game and explicitly records an honest outcome with notes.

After a real playtest, if Honor passes but Silence physically fails, the mission remains **Needs Work**, even if both simulated story routes verify. Conversely, a manual pass without a verified hypothetical route is **not enough** to complete the checklist.

Changing artwork or story authoring after manually recording a pass marks the older manual result **STALE** until the current world is actually retested.

## Limits and safety

- Maximum **8 missions**, **16 goals per mission**, **160 KB** serialized mission book. Goals reference authored target IDs; a removed/renamed target becomes **missing** rather than silently retargeted.
- Manual statuses must be \`not-run\`, \`passed\`, \`failed\`, or \`blocked\`, with explicit author confirmation and notes for all non-\`not-run\` states. There is no API to mark an imported or simulated run as objective physical success.
- Every mission, goal and manual record is validated as bounded plain data. No custom code, arbitrary scripts, network requests, telemetry, or gameplay-state calls.
- Checklists display independent narrative and manual results. Any missing/stale/failed/blocked/unrun goal prevents an **Author Checklist Complete** status.
- A mission with **zero goals is never complete**. An authored world missing from the editor cannot count as verified narrative coverage, even if older manual notes exist.
- A completed self-reported checklist **does not certify game stability, accessibility, platform performance, Quest 3 behavior, keyboard/controller compatibility, physical route reachability or release readiness.** Those still require substantive real testing.

## Implementation

- \`layer-studio/story-test-missions.js\`: pure versioned mission data, lifecycle operations, strict validation, the full-world change detector, explicitly confirmed manual outcome recording, and combined narrative/manual review using Rung 18's coverage report.
- \`layer-studio/studio.js\`: dedicated local browser storage, mission create/select/delete controls, authored target selection, per-goal manual-status form with required unchecked acknowledgment, local export of the review, and reactive mission status after scenario/world changes.
- \`layer-studio/index.html\`, \`studio.css\`: accessible semantic release-checklist panels, separately named SIM/GAME statuses and mobile layouts.
- \`tests/layer-authoring-test-missions.test.js\`: included in mandatory \`npm run test:studio\`; verifies the exclusive Forked Echo outcomes, missing hypothetical or physical proof, manual acknowledgment requirements, failures/blocks, stale visual and story changes, unique target constraints, deletion, bounds, invalid records and UI/save separation.

## Next horizon

Potential Rung 22: **Device and Input Test Matrix**, allowing authors to classify self-reported real gameplay results by browser, operating system, controller, or VR headset, without confusing self-reported field observations with automated runtime telemetry.
