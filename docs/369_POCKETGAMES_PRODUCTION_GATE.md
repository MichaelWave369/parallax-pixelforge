# 369 PocketGames Production Gate

## Production candidate — machine-verifiable gates

A cartridge may enter the production-candidate lane only when all of these pass:

- rights declarations and creator credits exist,
- declared-rights receipt is generated,
- v5.5 community review passes,
- mobile readability passes with zero errors,
- deterministic browser proof passes with zero page errors,
- standalone offline playable exists,
- at least four screenshots exist,
- paid-once/no-ads/no-traps monetization boundary remains intact.

## Retail release — human gates

Production-candidate status is not permission to sell.

A paid public release additionally requires:

- named human $3.69 worthiness signoff,
- named human final store-art signoff,
- any platform-specific signing/account/legal steps required by the selected store.

Record a human playtest with optional value rating:

```bash
npm run community:playtest -- the-legend-of-more-bounce \
  --tester "Name" --fun 5 --clarity 5 --difficulty 3 --replay 4 \
  --price-worthiness 5 --notes "Why the finished build feels worth the price."
```

Record final store-art approval only after a human has actually reviewed it:

```bash
npm run pocketgames:art-signoff -- the-legend-of-more-bounce \
  --reviewer "Name" --pass yes --notes "Final icon and store presentation approved."
```

Then rerun:

```bash
npm run pocketgames:promote
```
