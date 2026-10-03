# PixelForge v5.5 — Community Cartridge Shelf

## Goal

Turn the v5.4 creator workflow into a small, inspectable local arcade ecosystem without adding accounts, remote services, chat, or algorithmic attention feeds.

## Implemented v5.5 surfaces

1. **Community catalog** — `community/catalog.json` is generated from real cartridge metadata and review receipts.
2. **Zero-install shelf** — `community/index.html` embeds the generated catalog and can be opened directly in a browser.
3. **Local import/export** — the shelf can export its catalog as JSON and temporarily load another compatible local catalog file.
4. **Creator credits view** — every review-ready featured cartridge carries explicit `CREDITS.md` provenance.
5. **Visible review badges** — rights, creator credits, claim boundary, mobile readability, and local-first runtime are surfaced separately.
6. **Featured learning cartridges** — Journey to the Parallax Pyramid and The Legend of More Bounce seed the first shelf.
7. **Playtest receipt loop** — human playtests can be recorded locally with explicit fields; automated browser tests remain distinguishable from subjective human ratings.

## Workflow

```bash
npm run new:cartridge -- "My Tiny Game"
npm run check:mobile -- games/my-tiny-game
npm run community:review -- games/my-tiny-game
npm run community:playtest -- my-tiny-game --tester "Tester" --fun 5 --clarity 4 --replay 5
npm run community:shelf
```

## Governance boundary

The v5.5 shelf is a **catalog and receipt layer**, not a social network.

Still gated:

- public accounts,
- remote submission ingestion,
- free-text public chat,
- hidden profiling,
- engagement ranking,
- remote save sync,
- automatic public publishing,
- app-store signing.

The shelf can grow into hosted community infrastructure later, but the portable local format comes first.
