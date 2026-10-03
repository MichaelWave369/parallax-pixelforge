# PixelForge Asset Forge Contract v1.0

## Purpose

PixelForge v5.8 formalizes reusable SNES-lane assets without pretending unfinished art exists. Every cartridge may declare an `asset-profile.json` that maps required visual/audio roles to explicit slots.

## Required principles

1. **Declare the lane first.** Asset profiles must match the cartridge visual era and style profile.
2. **Missing art is a state, not a failure of honesty.** Use `awaiting-art` / `awaiting-audio` until a real file exists.
3. **Ready means inspectable.** A slot marked `ready` must point to an existing file and have a non-pending rights status.
4. **Production candidate != retail ready.** A complete asset contract is required for a production candidate. Every required asset slot must be ready before retail release can pass.
5. **Human visual judgment remains authoritative.** Machine checks can confirm dimensions, slot coverage, paths, metadata, and rights declarations; they cannot certify beauty or originality.

## Core slot types

- hero sprite sheet
- NPC sprite sheet
- portrait set
- environment tileset
- interior kit
- UI frame kit
- effects sheet
- audio cue pack

## Default 16-bit targets

- tile: 16×16
- hero/NPC frame: ~32×48
- effects: ~32×32
- portraits: ~96×96
- UI: nine-slice capable framed panels

## Rights boundary

Do not import ripped commercial game assets, ROM graphics, protected characters, or unlicensed third-party packs into the house foundation. Every externally sourced asset must carry an explicit source/license record before it can become `ready`.
