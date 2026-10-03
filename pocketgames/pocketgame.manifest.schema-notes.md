# 369 PocketGames Manifest Notes

This folder defines the v5.2 alpha publishing layer for tiny premium PixelForge cartridges.

The manifest is intentionally simple JSON before it becomes a formal JSON Schema. The validator checks the most important release promises:

- the game is a `369.pocketgame.manifest`,
- the price model is paid-once premium,
- the target price is present,
- ads, subscriptions, loot boxes, energy timers, and predatory IAP are disabled,
- offline play is expected,
- mobile orientation and tap target are declared,
- store copy seeds are present,
- rights and claim-boundary reviews are not skipped,
- at least one release gate is present.

Use `pocketgames/templates/pocketgame_manifest.template.json` for new community cartridges.
