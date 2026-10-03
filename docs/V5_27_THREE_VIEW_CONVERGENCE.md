# PixelForge v5.27 — Three-View Convergence

## Purpose
Chapter Five turns Legend's founding idea — **one world, three ways of seeing it** — into a persistent gameplay dependency rather than a presentation trick.

## Causal chain
1. **Mirrorfall Basin / top-down** — align cyan, magenta, and gold prism pylons. This produces `worldBeamAligned`.
2. **Splitlight Causeway / side-view** — the aligned beam enables reflected platforms. Strike all three Pulse Nodes to produce `pulseNodesPowered`.
3. **Triune Observatory / first-person** — powered shutters accept `ROOT → PULSE → LENS`, producing `viewSigil`.
4. **The Blind Angle** — three boss phases consume the same viewpoint order: top-down prism, side-view pulse, first-person lens. Victory awards the Convergence Crown.

## Persistence
- Save contract: `pixelforge.legend-save.v5.27`, schema version 4.
- Imports v5.24, v5.25, and v5.26 saves additively.
- Prism, Pulse Node, lens, boss, and reward state persist across sessions.
- Travel network expands to six earned landmarks with Mirrorfall Observatory.
- No cloud account, network sync, or telemetry is introduced.

## Evidence boundary
Machine checks can prove the causal links exist, migration is coherent, assets/audio are hashed, and required state gates are present. They cannot prove the cross-view puzzle is understandable, switching views is enjoyable, The Blind Angle is readable, pacing is good, or the cartridge earns a retail price. Those remain human review gates.
