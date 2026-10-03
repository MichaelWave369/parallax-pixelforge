# PixelForge v5.7 — SNES Style Lock

## Goal

Make 16-bit expressive pixel adventure presentation the default PixelForge house lane and make visual-era claims auditable.

## Added in v5.7

- `PIXELFORGE_VISUAL_DOCTRINE_v1.0.md`
- SNES Style Review Gate
- cartridge visual-profile metadata
- `scripts/validate_visual_style.js`
- style review JSON + Markdown receipts
- visual badge integration in community review
- v5.7 release validator
- Legend of More Bounce designated `PF_GOLD_STANDARD_001`
- richer Legend source scenes: title screen, denser overworld, layered Wobble Woods, furnished Larrina Tower

## Default profile for newly generated cartridges

```json
{
  "visualEra": "16-bit",
  "styleProfile": "snes-adventure",
  "presentationTier": "expressive-pixel",
  "environmentDensity": "layered",
  "uiProfile": "framed-16bit",
  "audioProfile": "snes-inspired",
  "defaultTileSize": 16,
  "heroSpriteTarget": "32x48",
  "artDirectionStatus": "house-default"
}
```

Creators may deliberately choose another lane. The important rule is that the lane is explicit rather than accidental.
