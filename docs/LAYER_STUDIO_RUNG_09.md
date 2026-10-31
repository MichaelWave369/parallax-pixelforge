# PixelForge Layer Studio — Rung 09: Boss Encounters & Cinematic Introductions

## One room, one guardian, three phases

Rung 9 adds an optional **Boss Stage** to a Room Atlas chamber, using the existing 2.5D Stonebridge physics, player health and stone-ray projectiles. The boss is not a separate combat engine or a scripted plugin. Every arena is local, declarative and bounded.

The initial sample is **The Ash Warden** in the Forgotten Reliquary. It waits at the far end of the chamber. Approaching its introduction zone opens a full-screen modal with the guardian's words and a preview of its three phases. After confirmation, the battle begins.

## Play the bundled example

1. In Layer Studio, create a Room Atlas and play the starter adventure.
2. Find the room key and enter **The Forgotten Reliquary**.
3. Continue right toward the Ash Warden's arena. Crossing the introduction zone pauses play for its introductory monologue.
4. Press **E**, **Enter**, **Xbox X**, or click/tap **Face the Guardian** to begin. Closing the introduction also starts the fight, avoiding a stranded intro state.
5. Fire the existing stone ray using F or your gamepad fire button. The guardian takes six hits in the demo. It has a brief cooldown after each hit.
6. Avoid the energy orbs as it progresses through three increasingly fast attacks. Its health bar and current phase remain visible above the action.
7. Defeating the guardian sets the global flag \`ash-warden-fallen\`, usable by quest objectives or portal requirements.

The existing Echo Keeper, relics, quest, other enemies and return portal remain playable.

## Make your own boss arena

Open **Room Atlas → Boss Stage**. Choose **+ Boss arena**, then configure:

- Guardian name and introductory monologue.
- Boss X/Y, width, height, and the rectangular introduction zone.
- Max health from 3 to 12 ray hits.
- A valid lowercase/hyphen/underscore/colon **defeat flag**, optionally used in Rung 7 quest or portal requirements.
- Three named phases, each with its own orb attack interval (0.45–6 seconds) and horizontal energy-orb speed (70–550 world units/second).

The editor previews the boss silhouette, its rectangular trigger zone, and the arena location. Bosses are optional, at most **one per room**, and do not change the underlying collision map.

The data contract is \`pixelforge.layer-boss.v1\`, an optional additive \`boss\` on existing \`pixelforge.layer-atlas.v1\` room entries. Old rooms retain their original structure if no boss is authored.

## Mechanics and state

Boss states are \`dormant\`, \`intro\`, \`battle\`, and \`defeated\`. Walking into the introduction zone is the only normal way to start a new fight. The three phases are determined by health above 2/3, above 1/3, and at or below 1/3. Damage comes from the same Stonebridge stone-ray projectiles used against ordinary enemies, with a 0.32-second boss hit cooldown.

During combat, the boss emits horizontal energy orbs toward the player's current side at the phase's configured frequency and speed. Orbs hit through the existing player damage/invulnerability/respawn helper. The number of active orbs is bounded; no time-based or remote random scripts are used.

When the boss reaches zero health it is permanently defeated for the current adventure. Its active projectiles disappear and the authored victory flag becomes a persistent world flag. Quest and door systems read that flag through the same World Director/quest registry as before.

Leaving the room saves the boss's identity, battle/defeat status and current health. Returning restores that fight without repeating the cinematic intro or resurrecting a defeated guardian.

The **three manual browser-local save slots** retain this progress. They validate the boss's authored ID and clamp health/status when restoring. Mid-battle saves resume with attack timers and orb volley cleared, intentionally giving a safe restart interval; defeated bosses stay defeated. The authored scene can still be exported as one Layer Scene v1 JSON file.

## Limits and testing

- Static 2.5D boss silhouette and scythe-like weapon, not animated skeletal rigs, meshes or complex behavior trees.
- Three deterministic health phases, one boss per authored room, bounded arena geometry.
- Existing stone-ray weapon and physics; no external combat plugins or network requests.
- Orb attacks are horizontal and aim at the player's current vertical height. They are a playable starter pattern, not a full bullet-hell choreography engine.
- Boss introduction uses an overlay, not a camera-tracked timeline, voiced cinematic or cutscene sequence.
- Keyboard, Xbox X, and touchscreen can confirm the introduction. Manual real-device testing is required for controller focus behavior and combat balance.
- Boss saves, world flags, and defeat achievements are local. A manually edited local save is not cryptographically authenticated; this is a single-player authoring tool.
- The new Boss Stage does not add boss encounters to legacy single-room Stonebridge projects.

Tests in \`tests/layer-boss-stage.test.js\` join required \`npm run test:studio\`. They verify schema normalization, introductory state, all three health phases, projectile damage and cooldown, player orb damage, room backtracking, save/restore and invalid boss identity, victory flag quest/door effects, renderer and editor contracts, and unchanged legacy scenes.

\`\`\`bash
npm run test:studio
\`\`\`

Possible **Rung 10:** boss timing/telegraph authoring, reusable event timelines, conditional dialogue during a fight, and a real authored victory sequence.
