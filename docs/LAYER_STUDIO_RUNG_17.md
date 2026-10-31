# PixelForge Layer Studio — Rung 17: Playtest Scenario Catalog

## Reusable narrative regression cases, entirely separate from gameplay saves

Rung 16 makes hypothetical story routes portable. Rung 17 turns those route receipts into **named playtest scenarios** in a local, bounded catalog. Creators can save the *honor* and *silence* choices as separate reusable cases, compare each saved route against the **current authored Room Atlas**, and quickly see which regression cases need retesting after a change.

This is a story-logic test notebook, **not an Adventure Journal, browser save slot, network service or proof that the actual game has been played**.

## Where to find it

Open **PixelForge → Layer Studio → World Branch Map → Story Path Simulator → Rung 17 / Playtest Scenario Catalog**.

1. Rehearse a route with Rung 15's simulator. For example, complete the Stone Archive, explicitly assume an otherwise unverified key gate, visit the Forgotten Reliquary, select *Carry the forgotten promise*, and complete *The Kept Promise*.
2. Enter a **Scenario Name** such as \`Honor path / Kept Promise\` and optional playtest notes. Choose **Save Current Simulated Route**.
3. Undo the fork choice, select *Release the echo into silence*, and complete *The Hushed Chamber*. Save this as a second scenario named \`Silence path / Hushed Chamber\`.
4. Both entries persist locally under \`pixelforge.layer-scenario-catalog.v1.local\`. They do **not** share the \`pixelforge.layer-scene.v1.local\` working-scene key, Rung 7's Adventure Journal saves or an actual game-session key.
5. Each saved entry shows its route length, start and finish rooms, expected flags, notes, and a **fresh regression status**.
6. Choose **Load Verified Scenario** to restore a passing case into the *simulator preview only*, with all its hypothetical undo history. The application re-verifies the scenario at click time, so editing the world between seeing the status and loading it cannot grant a false pass.
7. Use **Remove** (with confirmation) to delete a named local scenario. The original authored adventure and game saves remain unaffected.

A maximum of **16 scenarios** and **900 KB** of serialized catalog data is allowed. If browser storage is disabled or full, the editor keeps scenarios in memory and warns that they will not persist; export to preserve them.

## Regression status meanings

| Status | Meaning | Can load into preview? |
| --- | --- | --- |
| **Verified** | The world topology checksum matches and Rung 16's full exact route receipt replays and verifies. | Yes |
| **Needs review** | The authored world has changed, but the same action sequence still replays to the expected final state. Review the world changes and physically retest. | No |
| **Outcome changed** | The action sequence still runs, but final flags, completed discoveries, visited rooms or assumption state changed. Expected and actual flags are shown. | No |
| **Replay blocked** | A required flag, door or decision no longer permits a previously saved action. The first blocked step is reported. | No |
| **Invalid stored receipt** | A receipt with a matching topology checksum has altered or inconsistent action/outcome data. | No |
| **No world loaded** | There is no Room Atlas to compare against. | No |

**Important:** A changed world with matching final flags is **never automatically marked Verified**. New passages, blocked side routes, story descriptions, character placement or other behavior may still need manual testing. If the stored final-room blockers differ from the new blockers, the status description explicitly mentions it.

The catalog uses Rung 16's deterministic, noncryptographic topology checksum **only to detect ordinary changes**. It is not a publisher signature, source of authenticity, anti-tamper seal or proof that a physical level has been traversed. A determined editor of both report and authored world could manufacture a self-consistent hypothetical case; "Verified" means internal consistency with the current definition and simulator.

## Portable catalog JSON

The **Export Catalog JSON** button downloads the full named collection, including versioned route receipts and notes. The JSON format has the schema \`pixelforge.layer-scenario-catalog.v1\`.

The **Merge Selected Catalog** button accepts a JSON export (maximum uploaded file size: 1 MB) and combines entries with the current local catalog:

- An identical name + identical route receipt is skipped as a duplicate.
- If imported IDs overlap existing IDs, the imported scenario receives a new unique \`scenario-N\` ID.
- A merge that would exceed 16 saved scenarios is rejected without partially updating the catalog.
- Oversized reports, unsupported schemas, duplicate IDs inside an imported catalog, excessively long names/notes and malformed receipts are rejected before saving.
- A scenario imported from another world does **not** get automatic green status. It must verify against the currently loaded world before its simulated state can be loaded.

Import and export use local browser file APIs only. Nothing is uploaded or linked to a login.

## Internal design

- \`layer-studio/story-scenario-catalog.js\`: pure catalog operations and regression review; exports \`createScenarioCatalog\`, \`validateScenarioCatalog\`, \`addScenario\`, \`removeScenario\`, \`renameScenario\`, \`mergeScenarioCatalog\`, \`reviewScenario\`, \`reviewScenarioCatalog\`, and \`loadVerifiedScenario\`.
- For a matching authored world, review calls \`verifyRouteReport\` and verifies the **complete** Rung 16 receipt.
- For a changed authored world, review replays the saved actions **only as a diagnostic**, checks for the first blocked step, compares the final simulated state and final-room blockers, and always returns a status needing human review if the topology differs. It never silently updates the old baseline or loads a stale receipt.
- \`layer-studio/studio.js\` manages the separate local-storage key, UI status/controls and explicit downloads/import. A saved catalog never becomes gameplay state.
- \`tests/layer-playtest-scenario-catalog.test.js\` joins \`npm run test:studio\` and checks the real two-route Forked Echo scenario, cross-world changes, blocked versus changed outcomes, forged flags, undo restoration, immutable catalog operations, JSON merge, bounds, legacy projects and independent storage wiring.

## Limits and next direction

This remains **hypothetical narrative regression testing**. It does not run the game; it cannot certify player movement, combat, line-of-sight, actual key/relic collection, quest eligibility or platforming. Explicit gate and NPC/boss assumptions are still labeled in the underlying route receipts. Playtest the real game before shipping.

Potential **Rung 18: Route Coverage Matrix** would summarize which rooms, decisions, world flags, and gates your saved scenarios cover, and surface uncovered alternate branches without assuming that hypothetical outcomes prove physical gameplay.
