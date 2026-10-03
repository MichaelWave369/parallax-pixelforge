# PixelForge Visual Doctrine v1.0

## House default

PixelForge defaults to **SNES-first 16-bit expressive pixel adventure presentation**.

The intended feeling is a lost, lovingly produced 16-bit cartridge: readable silhouettes, richer palettes, layered environments, framed UI, animation, scene identity, and enough visual density that the world feels authored rather than prototyped.

## Lanes

| Lane | Status | Best use |
|---|---|---|
| Pocket / Micro 8-bit | Opt-in | tiny arcade loops, jokes, experiments |
| 16-bit SNES Adventure | **Default** | action-adventure, RPG-lite, hybrids, mainline PixelForge |
| 32-bit Pixel Cinematic | Advanced | portraits, cinematic rooms, richer lighting |
| Stylized 3D / XR | Future | spatial embodiments |

## Mainline 16-bit contract

A cartridge declaring `visualEra: 16-bit` and `styleProfile: snes-adventure` should normally provide:

- a curated palette with enough range for foreground/background separation;
- hero sprites at a useful expressive scale (house target: 32x48 class or larger rendered footprint);
- two or more environment depth layers, preferably three for side-view scenes;
- framed, deliberately styled UI rather than browser-default controls;
- at least one motion/animation language;
- responsive/mobile-safe rendering and reduced-motion behavior;
- explicit art-direction metadata in `cartridge.meta.json`;
- human visual review before the `gold-standard` label is signed off.

## Anti-goal

"Retro" is not permission for weak presentation. Mainline PixelForge output must not silently collapse into primitive Atari-like blocks, empty test grids, tiny unreadable characters, or placeholder UI.

8-bit and ultra-minimal aesthetics remain valid when **explicitly selected** for the cartridge.

## Governance boundary

The deterministic visual audit proves that declared source-level requirements exist. It does **not** prove that artwork is beautiful, cohesive, original, or fun. A named human remains responsible for final visual gold-standard approval.
