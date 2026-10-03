# PixelForge v5.8 — SNES Asset Forge

## Goal

Turn the v5.7 visual doctrine into a reusable, auditable asset-production contract.

## Added in v5.8

- PixelForge SNES House Foundation asset pack contract
- four reusable 16-color house palettes
- per-cartridge `asset-profile.json`
- sprite/tile/interior/UI/effects/audio slot vocabulary
- deterministic asset-profile validator and receipts
- generated asset catalog/inventory
- new-cartridge asset-profile inheritance
- PocketGames asset-contract production gate and required-asset retail gate
- Legend asset specification for More Bounce, Larrina, Bouncehome Grove, Wobble Woods, Larrina Tower, UI, effects, and audio

## Legend status

`asset-contract-pass-content-pending`

That status is intentional. The asset architecture is complete, while the final original pixel-art sheets remain to be created and reviewed.

## Production intake commands

```bash
npm run asset:check -- games/my-cartridge
npm run asset:briefs -- games/my-cartridge
npm run asset:attach -- games/my-cartridge SLOT_ID /path/to/file.png --rights original --source-note "..."
npm run asset:catalog
```

The attachment flow copies the supplied file into the cartridge's public asset tree, refuses overwrite, records SHA-256, and updates only the named slot. `licensed` and `public-domain` are allowed rights states, but the project must still preserve the supporting license/source evidence separately.
