# PixelForge Layer Studio — Rung 19: Coverage-Guided Scenario Builder

## From an untested story branch to a reproducible hypothetical test

Rung 18 identifies untested rooms, discoveries, branching decisions, world flags, portal passages and authored events. Rung 19 makes those gaps actionable: select a target in the coverage matrix, ask PixelForge to **find a short valid sequence of authored simulator actions**, and apply each proposed step deliberately to the existing Rung 15 hypothetical preview.

The planner does **not** make new world flags appear, teleport players, grant actual inventory, run combat, or overwrite Adventure Journal saves. It delegates all action validation to Rung 15's existing \`advanceStoryPath\` and \`storyPathOptions\` rules and displays explicit assumption steps whenever a gate or authored event cannot be proven by narrative state alone.

## Author workflow

1. Open **Layer Studio → World Branch Map → Route Coverage Matrix**.
2. Look for a **No route case** or **Retest required** target and click its **Plan Route** button, or scroll down to **Rung 19 / Coverage-Guided Scenario Builder** and select a target.
3. Press **Find Valid Route**. From the **current simulator state**, the planner explores legal authored actions until it finds a short hypothetical sequence that explicitly exercises that target, or reaches its bounded search limit.
4. Review the ordered steps. The list names each discovery, exact choice, portal or assumed event, with source and destination rooms. **ASSUMPTION, NOT GAMEPLAY EVIDENCE** appears beside NPC/boss/Director flag assumptions and non-flag portal checks.
5. Press **Apply Next Suggested Step** once for each step. The editor revalidates the action against the current authored atlas **at the instant of the click**, applies it solely to the hypothetical simulator and refreshes the Story Path/Branch Map/Coverage UI.
6. After the final step, **Save Current Simulated Route** in Rung 17's Playtest Scenario Catalog. Only after this named route receipt is stored and fully verified against the current authored world can it count toward Rung 18's verified *hypothetical* coverage.

The planner never saves anything on its own, never automatically completes the entire route, and never silently resets a committed once-only choice. If the current simulated run already chose Honor at the Forked Echo, the opposite Silence choice may require **Reset Simulation** or an explicit **Undo Last Step** before planning that alternative.

If the author changes the world or uses the simulator controls outside the guided flow, the pending plan is invalidated. A plan for an absent/renamed target is also discarded. This prevents stale steps from carrying forward after unrelated author actions.

## What it can plan

The pure module \`layer-studio/story-coverage-guide.js\` uses bounded breadth-first search over actual Rung 15 state transitions:

- **Discovery**: finish an available authored World Sequence Track. A branching track requires one specific, authored \`choiceId\`.
- **Portal travel**: use a linked portal whose world-flag and other requirements are satisfied under current simulator settings.
- **Authored source assumption**: explicitly assume a World Director flag trigger, NPC dialogue choice or boss defeat *only when Rung 15 currently offers that event*. It never executes combat, NPC dialogue or triggers.
- **Non-flag gate assumption**: explicitly enable the existing Rung 15 **Assume key/relic/quest checks passed** setting when otherwise required to explore later story paths. It cannot bypass a required world flag.
- **Undo / reset** are **not** automatically inserted into a route. These remain separate, visible user actions in Rung 15.

The search is limited to **1,400 explored states**, a maximum **16 suggested steps**, and the remaining Rung 15 64-step history budget. It deduplicates equivalent current states and never performs network requests. If a route is not found within these bounds, the UI says so; it does **not** claim that the authored route is logically impossible or physically inaccessible. The existing Rung 14 diagnostics are still the place to examine suspected broken story prerequisites.

## Example: the Forked Echo

From a fresh start room, planning **Carry the forgotten promise** in Forgotten Reliquary produces the following valid hypothetical steps:

1. **Discover: The Stone Archive** to earn \`archive-revealed\`.
2. **Assume key/relic/quest checks passed**, an explicit user-confirmed non-flag gate assumption.
3. **Travel: Lantern Vault → Forgotten Reliquary** through the authored portal, which remains flagged as relying on an unverified key check.
4. **Discover: The Forked Echo / Carry the forgotten promise**, yielding \`fork-decided\` and \`echo-honored\`.

Planning the **The Kept Promise** follow-up adds a fifth discovery step. The **Release the echo into silence** alternative is separately plannable from a fresh preview, but cannot be silently appended to a once-only Honor run.

Selecting an authored flag target such as \`promise-kept\` plans the relevant discovery, *not* a direct world-flag injection. Selecting a portal target requires an explicit travel action, not merely unlocking its door.

## Coverage semantics and safety

Rung 19 is a **hypothetical narrative test authoring assistant**, not a playthrough bot or gameplay test executor. The distinction is essential:

- **Plan found** means valid Rung 15 *hypothetical transitions* could be chained from the current preview, and each step remains individually confirmed by the user.
- **Already covered** means this target has already been exercised in the current hypothetical preview, not necessarily recorded as a saved scenario.
- **No route found** or **search limited** means the planner found no sequence under the current choices, limits and authoring state. It does not prove unreachable geography or impossible gameplay.
- **Verified coverage** is still determined only by Rung 16's receipt verification and Rung 18's catalog matrix. Rung 19 planning by itself contributes **zero** verified scenario coverage.
- **Key, relic, quest, NPC, Director and boss assumptions** remain *unverified actions* in the simulator and the exported scenario receipts. They cannot certify real-world navigation, collisions, combat, inventory or quest progress.

No new saves, user accounts, remote dependencies, UI scripts in authored story data, scene schema revisions or runtime gameplay changes.

## Implementation and tests

- \`layer-studio/story-coverage-guide.js\`: pure search/validation module with \`planCoverageRoute\`, \`guidedCoverageTargets\`, and \`guideStateFingerprint\`. Returns a versioned planning result \`pixelforge.layer-coverage-guide.v1\`.
- \`layer-studio/studio.js\`: target selection from coverage gaps, direct **Plan Route** from matrix cells, explicit **Find Valid Route** and **Apply Next Suggested Step**, safe plan invalidation on world/preview changes, and accessible text-only step labels.
- \`layer-studio/index.html\` and \`studio.css\`: accessible controls, route status, assumption warnings and compact step list.
- \`tests/layer-coverage-guided-builder.test.js\`: mandatory in \`npm run test:studio\`; covers the real Forked Echo branches, explicit gate/event assumptions, missing producers, bounded search, undo, already exercised targets, world/preview immutability, legacy data, and UI wiring.

## Next horizon

Potential Rung 20: **Scenario Recommendations & Minimal Coverage Set**. Compare the available hypothetical scenarios, suggest the smallest useful group covering diverse story branches, and make gaps visible without mistaking a simulated receipt for actual gameplay success.
