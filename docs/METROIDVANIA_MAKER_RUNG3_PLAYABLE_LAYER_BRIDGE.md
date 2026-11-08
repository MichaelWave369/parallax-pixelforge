# PixelForge Metroidvania Maker — Rung 3: Playable 2.5D Bridge and Shadow Dash

**Scope:** a first working genre-to-runtime adapter, **not** a finished Metroidvania platformer, Unreal scene exporter, or VR game.

This rung takes a validated Metroidvania Maker **world + creative content + selected character**, builds a bounded `pixelforge.layer-scene.v1` with an actual `pixelforge.layer-atlas.v1` and launches that scene through the existing Layer Studio play runtime. No separate game engine is added. The bridge is intentionally strict and allows a maximum of six rooms because existing Layer Atlas v1 supports six. Large worlds fail with an actionable message rather than silently losing rooms.

## Human user flow

1. Open PixelForge **Metroidvania Maker** with `?metroidvania=1`. Use the original six-room *Ashen Belfry* world or an authored atlas.
2. Choose **The Wanderer** in Character Creator, then click **Play 2.5D prototype**.
3. In Layer Studio play mode, travel from Outer Gate to Cathedral Nave, approach the Bell Tower's Dash-gated portal. It refuses entry without Shadow Dash.
4. Enter Forgotten Crypt through the accessible passage. The room grants **Shadow Dash** once; the character inventory displays it.
5. Press **Shift** (or gamepad Y / touch DASH) while moving to use a short horizontal burst. The generated Cathedral Nave contains a wide ground gap in front of the dash-gated doorway. Reach the Bell Tower using the new ability.
6. Open the map/inventory or a manual save slot. Abilities persist across travel and browser-local save/restore, tied to the exact world fingerprint.
7. Return to Maker and select **The Hunter**. This character starts with Shadow Dash and the Bell Tower passage is unlocked immediately in the playable runtime. The original Maker data remains unchanged.

## Implemented contracts

- New `site/src/metroidvania-layer-bridge.js` translator that imports original `createScene/normalizeScene` from Layer Studio, uses only original procedural room graphics, and produces the exact established Layer Studio scene schema. Only strict authorized profile data is transferred: starting abilities, rooms, directional links, room grants, and required ability arrays.
- Additive Metroidvania fields on the Layer Studio atlas: `abilities`, `startingAbilities`, per-room `grantsAbilities` and per-portal `requiresAbilities`. The existing normalizer bounds the catalog to 16 known safe IDs and rejects unknown abilities, broken gate arrays and duplicate references. Old scenes without these fields remain compatible.
- Actual runtime gating on `stepWorldSession`, with fail-closed entry denial for missing abilities and ability acquisition on room entry. Portal rendering and prompts reflect the gate state.
- A **real fixed-step dash** inside existing `stepPuzzle` that respects horizontal collider tests, a 0.16-second burst and a 0.55-second cooldown. It runs only if `stepWorldSession` explicitly passes `allowDash` from acquired ability `shadow-dash`; untrusted input alone cannot grant Dash.
- Accessible keyboard Shift, gamepad Y, and touch DASH inputs; inventory shows acquired abilities and use instructions. A dash does not bypass existing tile collision.
- Additive local journal persistence for validated, acquired abilities. It still enforces world fingerprint and recognized ability IDs on restore.
- Unit tests for actual Layer Scene normalization, default-character gate refusal, in-world acquisition, alternate-character start access, actual dash distance vs non-dash, save/restore, invalid reference refusal, and bounded room count.

## Honest limitations

The generated prototype uses **placeholder 2.5D procedural scenery and one existing petrifiable enemy per room**, not licensed Unreal/Fab/Leartes environments. This rung does **not** yet implement a whip attack, destructible secret-wall geometry, equipment damage bonuses, extra traversal moves (wall climb/mist), boss redesign, original music playback, physical animation rigs, Unreal code generation or Quest 3 interaction. These remain in the Maker as design-only plans. The adapter does not translate the authoring-only `secrets`, `synergies`, `quietSpaces`, or movement presets into runtime mechanics. No asset bytes, accounts, URLs or executable scripts are embedded.

The generated dash challenge is intentionally simple and must be manually playtested for jump timing and collider feel. The adapter's ability-gate tests **are not evidence of level-design quality**. Existing legacy Layer Studio saves and ordinary world tools are not rekeyed or overwritten.

## Verification

```bash
npm --prefix site test
npm --prefix site run build
npm run test:studio
```

Manual acceptance must include:
- Open `?metroidvania=1`, select Wanderer, click **Play 2.5D prototype**, and confirm it actually opens in desktop browser.
- The Bell Tower portal refuses entry without Shadow Dash.
- Crypt entry grants Dash, and Shift/gamepad Y/touch DASH moves the real character farther than regular walking.
- Return to the Bell Tower from Cathedral and verify travel after acquiring Dash.
- Save in the Crypt, reload, verify Dash is still in inventory and usable.
- Repeat with Hunter, whose starting ability lets him access the gate without visiting Crypt.
- Test normal old Layer Studio games for input and save regression.
- Test an atlas of seven rooms and an invalid ability reference: refuse, without modifying the Maker design.
- Test both standard GitHub Pages and local builds, including sessionStorage denial. Treat physical gamepad and device acceptance as pending until performed.

## Next milestone

**Rung 4: Attack & Discovery Play Loop.** Integrate an original chain/whip strike with an authored breakable wall and a verified hidden pickup. Then connect equipment synergies and an original licensed ambience player while preserving bounded world contracts. The UE5/VR pipeline stays separate until the classic proof has manually verified combat and traversal quality.
