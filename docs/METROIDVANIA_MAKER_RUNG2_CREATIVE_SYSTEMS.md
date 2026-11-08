# PixelForge Metroidvania Maker — Rung 2: Creative Systems

Status: **proposed / experimental data authoring**. This rung builds upon the merged Rung 1 atlas (`pixelforge.metroidvania-world.v1`), without changing or rewriting its saved worlds, the existing Layer Studio, the 3D World Player, or the private Unreal asset library.

## Why this exists

Our first proof game, *The Ashen Belfry*, needs the moments that make an exploratory gothic action-adventure memorable: distinctly different playable-character modes, exploration rewards, secret equipment interactions, and tranquil places where you can pause and listen. The goal is **a reusable maker feature**, not game-specific scripted content.

## Rung 2 shipped editor workflow

At `?metroidvania=1`, below the existing atlas, a **Character Creator & Castle Secrets** section now lets an author:

- **Playable characters:** create and name up to eight profiles, choose balanced/agile/heavy/arcane movement style, choose starting traversal abilities, and equip up to two items. Select an existing character to re-run the same graph's reachability analysis with that character's starting abilities. Remove a profile without disturbing the others. This is a *design loadout*; the movement presets do not implement distinct hit boxes, damage, animation or in-game movement yet.
- **Hidden discoveries:** add a breakable wall, false floor, concealed door, or hidden ceiling in a selected room, optionally requiring one existing traversal ability. The analysis reports how many secrets are logically discoverable after gaining room abilities. No physical destructible collision or hiding artwork is implemented here.
- **Equipment & pair synergies:** create catalog items of weapon/shield/relic/armor type; author a named two-item pairing and an allowlisted conceptual effect (guard pulse, bonus damage, life steal, extra range or speed burst). The character profile analysis flags active synergies if both are equipped, regardless of their pair order. No combat effects are applied to a running game.
- **Atmosphere & listening spots:** place one calm mood marker per room, including an original author note and a fixed mood vocabulary (haunting, serene, ominous, wind and rain, silence). The scene does not play copyrighted music or any music automatically; this is future audio direction for a real game.

An original three-character example is bundled with the sample atlas: **The Wanderer**, **The Hunter**, and **The Sentinel**, plus a safe original equipment pairing called **Resonant Ward** and two discovery markers. No Konami character, art, music or gameplay data is included.

## Data contracts and compatibility

- **Unchanged atlas format**: `pixelforge.metroidvania-world.v1` from Rung 1.
- **New optional creative sidecar**: `pixelforge.metroidvania-content.v1` with `characters`, `items`, `synergies`, `secrets` and `quietSpaces`. Every reference to an ability, item, or room must already exist in the current atlas.
- **New full Maker project envelope**: `pixelforge.metroidvania-project.v1` carrying both the atlas and creative sidecar, with a 128 KB total bound. The editor can export and import the complete project.
- **Legacy world-only JSON still imports and exports**. Importing an atlas alone deliberately **starts new default creative designs**, and the UI reports this; use full project export to preserve characters, secrets, items and quiet spots.
- **Graph analyzer extension**: `analyzeMetroidvaniaWorld(world, {startingAbilities: [...]})` accepts strictly validated ability IDs; its original no-argument call is backward compatible and still starts with an empty inventory.

All imported and exported files are **data**, never evaled or loaded as modules. Validators refuse arbitrary keys, scripts, unknown references, duplicate IDs and excessive arrays. No marketplace asset binaries, URLs, audio files, account tokens, downloaded packs or UE projects are copied to GitHub Pages.

## Scope and meaningful caveats

The UI is a **creation/planning tool**. Character profiles, secret walls, pair bonuses, and music moods are not yet connected to Layer Studio collision, sprites, combat damage, or actual audio. The progression simulator assumes room entry grants abilities and that travel gates are deterministic. A physically playable character mode with real jump timing, combat and skill gating still requires separate work.

Changing or deleting rooms or traversal abilities that the creative sidecar references is refused until those references are removed. Import of an invalid full project fails without mutating the existing editor session. The prototype uses browser memory with explicit export; it does **not** silently replace the older Layer Studio save slots.

## Rung 3 next: game-playable genre mechanics

1. Introduce an adapter from the graph/creative schema to real `pixelforge.layer-atlas.v1` room scenes with preserved stable room IDs and explicit compatibility validation.
2. Implement the first actual traversal ability and breakable secret as deterministic runtime mechanics. Test that the gate blocks a default character but permits one with the required ability.
3. Implement a small, original whip/chain combat rig, a basic enemy, and a tested two-item synergy effect through a bounded runtime rule system.
4. Author one original peaceful audio/atmosphere spot with locally licensed audio and safe user controls (volume, mute, ambience fade, no autoplay).
5. Provide an export qualification receipt for the classic mode; keep all Unreal and VR hardware/runtime claims explicitly pending.

Later: rights-verified asset selection for our owned Epic/Fab/third-party packs, UE scene/character adapters, and physically qualified Quest 3 PCVR. Preserve independent performance and comfort testing for VR.

## Test and acceptance

```bash
npm --prefix site test
npm --prefix site run build
```

Tests cover sample validation, alternate starting abilities, softlock detection, secret unlock requirements, two-item symmetry, malformed/unknown references, project round-trip, and source immutability. Manual QA: switch Wanderer/Hunter, confirm progression stages change, add a new character, author a locked secret, equip both synergy items, add a listening spot in another room, export the full project and re-import it without loss. Import an older atlas-only JSON and verify the reset explanation. Confirm legacy PixelForge routes remain available.

The manual interaction, audio and device checks are not falsely marked complete by CI.
