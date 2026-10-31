# PixelForge Layer Studio — Rung 15: Story Path Simulator

## Test one specific story route, without playing or changing the world

Rung 14's World Branch Map analyzes which outcomes **might** be possible in a world. Rung 15 adds a **reversible, hypothetical route simulator** inside the same editor so authors can test a particular sequence of choices. Instead of highlighting all branches as potentially reachable, it shows precisely which flags have been earned in this simulated run and which discoveries are currently ready.

The simulator is a pure, local JavaScript state machine. It does **not** open the game's actual save slots, mutate Room Atlas authoring data, run world physics, complete quests on behalf of the player, or contact any service.

## What to do

1. Open **Layer Studio → World Branch Map → Rung 15 / Story Path Simulator**.
2. Begin at your authored start room with no world flags. A new editor session or **Reset Simulation** starts the simulation again from this state.
3. Under **Discoveries & Decisions**, choose a ready World Sequence. For an authored branching track, pick exactly one of its displayed answers. Unavailable tracks show their unmet prerequisites or blocking flags.
4. Under **Current Room & Authored Events**, you may explicitly **assume** a World Director flag trigger, an authored dialogue choice, or a boss defeat. Each grants only the authored world flag for that source; it does not run the corresponding gameplay.
5. Under **Room Travel**, select a linked portal to move between authored rooms. The simulator always enforces known required **world flags**. By default, doors requiring a key, relic, or quest are blocked, since those checks are not simulated. The checkbox **Assume key, relic & quest portal checks passed** explicitly overrides only those non-flag conditions so you can explore later narrative routes.
6. See **Earned Simulated World Flags** and the **Decision History**. The Branch Map highlights your earned flags, ready discoveries in the current room, and previously completed once-only tracks.
7. Use **Undo Last Step** to reverse exactly one simulated choice, travel or assumption. Use **Reset Simulation** to begin again.

If you change the authored story topology while simulating (including track requirements, choices, world-flag sources, portal links or room identities), the sandbox resets rather than silently applying an old decision to a changed world. Editing unrelated visual artwork does not reset the simulator.

## Starter example: The Forked Echo

The bundled two-room starter adventure now supports this concrete dry run:

1. In Lantern Vault, click **Discover: The Stone Archive**. Your simulated flag set gains \`archive-revealed\`.
2. The portal to Forgotten Reliquary requires a **key**, which this simulator does not collect. Check the explicit assumption for non-flag gate requirements to traverse it.
3. In Reliquary, **The Forked Echo** becomes ready because \`archive-revealed\` is present. Choose **Carry the forgotten promise**, earning \`echo-honored\`, or **Release the echo into silence**, earning \`echo-silenced\`.
4. Only **The Kept Promise** or **The Hushed Chamber** becomes available, according to the chosen outcome. The other track reports the missing/forbidden branch flag. The original fork stays complete because it is once-only.
5. Undo the fork decision, choose the opposite answer, and compare the newly available path. This changes only the preview.

The existing global world-flag system and local saves are entirely untouched by the preview.

## Behavior and guardrails

- **Actions:** \`discover\`, \`source\`, \`travel\`, \`assumeGates\`, \`undo\`, \`reset\`. Each action is validated against the actual authored atlas and current simulated room. Invalid actions return a failure without changing the state.
- **Choices:** A branching discovery demands a valid, authored \`choiceId\`. Unknown, missing and invented answers fail closed. Once-only tracks cannot be replayed. Repeatable tracks can intentionally grant additional authored outcomes if the creator allowed repeat visits.
- **Room travel:** Only linked portal destinations are valid. World-flag prerequisites always apply, even if the non-flag-assumption checkbox is active. Keys, relics and quest requirements stay explicitly unverified and blocked by default.
- **Source events:** Optional *assume trigger / assume dialogue / assume boss defeated* operations use only defined flag producers in the currently simulated room. Once-only story dialogue responses are exclusive in the hypothetical run. These are planning actions, **not evidence** that a player can reach a trigger or win a boss fight.
- **History:** Each step stores a bounded, reversible in-memory snapshot. A maximum of **64** steps prevents unbounded state growth. Reset starts a new empty run; undo restores the previous room, flags, completed tracks, source receipts, visited rooms and assumptions.
- **Pure data:** \`layer-studio/story-path-simulator.js\` has no browser storage, network requests, runtime imports, document APIs, or arbitrary script execution. The editor builds buttons and labels with DOM \`textContent\`. No new scene, atlas, world-flag or save schema is introduced.

## Map integration

The existing four-column Branch Map stays unchanged as an authoring dependency reference. The simulator adds **live highlights**:

- **Earned** persistent world flags for the selected hypothetical route.
- **Ready** discoveries in the current simulated room.
- **Completed** once-only discoveries in the simulation.
- A highlighted current room context.

The map's underlying optimistic reachability is still a static analysis. These two views answer different questions: *Could this route work in some authored scenario?* versus *What would unlock after the specific actions I just tried?*

## Known limitations

This is a narrative-logic dry run, not full game execution. It does not simulate keyboard movement, jump accuracy, actual collisions, enemy combat, stone-ray damage, real inventory, key collection, NPC encounter timing or quest-completion side effects. Triggering a dialogue or defeating a boss is an explicit **assumption**.

Because story geometry and animation are not checked, a path that looks available in the sandbox still needs physical gameplay testing before release. Similarly, a feature relying on real game-world conditions outside authored flags can only be approximated, not proven.

## Verification

\`tests/layer-story-path-simulator.test.js\` joins the required \`npm run test:studio\` gate. Tests include the real Forked Echo decision tree, both exclusive outcomes, blocked travel and explicit gate assumptions, invalid source and choice IDs, exact undo/reset, boss and NPC source assumptions, bounded history, standalone/legacy scene behavior, save isolation, and SVG state highlighting.

Full GitHub Actions also runs the Pages build, SPARK external runtime bridge, and Framefield pinned integration contract.

## Next exploration

Possible Rung 16: **Branch Route Reports**, exporting a reproducible local text/JSON receipt of a *hypothetical* route for playtesters. This would stay separate from real Adventure Journal saves.
