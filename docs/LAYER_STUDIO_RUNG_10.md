# PixelForge Layer Studio — Rung 10: Boss Telegraphs & Cinematic Timelines

## Teach the player what is coming

Rung 10 extends the **existing Room Atlas Boss Stage**, not the combat engine. Bosses now visibly **warn players which horizontal lane is about to be attacked**. In parallel, authors can choreograph **timed, text-based introductory and victory sequences**.

The entire feature works in the existing local-first browser runtime and reuses authored scene files, the 60 Hz fixed-tick combat loop, and three browser save slots. No network access, external plugins, arbitrary JavaScript, video assets, or extra combat engine are required.

## Play the Ash Warden demonstration

1. Create the two-room starter Room Atlas and play the Stonebridge adventure.
2. Recover the key, enter the Forgotten Reliquary, and approach the Ash Warden’s introduction zone.
3. The game pauses for three timed story beats: **The Silence**, **The Ash Warden**, and **The Challenge**. Beats advance automatically according to authored durations. **Next Beat** or **Skip Intro & Fight** can move through faster. **E, Enter, Space or Xbox X** starts the fight immediately.
4. During combat, the Warden briefly draws a colored attack lane with a warning label before releasing an orb. **The orb uses exactly the same lane and direction that were locked when the warning appeared**, even if the player moves afterward. Move out of the warned lane and fire your stone ray when safe.
5. When six hits defeat the Warden, the world flag \`ash-warden-fallen\` is set before a two-beat **Victory Timeline** opens. This timeline also pauses combat and can be skipped. Returning to the game leaves the completed world state intact.

The three phases have distinct attack frequencies, speeds and warning windows. The current demo uses 0.85-second, 0.63-second, and 0.38-second warning windows. These cues are deliberately visible rather than rapid full-screen flashing effects.

## Authoring an arena

In **Layer Studio → Room Atlas → Boss Stage**, set the boss’s name, position, health, and existing three phase names/attack intervals/speeds.

**New Rung 10 controls**:

- Phase 1/2/3 **Warning Seconds**: how long the attack lane is shown before an orb fires.
- Phase 1/2/3 **Warning Text**: a short descriptive label displayed above the attack lane.
- **Intro Beat 1–3**: title, prose, and display duration.
- **Victory Beat 1–2**: title, prose, and display duration.

Beats last 0.7–7 seconds each. Text is bounded to 70-character titles and 220-character paragraphs. Authored timelines are arrays of plain data, with a maximum of four beats each. The editor exposes three intro beats and two victory beats for a compact initial interface; the file contract supports a fourth beat for future authoring tools.

Warning windows are bounded within the phase’s attack interval, and cues are limited to 70 characters. Changing attack frequency cannot create a negative or zero-length warning.

## Runtime semantics

### Telegraphs and orbs

Boss combat is still \`stepBossStage()\` at the existing physics timestep. Each phase sets \`attackTimer\` to its authored interval. When that timer enters the warning window:

1. The runtime samples the player's current side and vertical midpoint **once**.
2. It stores a local \`stage.aim\` with \`toward\` and \`y\`.
3. The renderer draws an attack lane along that locked path, with a high-contrast warning label.
4. At timer expiration, the orb is launched along that exact path.

The player can move after the cue starts and avoid the shot. No new random aim decision is made at fire time. Phase transitions, room restoration, battle startup and victory clear pending aim to prevent stale cues.

Boss ray damage, orb health damage, petrification, room checkpoint behavior and movement remain governed by the same Stonebridge systems.

### Cinematic beats

\`createBossTimeline(def,kind)\` produces an ephemeral local playback controller for \`intro\` or \`victory\`. \`stepBossTimeline()\` advances timed beats in bounded steps. While the cinematic panel is displayed, **the combat loop is paused**. Player controls, enemy physics and boss attacks do not advance behind the overlay.

The introductory battle does **not** start just because the clock advanced through its story. Explicitly closing the intro or selecting **Face the Guardian** starts the fight. Similarly, the victory cinematic never awards a second victory. The boss defeat flag was already earned by the lethal hit.

Both cinematics can be advanced or skipped. No timing/replay progress is written to save slots, because the intro is only displayed the first time a boss is encountered and a victory is only displayed for the exact lethal-hit event.

## File and save compatibility

- **\`pixelforge.layer-boss.v1\`** is unchanged. New optional per-phase \`telegraph\` and \`cue\` fields, plus optional \`introBeats\` and \`victoryBeats\` arrays, extend the existing schema.
- **Old Rung 9 boss scenes remain valid and retain their serialized shape when re-normalized.** If authored fields are absent, safe runtime defaults provide a warning and one intro/victory text beat without rewriting the scene.
- No changes to the \`pixelforge.layer-save.v1\` record. Existing saved boss ID, HP, status, and defeat flags continue to restore as before.
- Backtracking and save restoration clear in-flight orbs and pending warning aim to ensure deterministic, safe fight restarts.
- A previously defeated boss cannot replay its lethal-hit victory event after save/load or room re-entry.
- Editing the *authored starter world* from Rung 9 to Rung 10 changes its world fingerprint, so old save slots for that particular starter scene are isolated by the existing versioned-world save rules. User-authored Rung 9 scenes that have not changed retain their prior format.

## Testing and limits

\`tests/layer-boss-timeline.test.js\` runs under mandatory \`npm run test:studio\`, covering locked aim versus projectile trajectory, phase warning resets, clamping/normalization, timeline time bounds, exact-once victory, restored defeat, legacy boss compatibility, Canvas warning rendering and editor controls.

The cinematic scenes are **timed text overlays**, not camera keyframes or voiced movies. The boss warning is a horizontal attack lane, not a multi-pattern bullet-hell system. Rung 10 does not implement full animation timelines, skeletal boss sprites, physical headset verification, audio narration or automated real controller playtests.

### Next exploration

Potential Rung 11: a reusable timeline track with camera poses, lighting shifts, non-damaging combat telegraphs and audio-caption timing, still offline and data-only.
