# SNES Style Review Gate

PixelForge v5.7 adds two distinct visual gates.

## Gate A — deterministic source audit

`npm run style:check -- games/<slug>`

This checks observable repository evidence such as visual-profile metadata, palette breadth, sprite footprint declarations, layered-scene source markers, framed UI, animation hooks, mobile safeguards, and reduced-motion support.

A passing receipt is stored under `exports/style-reviews/`.

## Gate B — human gold-standard signoff

A deterministic audit cannot decide whether a cartridge actually *looks* like a polished lost 16-bit game. Human review must evaluate:

- visual cohesion;
- scene richness;
- sprite expressiveness;
- readability at play speed;
- whether the declared SNES lane is genuinely earned;
- whether placeholder or primitive art remains visible.

Until that review exists, a gold-standard candidate should report:

`source-contract-pass-human-visual-review-pending`

This prevents style laundering: metadata cannot turn weak visuals into a gold-standard claim.
