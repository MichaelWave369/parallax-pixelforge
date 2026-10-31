# PixelForge Layer Studio — Rung 11: Cinematic Director

## Turn timed story beats into a living scene

Rung 11 adds **camera framing**, **ambient-light transitions**, and **readable caption cues** to the timed boss introduction and victory beats from Rung 10. The existing Layer Scene v1, Room Atlas v1, Boss Stage v1, and Adventure Journal save contracts remain intact.

This is a **visual-only cinematic controller**. It does not move the player, boss, collision geometry, camera zones, quests, inventory, or world flags. It does not execute author scripts or fetch remote assets. The original gameplay camera returns the moment the cinematic panel closes.

## Authoring in Boss Stage

Open **PixelForge → Layer Studio → Room Atlas → Boss Stage**. Create or select a room boss.

Each **Intro Beat 1–3** and **Victory Beat 1–2** now has optional direction settings:

| Field | What it does |
| --- | --- |
| Camera | Default, Player, Boss, or Room-wide. Controls which location the cinematic renderer frames. |
| Ambient light | Optional 0–0.8 darkness setting that eases toward a target, reusing the existing World Director light-mask renderer. Blank means the authored room’s usual ambient setting. |
| Caption | Optional 80-character plain-text cue, e.g. “DISTANT STONE GRINDING.” It is rendered as a readable subtitle-like caption, **not** played as audio. |

**Existing beat title, dialogue, duration and Next Beat/Skip controls remain unchanged.**

When the panel is active, the cinematic camera eases toward the selected focus using a bounded time-step and clamps to the room’s world bounds. The ambient darkness eases independently. On systems with **Reduce Motion** enabled, the camera and lighting snap directly to the new targets instead of animating. Dialogue and enemy simulation remain frozen under the modal.

The scene is still rendered beneath the modal, which is intended to stay readable and navigable. The text caption and current camera/lighting direction appear in the modal as well.

## The Ash Warden example

The bundled Forgotten Reliquary now choreographs its introductory beats:

1. **THE SILENCE:** Begin with the player, dim the room slightly, show “DISTANT STONE GRINDING.”
2. **THE ASH WARDEN:** Ease toward the guardian, darken the chamber, show “THE ASH WARDEN EMERGES.”
3. **THE CHALLENGE:** Pull back to a room-wide view and brighten the light for combat.

After defeat, a two-beat victory scene moves from the fallen guardian to a broader view of the chamber as light returns. The victory flag is granted by the actual boss defeat before the scene starts; the cinematic cannot grant duplicate rewards.

The Rung 10 locked attack warning lanes and ray/orb combat are unchanged.

## Runtime and compatibility

- New \`layer-studio/cinematic-director.js\` owns a lightweight, ephemeral camera/light controller. It reads the current \`bossTimeline\`, already-authored scene/world data and an initial gameplay camera position.
- \`normalizeBossBeats()\` extends each beat with optional \`camera\`, \`ambient\`, and \`cue\`. Only \`player\`, \`boss\` and \`room\` camera values are allowed. Ambient darkness is bounded to 0–0.8; cues are plain text capped at 80 characters.
- Beat data without direction settings re-normalizes to the original shape. Existing Rung 9/10 boss files remain compatible and default to ordinary player framing and room lighting at playback, without adding fields to saved scene JSON.
- Camera and ambient values are never saved to Adventure Journal slots. Saving during or after a cinematic retains only canonical earned boss HP, status, story and quest progress. Backtracking or reloading does not replay a previously defeated boss cinematic.
- The director does not mutate \`session.scene\`, \`session.game\`, \`game.puzzle.director\`, world flags or quest states. It passes temporary cloned lighting settings into the existing World Director renderer.
- Camera easing is deterministic with respect to frame delta, clamped to reasonable time steps, and uses a reduced-motion override. It requires no Canvas plugins, external models or network calls.

## Validation and boundaries

\`tests/layer-cinematic-director.test.js\` is included in required \`npm run test:studio\`. Tests check demo beat data, legacy normalization, malicious metadata bounds, boss/room camera framing, ambient easing, reduced-motion snapping, timing independence from combat, local-save isolation and presence of editor/runtime wiring.

This rung deliberately **does not** implement recorded voices, actual audio playback, video cutscenes, character rigs, camera rotation, arbitrary keyframes or scripted quest outcomes. Captions describe story sounds visually. Full keyboard, controller and touch acceptance still requires hands-on browser playtesting.

Potential Rung 12: an authored per-room, reusable **World Sequence Track** for story events outside of boss encounters, with the same data-only controls and optional camera/lighting effects.
