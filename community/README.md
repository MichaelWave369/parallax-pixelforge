# PixelForge Community Cartridge Shelf

The v5.5 community layer is deliberately **local-first and file-based**.

It provides:

- `catalog.json` — portable machine-readable cartridge catalog,
- `index.html` — zero-install shelf with local JSON import/export,
- deterministic review receipts in `exports/reviews/`,
- structured local playtest receipts in `community/playtests/`,
- visible creator credits and review badges.

No account, chat service, remote database, ranking feed, or hidden telemetry is required.

## Build the shelf

```bash
npm run community:shelf
```

Open `community/index.html` directly in a browser, or serve the repo with `npm run start` and visit `/community/`.

## Review a cartridge

```bash
npm run check:mobile -- games/my-game
npm run community:review -- games/my-game
npm run community:shelf
```

## Record a human playtest

```bash
npm run community:playtest -- my-game --tester "Local Tester" --fun 5 --clarity 4 --difficulty 3 --replay 5 --notes "Short and fun."
npm run community:shelf
```

A playtest receipt contains only fields the tester explicitly supplies.
