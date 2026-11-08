# PixelForge Metroidvania Maker — Rung 4: Chain Strike & Breakable Discoveries

Status: **proposed, playable 2.5D mechanics; manual browser acceptance pending**. Extends the Rung 3 bridge into the **existing** Layer Studio runtime. No new game engine, no third-party paid art, no original-copyright game assets or music, and no speculative UE/VR claims.

## Player-facing gameplay

1. Open PixelForge Metroidvania Maker `?metroidvania=1`, choose a character and select **Play 2.5D prototype**.
2. The generated **Ashen Belfry** Layer Studio session runs in **chain mode**. Press **F**, **Enter**, gamepad fire button or the **CHAIN** touch control to swing a visible, directional, original chain attack.
3. Chain strikes can banish the real wraith opponents. Each attack has a bounded ~102-unit reach, 0.28 s cooldown and short visual arc. Unlike legacy Stonebridge's petrifying ray, chain combat does not emit bullets.
4. In the **Forgotten Crypt**, find the cracked-wall secret from the Maker's own authored `breakable-wall` entry. A wall is a real solid obstacle, including against dash. Hit it with the chain after acquiring its specified traversal ability (Shadow Dash in the sample). Its collision is removed, exposing an original, glowing relic pickup.
5. Walk into the revealed relic to collect it. The **Inventory** displays discovered secret relics with their source room. Merely hitting a wall from far away does not award the relic.
6. Manual browser save slots persist the broken-wall state, collected secret rewards, and defeated room enemies, as well as previously added traversal abilities and room progression.

## Authoring contract

The Maker's validated `pixelforge.metroidvania-content.v1` sidecar already includes secret type, ID, display name, room reference, and required abilities. The Rung 4 bridge transfers **only `breakable-wall`** secrets into the existing Layer Atlas v1 through additive validated per-room `breakables` objects. For this first prototype they receive a deterministic original position and size. The authoring project remains untouched.

The existing Layer Atlas v1 gains one optional `combatMode:'chain'` field. In that mode `requiresAbilities` is a known bounded catalog and breakables are bounded to eight per room. A breakable must carry an existing room-local unique ID, short name, finite geometry and strictly valid ability requirements. Malformed, unknown or excessive values **fail closed**. Other secret kinds (`false-floor`, `concealed-door`, `hidden-ceiling`) remain clearly marked as **design only** in the Maker; they are not silently turned into fake physics objects.

The combat step runs after fixed-step movement and before room travel, and it uses only normalized, authored data. Attack eligibility is determined by the runtime's chosen `combatMode`, not input-supplied arbitrary scripts. Secret collection and wall destruction require physical proximity. Existing authored boss, narrative, quest and tile systems are unchanged. Original Layer Studio scenes with no combat mode still fire the petrification ray.

Only **data** is transmitted by the Maker through the existing browser-local sessionStorage handoff. The prototype uses procedural graphics; no soundtracks, Fab/Leartes assets, server credentials, executable plugins or downloaded binaries are embedded.

## What remains unfinished

- The chain strike is a simple original hitbox and visual swoosh, not a complex frame-animated whip rig or combo tree.
- The currently authored wall positions are generated placeholders, not an in-room drag-to-place secret-layout editor.
- Equipment pairs are still design-only. The Resonant Ward effect is not applied in combat.
- False floors, concealed doors and hidden ceilings are not yet playable.
- Movement-profile styles remain planning metadata. Shadow Dash from Rung 3 is the implemented traversal ability.
- Quiet listening spots and audio playback remain design-only. No copyrighted music is played.
- No Unreal adapter, PCVR, Quest 3 VR runtime or device qualification is claimed.

## Regression and acceptance

```bash
npm --prefix site test
npm --prefix site run build
npm run test:studio
```

Automated tests exercise chain attack direction, real enemy defeat, cooldown, bounded reach, physically blocked walls, actual destruction, pickup proximity, ability-required wall protection, inventory progress and save/restore with forged-invalid secret IDs rejected. They also verify legacy stone-ray behavior and fail-closed wall normalization.

**Manual acceptance remains required** before calling the gameplay polished: load the published site, enter the Maker demo, reach Crypt, strike the marked wall, collect its glowing relic, open Inventory and save, reload, confirm the wall stays broken and the pickup stays collected, then verify Dash still works across the Cathedral gap. Retest standard Layer Studio scenes and touch/gamepad input. Check the visible chain arc and player/wall overlap with a real browser, not only CI.

Next: playable alternate secret types and a character-combat configuration editor; test and balance item-pair effects without giving items unrestricted scripts; optionally add original, user-supplied or licensed ambiance with mute, volume and no autoplay. Unreal/VR follow after browser-level gameplay acceptance.
