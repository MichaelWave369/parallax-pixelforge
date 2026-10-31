# PixelForge Layer Studio — Rung 20: Scenario Recommendations & Minimum Coverage Set

## Keep fewer hypothetical regression cases without losing any existing verified narrative coverage

By Rung 19, PixelForge can author branching adventures, record and verify hypothetical route receipts, store scenario catalogs, inspect coverage gaps, and plan new tests. Rung 20 answers two practical follow-up questions:

1. **Which smallest subset of our *currently verified* saved scenarios covers every narrative target already covered by the whole catalog?**
2. **Which uncovered or review-needed authored target should we explore next?**

This is an editor-side, read-only analysis of hypothetical narrative coverage. It does not run actual gameplay, mutate the authored Room Atlas, modify Adventure Journal saves, delete scenarios, or make a promise that a recommended target is physically reachable in-game.

## Use the new panel

Navigate to **PixelForge → Layer Studio → World Branch Map → Route Coverage Matrix → Coverage-Guided Scenario Builder → Rung 20 / Scenario Recommendations**.

The panel contains **Smallest Useful Scenario Suite**:

- The **exact minimum** number of verified hypothetical scenarios required to preserve **all targets already marked verified** by Rung 18.
- A **Keep** list with each selected scenario, its existing route-step count and count of individually unique authored targets.
- An **Overlap** designation for extra verified scenarios whose target coverage is fully preserved by the chosen minimum set. These remain saved; none are removed or altered.
- A **Not Verified** designation for scenarios marked needs-review, outcome-changed, blocked, invalid, or no-world. They cannot contribute to the minimum verified set.
- Counts of verified targets preserved, overlapping scenarios, not-verified scenarios, still-uncovered targets and targets requiring review.

The parallel **Recommended Next Branches** section prioritizes missing authored choice outcomes, discoveries, portal traversals, flags, rooms and event assumptions, with concise explanations. For example, after saving only the Honor path, **Release the echo into silence** is a high-priority missing choice. Selecting **Plan This Route** opens the existing Rung 19 planner for that target and searches from the **current simulator state**.

A new test is not saved automatically. Authors still deliberately confirm each Rung 19 hypothetical action, then use Rung 17 **Save Current Simulated Route**. Only a verified receipt can increase the matrix's green hypothetical coverage.

Use **Export Recommendation JSON** to obtain a deterministic local snapshot of the minimum suite, each saved scenario's status, and the top recommended gaps. The export does not delete or replace the catalog.

## Why this is an exact minimum, not a greedy guess

Rung 17's catalog is capped at **16** scenario entries. Rung 20 uses that constraint to search **all subsets of the currently verified cases** (at most 65,536 combinations), then selects the subset that covers every currently verified authored target with the **fewest scenarios**.

When several equal-size combinations preserve identical coverage, it prefers the one with the fewest total hypothetical route steps. Stable existing catalog order breaks any remaining ties.

This **does not** claim to produce the smallest set of future tests needed for all authored routes. The minimum only preserves *already achieved* verified hypothetical coverage. A two-scenario suite that covers 15 of 24 authored targets still leaves **9 authored targets uncovered**, even if it is an exact minimum for those 15. Nor does fewer saved scenarios imply fewer real gameplay bugs.

### Why redundant tests are not automatically deleted

Two independently authored routes might cover identical narrative flags but explore different physical gameplay timing or geometry, which the narrative simulator cannot inspect. They may also have useful exploratory value. Rung 20 only **labels overlap**, leaving every saved case and all game data untouched.

A scenario with no individually unique targets can nevertheless be part of the exact minimum because its combination with other scenarios may be smaller than alternative combinations. The UI separately shows a scenario's **unique-target count** and whether it was **selected** for the minimum set.

## Recommendations and route planning

The suggestion list uses a transparent **priority heuristic** on targets with no verified scenario or stale historical evidence:

- Prioritize individual **choice outcomes** first, so the opposite answer to a once-only narrative fork cannot be hidden behind broad room-level coverage.
- Then discoveries, portal passages, world flags, rooms, and authored event assumptions.
- Within the same category, prefer currently uncovered targets over targets requiring review, with a small preference for rooms containing more uncovered authored work.
- Explanations describe *why* the specific target lacks evidence. They do **not** assert that a new test automatically covers several adjacent targets.
- The action **Plan This Route** connects to Rung 19's bounded simulator-backed search, including explicit key/relic/quest or NPC/boss assumptions. It may return a valid planned path, a no-route result, or a search-limit result. Rung 20 itself performs no implicit simulation or background work.

The suggestion list displays up to 8 targets in the editor. Its pure API supports a bounded maximum of 24, without fabricating new world actions.

## Forked Echo example

On the bundled starter Room Atlas:

- **No saved scenarios:** The minimum selection contains **zero** cases, because **no targets have verified coverage**. The Silence and Honor choices appear as candidates for new tests.
- **Saved Honor only:** The minimal selection keeps the Honor scenario. Silence remains a suggested missing individual choice.
- **Saved Honor and Silence:** Both scenarios are necessary to preserve the respective exclusive authored choice outcomes.
- **Saved Honor twice and Silence once:** One duplicate Honor scenario is marked **Overlap**; the exact minimum still includes the other Honor case and the Silence case. All three catalog entries remain unchanged.
- **Edited Reliquary story:** Old scenarios that no longer verify are excluded, rather than silently counted as green, and their prior coverage is marked for review.

## Implementation

- **\`layer-studio/story-scenario-recommendations.js\`**: pure minimum-cardinality exact set solver, covered-target provenance, unique-target counts, stale exclusion, prioritized target suggestions, and versioned export data \`pixelforge.layer-scenario-recommendations.v1\`. Uses Rung 18's verified per-scenario coverage cells; no separate inference of earned flags or new runtime actions.
- **\`layer-studio/studio.js\`**: reactive summary and two panels, visible Keep/Overlap/Not Verified statuses, local JSON export, and explicit navigation to Rung 19's existing planner.
- **\`layer-studio/index.html\`, \`studio.css\`**: accessible buttons, semantic headings, responsive text-only lists and status messages.
- **\`tests/layer-scenario-recommendations.test.js\`**: mandatory under \`npm run test:studio\`; tests exact minimum vs greedy counterexamples, tie-breaks, exclusive branches, duplicate receipts, stale/mismatched world exclusion, ranking/filter bounds, immutability and editor wiring.

No new persistence key, schema migration, gameplay code, network service, external dependency or asset requirement.

## Important limitations

**Verified here means internally replayed *hypothetical* narrative actions.** It is not a real gameplay completion receipt, proof of platforming, combat, inventory collection, actual trigger collision, quest completion or physical accessibility. The set solver gives an exact answer to a narrowly defined *coverage-preservation problem*, not certification of release readiness.

The recommendation ranking is heuristic; search for an actual hypothetically valid path with Rung 19, then physically test the game before shipping. Different real-world gameplay bugs may require keeping overlapping scenarios.

## Next horizon

Potential Rung 21: **Authoring Test Missions**, allowing creators to group hypothetical scenario coverage goals into named release checklists and track which goals are untested, reviewed, or pending physical playtesting, while still keeping actual gameplay verification separate.
