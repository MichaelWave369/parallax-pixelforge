# PixelForge Layer Studio — Rung 18: Route Coverage Matrix

## Which story paths have our saved scenarios actually exercised?

The Rung 17 Playtest Scenario Catalog already stores reproducible hypothetical routes. Rung 18 translates those saved receipts into a **coverage matrix**, so an author can answer concrete questions: Which rooms have been visited in a scenario? Which authored discoveries were completed? Have both answers to a branching decision been simulated separately? Which world flags were actually earned? Were portals traversed or merely unlocked? Which authored event sources were explicitly assumed?

The matrix is computed **locally, on demand**, from the currently authored Room Atlas and its saved scenarios. It does not write or alter the scene, gameplay runtime, or Adventure Journal saves. It does not create a new story schema.

## Use it

1. Open **Layer Studio → World Branch Map → Playtest Scenario Catalog → Rung 18 / Route Coverage Matrix**.
2. Create/save an authored hypothetical scenario in Rung 17, or import a scenario catalog.
3. The coverage summary shows how many **authored targets** have evidence from scenarios whose *complete Rung 16 route receipts verify against the current authored world*. It also counts targets that **need review** and targets that have **no scenario evidence**.
4. Browse the scrollable comparison: each authored target appears as a row, each saved scenario appears as a column. A cell indicates:
   - **✓ Hyp.**: this scenario replayed a corresponding action or earned flag, and its full hypothetical route receipt verified against the current story definition.
   - **Review**: an old scenario references this target but no longer fully verifies against the current story definition. This **never** counts as verified coverage.
   - **·**: no relevant evidence in that scenario.
   - **\***: the row's evidence used an explicitly assumed event source or unverified key/relic/quest gate.
5. Use **Show Targets** to filter Rooms, Discoveries, Choice Outcomes, World Flags, Portal Passages, or Authored Events. Use **Coverage State** to focus on Uncovered or Needs Review.
6. Where a target has a corresponding node on the World Branch Map, the **Locate** action highlights it on the authoring graph.
7. Choose **Export Coverage JSON** to download the full current computed matrix, including its scenario statuses and caution text. This is a local browser download, never a service upload.

The visible table caps itself at **180 matching rows** for responsiveness; filters let you inspect other rows. The analysis and downloadable JSON still cover every authored target, including those not currently shown.

## Counting rules

The coverage engine enumerates targets from the *current* Room Atlas:

| Dimension | When covered by a verified hypothetical scenario |
| --- | --- |
| **Rooms** | The route starts there or explicitly travels into that room. A discovered flag alone does not count as room travel. |
| **Discoveries** | A corresponding \`discover\` action was completed in that room. |
| **Choice outcomes** | A \`discover\` action named that exact track and **authored choice ID**. A single once-only fork choice does not cover its alternative. |
| **World flags** | The route's recorded step-by-step newly earned flags include the flag. Having a flag producer authored in the world is **not** evidence it was earned. |
| **Portal passages** | The route includes an explicit travel action through that particular portal from that source room. Merely unlocking the door does not count. An unverified key/relic/quest assumption gets a \`*\` marker. |
| **Authored events** | The route explicitly assumed a World Director flag trigger, NPC dialogue response, or boss defeat. All source assumptions are labeled as hypothetical, never actual combat or NPC playtests. |

World-flag targets are enumerated using the existing Rung 14 Branch Map graph, including produced and consumed flag identifiers. Unique encoded node identifiers avoid collisions for room/track/choice IDs containing separators.

The **overall coverage percentage** is the number of authoring targets with at least one fully **verified** hypothetical scenario divided by the number of enumerated targets. All dimensions are listed separately so the overall figure cannot hide an untested branch behind a successful room visit.

## Regression treatment

- **Verified scenario**: actions and recorded effects are consistent with the current authored world and Rung 16's receipt verification. Its matching matrix cells count toward verified hypothetical coverage.
- **Needs-review, outcome-changed or blocked scenario**: any *historical* action evidence is labeled **Review**, never green. A blocked scenario gets at most historical evidence from steps **before** the first step that no longer replays; subsequent actions cannot count even as historical coverage of the current route.
- **Invalid or no-world scenario**: contributes no evidence. Invalid or tampered receipts cannot inflate coverage.
- **Mixed scenarios**: an old scenario can show Review in a cell while a separately verified current scenario shows ✓ Hyp. in a different column. The row counts as covered only because of that current verified receipt.
- **Untested target**: if no verified or relevant historical report references the target, the row remains **Uncovered**. This is not equivalent to saying the target is unreachable; the Rung 14 graph provides independent reachability diagnostics.

This report is intentionally **not a combinatorial test suite generator**. Two scenarios covering both answers to a decision establish that both outcomes have been hypothetically explored *separately*, not that both can occur in one playthrough. It also does not infer coverage just because a branch was available but never actually selected.

## Bundled Forked Echo example

With only an **Honor** scenario saved:
- **The Stone Archive**, **Forked Echo**, **Carry the forgotten promise**, **The Kept Promise**, \`echo-honored\`, and the passage into Forgotten Reliquary have corresponding hypothetical route evidence.
- **Release the echo into silence** and **The Hushed Chamber** remain **Uncovered**, as do any other unexercised event assumptions.
- Saving a separate **Silence** scenario causes the second choice and follow-up discovery to gain verified hypothetical coverage. The individual scenario columns still show which run exercised which outcome.

If the world changes, saved old scenarios become pending-review rows rather than being treated as proven current coverage.

## Implementation and compatibility

- \`layer-studio/story-route-coverage.js\`: pure, read-only report generation, stable authored target IDs, per-scenario evidence, six category summaries, and filter helper. Versioned report marker: \`pixelforge.layer-route-coverage.v1\`.
- \`layer-studio/studio.js\`: live table rendering from the current authored atlas and locally saved scenario catalog; sticky row/column labels; type/status filters; local JSON export and map-node location.
- \`layer-studio/index.html\` and \`studio.css\`: accessible table with text labels, readable status cells, desktop/mobile scrolling and reduced-motion-compatible interactions.
- \`tests/layer-route-coverage-matrix.test.js\`: required \`npm run test:studio\` regressions covering both branches, earned versus merely authored flags, visited versus gated portals, explicit source assumptions, stale/blocked/invalid report treatment, undo, null/legacy behavior and UI wiring.

There is **no additional storage key**, no new gameplay action, and no change to existing scene, Room Atlas, World Sequence, Adventure Journal save, route receipt, or scenario catalog schema.

## Limits

Coverage means **internally verified hypothetical narrative replay**, not physical playtesting. It cannot establish that the player reached a platform, defeated a boss, collided with a trigger, found a key or relic, completed real quest requirements, or finished the game. The matrix's statistics must never be described as actual game test coverage.

Potential next rung: **Coverage-Guided Scenario Builder**, which suggests untested choices and routes from this matrix and helps authors construct their next **hypothetical** test without allowing invalid transitions or inventing game-world state.
