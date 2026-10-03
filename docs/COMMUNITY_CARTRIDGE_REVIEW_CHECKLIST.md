# Community Cartridge Review Checklist v5.5

Use this before featuring a cartridge on the generated shelf.

- [ ] Cartridge has `cartridge.meta.json`.
- [ ] Cartridge has a short `README.md`.
- [ ] `RIGHTS.md` states code/content/art/audio rights boundaries.
- [ ] `CREDITS.md` names creators/contributors without inflating authorship claims.
- [ ] A claim boundary is present when real-world themes could be mistaken for verified claims.
- [ ] Mobile readability check passes.
- [ ] Cartridge runs local-first or clearly declares any reviewed network dependency.
- [ ] No hidden analytics or profiling is present.
- [ ] No ripped or unclearly licensed assets are present.
- [ ] Human playtest notes are separated from automated QA evidence.

Run:

```bash
npm run check:mobile -- games/<slug>
npm run community:review -- games/<slug>
npm run community:shelf
```

A deterministic PASS means the repository evidence is present. It does not replace legal review, security review, or human judgment about game quality.
