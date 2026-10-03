# Parallax PixelForge v5.2 — 369 PocketGames Export Alpha

v5.2 turns PixelForge from a private creator OS candidate into a public-community-ready forge with a clear mobile product lane.

## Canon split

- **PixelForge Studio** is the free/open creator forge.
- **369 PocketGames** is the premium micro-game publishing label and export profile.
- **Journey to the Parallax Pyramid** is Candidate #001 for the mobile export lane.

## Design promise

A 369 PocketGame should feel small, complete, honest, and memorable.

The player should feel the promise quickly:

1. **10 seconds:** I understand what to do.
2. **30 seconds:** Something here made me smile.
3. **60 seconds:** I trust this game. No ads, no traps, no fake pressure.
4. **5 minutes:** There is more depth than I expected.
5. **After leaving:** I want to come back.

## v5.2 additions

- `pocketgames/journey_to_parallax_pyramid.pocketgame.json`
- `pocketgames/templates/pocketgame_manifest.template.json`
- PocketGame manifest validator
- Store page generator
- Mobile QA receipt generator
- Community contribution rules
- GitHub launch checklist
- Rights and licensing notes
- PWA/mobile metadata for the Journey demo cartridge

## Release boundary

This is still an alpha export lane. It does not yet create signed Android/iOS builds. It prepares the manifest, store copy, mobile QA receipt, and PWA metadata needed before a wrapper such as Capacitor, Expo, or a platform-native shell is selected.

## Recommended next technical step

Add a real `mobile-export` command that can package a built cartridge into one of these targets:

- PWA/web install package
- Android wrapper candidate
- iOS wrapper candidate
- screenshot capture checklist
- app-store metadata bundle

Until then, v5.2 is the governance and packaging bridge: it tells us whether a cartridge is ready to become a phone game.
