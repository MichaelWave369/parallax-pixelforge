# PixelForge Layer Studio — Rung 08: Living Story Events

## Build adventures that answer the player's decisions

Rung 8 adds three **authorable, deterministic, local-only** story constructs to each existing Room Atlas room. The outer Layer Scene v1 and Atlas v1 contracts are preserved. Old rooms with no story payload retain their exact gameplay/data shape.

| Construct | New capability | Bounded contract |
| --- | --- | --- |
| Dialogue zone | Interact with a speaker; choose a reply that can set an authored global world flag | 12 zones/room, up to 3 choices per zone |
| Conditional scenery rule | Hide or reveal an existing Layer Studio depth plane in response to a world flag | 24 rules/room |
| Encounter activation zone | Wake an already-authored Stonebridge enemy when the player enters its area, optionally requiring a world flag | 12 zones/room |

No untrusted JavaScript or scripts. No network, teleports, arbitrary triggers or new combat engine.

## Authoring in Layer Studio

First create or load a Room Atlas.

### Dialogue and player decisions
Find **Room Atlas → Living Story Events**. Select **+ Dialogue** and set speaker, text, world rectangle and optional required world flag. Choose if the dialogue fires only once; supply up to two labeled choices through the editor (the normalized data format supports up to three, for future authoring tools). A choice can set a validated, persistent world flag. A blank choice flag is allowed.

In play mode, move near the dialogue zone and press **E**, **Xbox X**, or the touchscreen **Enter** action. A readable panel opens and **pauses gameplay**. Clicking a choice sets only that choice's authored flag. Closing the panel without choosing does not award flags or mark the dialogue complete. Dialogue text is inserted through safe DOM text, not HTML.

### Changing scenery
Choose **+ Scenery rule**, select an existing layer, then choose a world flag and a behavior:
- **Reveal after flag**: hide the layer until its flag is active.
- **Hide after flag**: keep the layer visible until its flag is active, then hide it.

Use **Preview flag** in the editor to inspect before/after without cheating by changing saved player progress. This changes **visual opacity only**, never solid tile collision or puzzle platforms. The original authored scene layers are not mutated by the runtime.

### Guardian encounters
Choose **+ Encounter**, select an existing puzzle enemy and author its activation zone plus optional required flag. Until the encounter is activated, that enemy is dormant: it does not render, damage the player, block movement or take projectile hits. When the player enters a matching encounter zone, the existing enemy wakes. The encounter activation is recorded once per room and survives backtracking and saves. **No extra enemies are spawned**; the feature reuses the existing Stonebridge enemies and combat.

If the enemy reference is absent, the encounter fails closed and does not pretend to be completed.

## The Echo Keeper: bundled two-room example

Create the starter Room Atlas and travel to **The Forgotten Reliquary**.

The **Echo Keeper** asks whether to restore the old lanterns or preserve the chamber's silence.

- **Rekindle the lanterns** activates \`reliquary-lit\`, reveals the arches depth layer, and enables a nearby **Hall Guardian** encounter. The guardian awakens only after entering its zone.
- **Leave the chamber silent** activates \`reliquary-silent\`. The arches stay hidden and the flagged Hall Guardian remains dormant.

The original **Reliquary Oath** quest, world-flag zone, relics, checkpoint, and return passage remain functional.

This example demonstrates mutually exclusive once-only choices. A separately authored dialogue marked repeatable may be visited again; there is no universal branching dialogue graph or cutscene timeline yet.

## State and save handling

- Additive \`story\` on individual atlas rooms uses \`pixelforge.layer-story.v1\`. Pre-Rung-8 rooms omit the property altogether.
- Dialogue choices add allowed authored flag IDs to \`knownWorldFlags\`. Invalid flag names cannot enter world state.
- Existing \`snapshotRoom\` now includes optional \`storySeen\` for rooms with Living Story content. The Rung 6 \`pixelforge.layer-save.v1\` slots carry these receipts and strictly validate each against authored dialogue and encounter IDs.
- Save restoration reapplies *dormant versus awakened* enemy behavior using validated event receipts. Only flags granted by authored triggers or choices can be restored.
- Authored world edits may change the world fingerprint and intentionally separate save slots. Existing authored worlds without Rung 8 story remain backwards-compatible and do not gain phantom story fields.

## Safety and limits

Input is limited to bounded plain text, finite world-space coordinates, validated flag IDs, local enemy IDs and layer IDs. Imported dialogue metadata cannot evaluate code, load remote images, or attach event handlers. Rendering is Canvas 2D and browser DOM. No enemy AI behaviors, item consumption, NPC schedules, dialogue audio, complex cutscene authoring, shadow mapping or 3D physics are included.

The in-game dialogue uses current touch/keyboard/gamepad interaction for opening. Selecting a dialogue **choice** currently requires a click/tap; controller-only menu selection remains future work. Browser and headset manual tests are separate from automated CI.

## Regression checks

\`tests/layer-living-story.test.js\` joins mandatory \`npm run test:studio\`, covering:

- Starter story normalization, chosen flags and quest integration.
- Choice validation and once-only dialogue completion.
- Dynamic visual variants without mutating source layers.
- Dormant/woken enemy behavior; gated guardian activation; missing enemy fail-closed.
- Save, reload and backtracking including validated story completion.
- Invalid metadata size, type and ID bounds and legacy scene compatibility.
- Editor, prompt and modal control hookups.

\`\`\`sh
npm run test:studio
\`\`\`

Possible Rung 9: encounter timelines, authored boss introductions and reusable character portrait/dialogue layouts, with deterministic progression and the same local-first data contracts.
