# PixelForge Layer Studio — Rung 07: Quests & World State

## A castle that remembers what you did

Rung 7 expands the existing local-only Room Atlas / Adventure Journal system with **declarative quests**, persistent **global world flags**, and **flag/quest-gated doors**. A player can retrieve a relic in one room, discover another, activate a marked area, and unlock a separate passage by completing these conditions.

No author-supplied scripts run. There is no network access, server-side quest authority, cloud save, dynamic code evaluation, or URL-based event action.

## Authoring workflow

### 1. Create world-state triggers

In **Layer Studio → World Director**, select **+ World flag zone**. Set its world-space X/Y/width/height, **World flag ID** (lowercase letters/digits, hyphens, underscores, and colons; 64-character maximum), and an optional entrance message. The new trigger kind is \`flag\`, alongside existing \`message\` and \`checkpoint\` kinds. A flag fires once for the player's world session and stays set after backtracking.

A world flag is a semantic event, not a scripting callback. It never changes arbitrary objects or executes code.

### 2. Define a quest

In **Room Atlas → Quests & World State**, select **+ Quest**, supply title and description, and add up to six objectives per quest. Objectives have exactly one of three types:

- **Collect relic:** reference a specific \`room-id:relic-id\` collectible from Rung 6.
- **Visit room:** reference a Room Atlas chamber's stable ID.
- **Activate world flag:** reference a flag ID published by a World Director \`flag\` trigger.

Up to 12 quests per atlas are supported. A quest completes when *all* its objectives are satisfied. An empty quest cannot complete, and unknown/invalid objective kinds cannot complete. Progress is derived from existing inventory, visited rooms and global flag state. It does not rely on manual quest acceptance or allow imported content to claim that a goal was achieved.

### 3. Attach conditions to doors

Each Room Atlas doorway can already require its room key or a specific relic. Rung 7 adds **Required World Flag** and **Required Quest** dropdowns. Conditions combine with logical **AND**: all configured requirements must be satisfied before the doorway opens. Unknown flags/quests **fail closed**. The player is told whether an unfulfilled gate requires a flag or quest.

Removing an authored quest through the editor clears doorway references to that quest. Existing doors without new conditions continue to work as before.

### 4. Play the Reliquary Oath

Create a fresh two-room adventure in Layer Studio. The starter story now contains:

**The Reliquary Oath**: recover the Lantern Shard in Lantern Vault; enter the Forgotten Reliquary; approach the Reliquary's marked area to activate \`reliquary-awakened\`. This demonstrates persistent cross-room progression with no custom code. You can add your own quest/flag-gated doors in the Room Atlas editor.

Press **Q** (or **Quests**) in Play Mode to see current objectives, progress, completion status and activated world flags. The existing **M** world map shows quest/flag-gated passages, while **I** inventory and **J** manual saves continue to work. Gameplay pauses when the Quest Journal is open, as with other journal panels.

## File contracts and persistence

- \`pixelforge.layer-scene.v1\`: unchanged outer scene envelope.
- \`pixelforge.layer-atlas.v1\`: additive \`quests: []\` list, with bounded data-only objectives.
- \`pixelforge.layer-director.v1\`: additive \`flag\` trigger type and optional \`flagId\`.
- Door metadata: additive \`requiresFlag\` and \`requiresQuest\` fields.
- \`pixelforge.layer-save.v1\`: additive \`worldFlags: []\` record field. Stored flags are filtered against known trigger IDs when loading. Quest completion is recalculated after restoring inventory, flags and visited rooms. **Saved arbitrary \`completedQuests\` arrays are never trusted**.

The session-wide flag set and quest completion remain active across room travel and ordinary death/respawn. The three existing explicit local save slots retain them across browser restarts. A changed authored world changes its save fingerprint and therefore has independent slots. Existing old saves for unchanged worlds lacking these additive features remain safe to parse.

## Limits and risks

- Up to six rooms, eight portals per room, eight relics per room, 32 Director triggers per room, 12 quests, six objectives each.
- Only monotonic world flags (off → on), not mutable state machines, inventory consumption or branching dialogue choices.
- Quest objectives currently combine with AND only. No timed missions, negative conditions, ordered quest steps, NPC dialogue trees, or multi-stage boss scripting.
- The map remains a read-only discovered-room graph. There is no free teleportation.
- Browser storage can be cleared or disabled. Save slots remain local to their browser origin; they are not backed up automatically. Export the authored Layer Scene JSON separately.
- Automated and synthetic tests do not establish manual physical browser, keyboard, touch, or controller acceptance.

## Validation

\`tests/layer-quests-world-state.test.js\` joins the mandatory \`npm run test:studio\` preflight, alongside the prior Rungs 1–6 tests. Acceptance covers a complete quest path, cross-room flags, quest/flag door denial and unlocking, malicious metadata bounds, old-scene compatibility, safe save restoration, and UI controls.

\`\`\`sh
node --test tests/layer-studio.test.js tests/layer-puzzle.test.js tests/layer-living-worlds.test.js tests/layer-world-director.test.js tests/layer-room-atlas.test.js tests/layer-adventure-journal.test.js tests/layer-quests-world-state.test.js
\`\`\`

Potential Rung 8: quest sequencing, optional dialogue beats, authored conditional scenery changes and encounter patterns, all without expanding to arbitrary scripts or breaking the offline runtime.
