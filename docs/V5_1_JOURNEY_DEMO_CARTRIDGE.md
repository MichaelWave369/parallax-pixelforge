# Parallax PixelForge v5.1 — Journey Demo Cartridge Candidate

This release candidate adds the uploaded React game prototype as a proper PixelForge bundled demo cartridge.

## Game

**Public demo title:** Journey to the Parallax Pyramid
**Source title:** Parallax Trail: The Pyramid at Shasta
**Source file:** `games/journey-to-parallax-pyramid/src/App.jsx`
**Cartridge manifest:** `data/journey_to_parallax_pyramid.v5.1.cartridge.json`

## Why this fits PixelForge

The game already demonstrates the PixelForge promise:

- a complete local-first playable loop,
- a strange heartfelt road-trip structure,
- resource and virtue systems,
- party/crew identity,
- encounters, quests, badges, and gate trials,
- local save/load continuity,
- an archive/receipt framing that maps cleanly to PixelForge’s receipts and shelf system.

## Public release boundary

This cartridge is safe to stage as a public demo candidate because it does not require accounts, networking, public BBS, free-text chat, remote saves, or hidden AI memory. It should still receive a final rights/asset/text review before a public MIT repo launch.

## Recommended next passes

1. Public title polish: choose whether the title screen should say `Journey to the Parallax Pyramid`, `Parallax Trail`, or both.
2. Add original box art and cartridge art placeholders.
3. Add the cartridge to the PixelForge shelf as the default `Play Demo` item.
4. Run a full browser playtest and export a feedback receipt.
5. Build the public repo README around this as the flagship demo.
