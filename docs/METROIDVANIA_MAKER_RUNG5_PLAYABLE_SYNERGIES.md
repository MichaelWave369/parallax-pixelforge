# PixelForge Metroidvania Maker — Rung 5: Playable Character Loadouts and Equipment Synergies

**Status:** proposed, 2.5D gameplay expansion, manual browser/gamepad QA pending. Builds on the merged Rung 4 chain-combat prototype. No separate engine, remote AI, licensed game IP, paid asset export, audio playback, Unreal adapter or Quest 3 gameplay is introduced.

## Player flow

Open PixelForge Metroidvania Maker at `?metroidvania=1`. Use **Character Creator & Castle Secrets** to choose a playable character, assign a balanced/agile/heavy/arcane movement style, and equip up to two catalog items. Equipment combinations authored in the Maker are now evaluated by the *actual Layer Studio chain-combat runtime* when you select **Play 2.5D prototype**.

In the original six-room Ashen Belfry example:

- **The Wanderer:** balanced movement, a Moonblade, no active two-item synergy by default.
- **The Hunter:** agile movement, starting Shadow Dash, Pilgrim Chain + Silver Focus, activating **Far-Reaching Covenant (extra-range)**.
- **The Sentinel:** heavy movement, Oath Shield + Silver Focus, activating **Resonant Ward (guard-pulse)**.

Move through the actual room scenes, strike normal and armored wraiths, break secret walls, and inspect Inventory for your active character, equipment and effects. The same world can play differently depending on character and two-item loadout. Switching the character in the Maker creates a separate world fingerprint for local save slots.

## Actual effects and boundaries

The effect vocabulary is **closed**, validated and intentionally non-scriptable:

| Effect | Rung 5 playable behavior |
|---|---|
| `guard-pulse` | Chain swing produces a visible protective ring and grants 0.18 seconds of contact invulnerability, shorter than the attack cooldown |
| `bonus-damage` | A chain strike deals two hits of damage instead of one; the new armored wraith needs two standard hits |
| `life-steal` | A successful chain hit restores one heart, capped at three hearts; swinging into empty space doesn't heal |
| `extra-range` | Chain attack hitbox and visible arc extend by 48 world units |
| `speed-burst` | Increases ordinary movement slightly and multiplies the existing earned Shadow Dash speed by 1.18; cannot unlock Dash on its own |

Character movement choices now also matter in the existing fixed-step puzzle movement routine: balanced 265, agile 305, heavy 217, and arcane 252 units/second. Arcane receives an additional 18-unit chain reach. These are gameplay parameters, not different imported sprite rigs. The optional `resilience` field adds up to three hit points to a wraith, while old enemies without the field remain one-hit. A partially damaged wraith's remaining hit points are saved in that room's progress and restored across room travel and manual saves.

## Data-only authoring and compatibility

The bridge validates the entire Maker project, then constructs an optional, strictly checked `combatProfile` within the existing `pixelforge.layer-atlas.v1` envelope:

- Character ID and name
- A movement style from the four approved values
- Zero to two fully validated item records with bounded names and types
- Zero or one two-item synergy, with known item references and exactly one of the five approved effect IDs

The runtime rejects arbitrary fields, unknown item IDs, unsupported effects, duplicate equipment, excessive pairs and invented movement modes. It derives effects from the **normalized authored combat profile**, not gamepad/keyboard input. The combat profile only exists for opt-in `combatMode:'chain'` scenes; existing Layer Studio scenes without that mode keep the stone ray, movement parameters and save behavior.

The source Maker data is never modified during translation. The new starter sample lists five original pairings for creators to experiment with:

- Oath Shield + Silver Focus: Resonant Ward / guard pulse
- Pilgrim Chain + Silver Focus: Far-Reaching Covenant / extra range
- Moonblade + Oath Shield: Moonfire Pact / bonus damage
- Pilgrim Chain + Oath Shield: Renewal Link / life steal
- Moonblade + Silver Focus: Swift Silver / speed burst

There are **no actual purchased weapons, meshes, audio or copyrighted game assets** in the prototype. Pair names and effects are original placeholders. The editor remains browser-local and exports only bounded JSON.

## Verification

```bash
npm --prefix site test
npm --prefix site run build
npm run test:studio
```

The new tests check combat profile source validation, three character modes, real walk velocities, range-based hit selection, armored-wraith bonus damage, life steal capped at three hearts, temporary guard pulses and their expiration, speed burst distance, partial enemy damage across room travel/save restoration, hostile profile rejection and unchanged classic Stonebridge behavior. Prior Rung 1–4 tests remain in the test suite.

**Manual checks still required:** launch the Maker in a real browser, play Hunter and Sentinel, inspect their in-game Inventory loadouts, compare chain distances and movement speeds, test heavy combat and protective ring rendering, save/reload after partially damaging an armored wraith, play an old Stonebridge project, and test actual touch and gamepad buttons. Run a real platformer feel/level-art pass before calling this a polished game.

## Next rung

Build a persistent **secret character unlock** contract with proof-of-discovery, and introduce original authored room-level secret placement so designers can place breakable walls instead of using fixed placeholder coordinates. Treat audio/listening spots as a separate original/licensed audio integration with autoplay off and explicit volume/mute controls. UE5 and VR adapters remain a later, separately verified milestone.
