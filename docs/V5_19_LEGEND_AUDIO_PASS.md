# PixelForge v5.19 — Legend Audio Pass

PixelForge v5.19 supplies the first real audio cue pack for **The Legend of More Bounce** and removes the machine-side “no audio assets” blocker discovered during v5.18 Gold Standard Playtest.

## Original cue pack

Four loopable scene themes:

- `title` — title-screen theme
- `overworld` — Bouncehome Grove
- `woods` — Wobble Woods
- `tower` — Larrina Tower

Six event cues:

- `bounce-impact`
- `rune-pickup`
- `gate-open`
- `dialogue-blip`
- `hit`
- `ending`

All cues are local PCM16 WAV files generated from deterministic oscillator/noise synthesis with original note patterns. No external samples, recordings, or copyrighted game music are used. The generator source remains in `tools/generate_legend_audio_v519.py` so the pack can be reproduced and inspected.

## Runtime behavior

Audio starts disabled in standalone browser builds because browsers restrict autoplay. The player explicitly enables sound. Once enabled:

- Bouncehome Grove loops the overworld theme.
- Wobble Woods loops the woods theme.
- Larrina Tower loops the Tower theme.
- Bounce pads, Rune pickup, Echo Gate, falls, dialogue advances, and completion trigger their matching SFX.
- The ending stops scene music and plays the completion sting.

The React cartridge uses the same repository WAV files and preserves the same explicit sound-on boundary.

## Evidence boundary

v5.19 can prove that audio files exist, match their SHA-256 hashes, use the declared format, are locally packaged, and are bound to runtime events. It **cannot** prove that the compositions sound good, that the mix is comfortable, or that the music makes the game more fun. Those remain human Gold Standard review questions.

The phrase **SNES-inspired** describes the intended 16-bit-era aesthetic. PixelForge does not claim hardware-accurate SPC700/DSP emulation.
