# PixelForge v5.25 — World Map / Fast Travel / Checkpoint Shrines

## Purpose
Give The Legend of More Bounce a proper multi-chapter navigation layer without allowing travel to erase exploration or bypass progression.

## Travel rules
1. A landmark must be earned/discovered through normal play before it appears as usable.
2. A landmark must be activated before it becomes a fast-travel destination.
3. Bouncehome Shrine is the starting active landmark.
4. Larrina Tower Beacon and Iron Orchard Shrine activate on first earned arrival.
5. The Eastern Beacon activates only after the Signal Mill / Beacon Lens objective is completed.
6. Travel targets safe scene boundaries only; it does not resume mid-platform, mid-puzzle, or mid-boss.
7. Fast travel grants no items, quest flags, boss defeats, or unexplored content.

## Save compatibility
Current schema: `pixelforge.legend-save.v5.25`, schema version 2.

v5.24 saves are accepted and migrated additively. Bouncehome is activated by default; the Eastern Beacon is restored during migration only when the old save already contains the Beacon Lens / completed eastern-beacon progression.

## Privacy
Travel state lives inside the same local-first Legend save record. There is no cloud account, server sync, analytics, or travel telemetry upload.

## Human gates
Machine checks can verify landmark state, save migration, and progression rules. Humans still decide whether the map is readable, shrine locations feel natural, and fast travel improves the adventure without trivializing exploration.
