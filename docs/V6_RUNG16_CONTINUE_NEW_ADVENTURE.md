# PixelForge v6 · Rung 16: Continue, New Adventure & Save Compatibility

Rung 16 turns the offline published game's title screen into a safe place to **continue progress**. The player can inspect its existing browser-local save, import a save JSON as a temporary alternate source, resume a matching verified run, or start a fresh adventure without silently deleting existing progress.

This rung deliberately reuses **Rung 9's pixelforge.playtest-save.v1 contract and full-world SHA-256**, rather than inventing new save slots, schema migrations, accounts, cloud sync, network requests or game authority. A release title, cover, version, credits or studio branding change does *not* change the playable-world digest. A geometry or quest rule change does.

## Published title choices

- **Continue Selected Save**: enabled only for a strictly verified browser slot or an imported JSON save. A source picker selects Browser Save or Imported File. Both are checked against the active published world's SHA-256 and exact playtest event trace before they're accepted.
- **New Adventure**: starts at the declared spawn, with fresh objectives. If the current browser slot is valid or damaged, a second confirmation explicitly explains that no browser save will be deleted or replaced. Creating a new run is NOT the same as saving that new run. The existing slot is preserved until the player consciously chooses a write.
- **Import Save File**: accepts a local Rung 9 JSON (<=64 KB), checks version, world digest, coordinate bounds, event timeline and exact objective progress, then holds the verified result **in memory only**. No automatic localStorage write.
- **Back Up Browser Save**: downloads the exact currently verified browser save as JSON without modifying the original slot.
- **Save source**: keyboard users can choose an existing browser or imported JSON slot using the select control. With a standard gamepad, focus the selector and press A to toggle among available sources.
- **Credits & Licenses**, release artwork and launch settings from Rung 15 remain available.

On title load, the page computes SHA-256 of the **entire validated playable-world document** before reading the exact local save key. If no exact slot exists, Continue is disabled. For all accessible browser slots, the panel shows a timestamp, event count, collected pickups, checkpoints, and whether the game was completed.

The inspector optionally counts other existing PixelForge playtest-save keys **without opening their contents**, and warns that those could be for unrelated worlds or incompatible revisions. It never claims to identify a previous version of the same game without evidence. It scans at most 200 storage keys to keep work bounded. Foreign slots are never migrated or overwritten automatically.

If storage is denied, malformed or corrupt, the page displays an explanation. A damaged exact-world slot is preserved for possible backup/recovery instead of being deleted or silently replaced. The player may still start a fresh run or import a valid file when local storage is unavailable.

## Correct restoration before Rapier starts

A selected save is prepared by the pure \`published-session.js\` helper before the World Player creates its physics stage. It validates the existing Rung 9 save contract, replays each event using the original gameplay reducer, then initializes:

- Player spawn from the **saved physical position**
- Collected items, triggered checkpoints, switches/secrets, opened doors and victory status
- Previous event trace, replay cursor, live event list and last known motion position

There is **no late "teleport once physics already moved" step**. The initial React state and Rapier stage receive the restored values together; no events are inferred or invented from a file without a valid replayable trace. A new run uses the same existing fresh-world initialization.

## Protecting existing progress

Previously, clicking the existing in-game Save Progress button directly replaced any existing slot. Rung 16 now checks localStorage *again at the moment of saving* and requires an explicit second **Confirm Replace Browser Save** action whenever a slot already exists. It also gives the user a Cancel option.

The existing in-game **Delete This World's Local Save** action now requires **Confirm Delete Local Save**, with a warning that deletion cannot be undone and a Cancel option. Neither New Adventure nor returning to the title deletes progress. No automatic save or implicit overwrite is added.

The confirmation protections apply in World Player previews as well as published offline games.

## Browser constraints & data boundaries

- The published HTML remains **self-contained**, with network blocked by its Content Security Policy.
- A browser may block \`localStorage\` or \`crypto.subtle\` on certain \`file://\` origins. If so, the title screen reports unavailability and **does not claim an empty save slot** or silently fall back to a different game.
- A brand-new release with changed gameplay or geometry has a different digest, so old save files must not be resumed without an explicit, separately designed compatibility migration.
- An exported save is a portable **data file**, not cryptographically signed evidence. Its Rung 9 replay check verifies self-consistency with the declared rules, not proof of authentic gameplay.
- Browser slots remain one per exact world digest, with bounded events and local-first storage. Imported files are not persisted unless the user explicitly writes progress from gameplay.
- Rung 11 ghost recordings, Rung 12 playtest comparison and Rung 15 cover/credits licensing remain unchanged.

## Automated regression

\`\`\`bash
npm --prefix site test
npm --prefix site install --no-audit --no-fund
npm --prefix site run build
\`\`\`

New \`published-save-menu.test.mjs\` checks read-only matching save discovery, corrupted-slot preservation, unavailable storage, foreign slot isolation, import size/schema validation, release branding independence and confirmation policy.

New \`published-session.test.mjs\` checks pre-physics saved position/progress reconstruction, exact event trace, rule-free explorer worlds, tampered state refusal and source immutability.

## Manual acceptance checklist

1. Publish a world offline, start a game, complete a pickup/checkpoint and choose Save Browser Progress. Return to Title. Verify Continue is enabled and displays correct progress.
2. Continue and confirm player position, collectibles, switches, doors, quest progress and victory state match exactly. There should be no transient fresh-scene startup.
3. Return to title, choose New Adventure and confirm the explicit warning. Verify original browser save still exists and Continue can load it again after returning.
4. Start fresh with an existing slot. Click Save Browser Progress, verify first click **does not overwrite** and Confirm Replace/Cancel both behave as labeled. Confirm Delete and Cancel separately.
5. Export a browser save backup. Import it in a new fresh title session, select Imported File and Continue. Verify game state reconstructs without automatically writing to localStorage.
6. Try another world's save, tampered progress, forged event trace, malformed/oversized JSON and a browser storage denial. Verify clear refusal, disabled Continue, preserved files and no unintended writes.
7. Publish two releases of the exact same world with different cover art and release versions. Confirm they can use the same save. Change gravity or an event rule; confirm the original save is not automatically accepted.
8. Test D-pad/left-stick focus, A/Start selection, B cancellation, browser keyboard focus, pointer controls, and the source selector when both Browser and Imported saves are available.
9. Check the offline browser Network panel for no requests. Re-run the published cover/credits, fullscreen, legacy Studio/VR, GLB/private-vault, ghost and Playtest Inspector workflows.
10. Qualify on actual browser/hardware, including browsers with restricted \`file://\` storage. Green CI verifies code/contracts/builds, **not** physical gamepad performance or offline browser behavior.

## Next

Rung 17 could add opt-in versioned save migration only with an explicit manifest of compatible world changes, or an offline release-readiness tool that checks asset rights, runtime/WASM boot and controller functionality before shipping. Neither should assume two worlds are save-compatible solely because their titles match.
