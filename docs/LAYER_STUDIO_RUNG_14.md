# PixelForge Layer Studio — Rung 14: World Branch Map

## See where the story can go before publishing

Rung 14 adds a **read-only visual dependency map** and **static branch diagnostics** to the existing Room Atlas authoring interface. It understands the actual authored flags, choices, environmental discoveries, World Director events, boss defeats, conditional portals, and flag quest objectives from Rungs 4–13.

A new **World Branch Map** section appears just below the Room Atlas editor. It runs entirely in the browser using the current in-memory authored scene, never sending projects to a service or modifying scene JSON.

## How to use it

1. Open **Layer Studio** and create or load a Room Atlas.
2. Find **World Branch Map → Story Paths & Dependencies** beneath the Room Atlas controls.
3. See a four-column map:
   - **Authored Events:** World Director flags, story dialogue choices, boss defeat.
   - **World Flags:** global state changes and choice results.
   - **Discoveries:** World Sequence Tracks, including branching choices.
   - **Gates & Quests:** conditional portals and quest objectives.
4. Follow the connections: green for flag grants, purple for choice consequences, pale for required flags, dashed coral for exclusion flags.
5. Select a node with a click, **Tab + Enter**, or **Tab + Space**. Its directly connected nodes and edges highlight; the detail panel displays the authored source.
6. Choose **Show Branches → All Rooms / one room** to limit visual clutter. A room-scoped view still includes relevant flag producers from other rooms, so cross-room prerequisites remain visible.
7. Select a discovery and choose **Edit Selected Discovery**. The editor opens its Room Atlas track controls, including when the track lives in a different room.
8. Use **Reanalyze World** at any time, especially after editing story dialogue, director triggers or quest flags. Most Room Atlas edits automatically rerender the map.

The graph is an accessible, scrollable offline SVG. It is not a static picture. Nodes use authored text through DOM \`textContent\`; data is never inserted as HTML or evaluated as code. The graph limits itself to 180 displayed nodes at a time for performance; a room filter helps inspect larger projects. All diagnostics continue to analyze the full authored atlas, even when nodes are filtered or capped.

## Diagnostics

The pure \`analyzeWorldBranches(atlas)\` function reports:

| Finding | Meaning |
| --- | --- |
| Missing producer | A required world flag has no authored source in a Director trigger, story dialogue, boss defeat, discovery completion or choice. |
| Never-blocking guard | A negative \`unlessFlag\` refers to a flag with no authored producer, so the intended exclusion may never activate. |
| Contradictory guard | A track both requires and forbids the same flag; it cannot open under those conditions. |
| Self dependency | A discovery requires its own completion flag without another producer. |
| Dependency cycle | Multiple sequence tracks depend on flags emitted by one another. The cycle may deadlock unless an independent entry path exists. |
| Unreachable room | The editor cannot find an optimistic portal route from the start room. |
| Unreachable sequence | No optimistic path through rooms and positive flag prerequisites reaches this discovery. |

Diagnostics are **advisory** except direct logical contradictions. The reachability pass starts at the atlas's start room, follows known portal links and positive flag requirements, and uses a bounded fixed point to discover reachable room and world-flag sources. It does not claim to solve actual physical movement, player skill, inventory acquisition, arbitrary narrative intent, or every possible branch combination.

**Important exclusive-choice limit:** in a track with mutually exclusive answers, the analyzer marks both outcomes as *potentially reachable in separate runs*. It never claims the player can earn both in a single run. Similarly, a cyclical dependency with an independently reachable producer gets an advisory cycle warning but is not falsely called impossible.

Quest and portal flag consumers are included visually; quest inventory, relic, and visit objective logic continue to use their existing runtime contract. The analyzer is deliberately separate from runtime quest resolution and does not become a second gameplay authority.

## Example: The Forked Echo

In the bundled two-room adventure, the graph shows how:

- Completing **The Stone Archive** grants \`archive-revealed\`.
- That flag unlocks the **Forked Echo** in Forgotten Reliquary.
- **Carry the forgotten promise** grants \`echo-honored\`; **Release the echo into silence** grants \`echo-silenced\`.
- Those flags unlock distinct follow-up tracks, while opposite flags block the other follow-up.

The bundled example currently has **2 rooms, 4 World Sequence Tracks, 10 flags and 16 connections**. The sample has no static dependency warnings. This does **not** establish that every on-screen route has passed manual playtesting.

## Architecture and compatibility

- \`layer-studio/world-branch-map.js\`: pure static analysis. Returns nodes, typed edges, diagnostic findings, summary counts and optimistic reachability data.
- \`layer-studio/world-branch-view.js\`: accessible SVG rendering, room filtering, node selection and edge emphasis. Uses native browser DOM/SVG primitives only.
- \`layer-studio/studio.js\`: read-only projection of in-memory active room data, map refresh, diagnostics, and click-to-edit navigation.
- \`layer-studio/index.html\` and \`studio.css\`: scrollable map panel, legend, room filter, diagnostic list and selected-node inspector.
- \`tests/layer-world-branch-map.test.js\`: required regression coverage of graph edges, both forks, cycles, unknown flags, impossible guards, room reachability, legacy analysis, safe SVG rendering and UI wiring.

No changes to \`pixelforge.layer-scene.v1\`, \`pixelforge.layer-atlas.v1\`, \`pixelforge.layer-world-sequences.v1\`, \`pixelforge.layer-boss.v1\`, or \`pixelforge.layer-save.v1\`. No new saves, flags, rewards, editor exports or runtime behavior are introduced. Old adventures can load without a branch graph because it is computed on demand from their current authored data.

## Testing

\`\`\`bash
npm run test:studio
\`\`\`

This adds the graph tests to PixelForge's existing mandatory Studio preflight. GitHub CI also verifies the Pages build, SPARK runtime bridge and pinned Framefield contract. Real browser, mobile and keyboard screen-reader acceptance remains a separate manual test, especially for scroll navigation in very large atlases.

## Next horizon

Potential Rung 15: **Story Path Simulator**, where creators can step through a hypothetical route and see which branches appear under one specific set of earned choices. This would complement the optimistic static map without changing the actual game runtime.
