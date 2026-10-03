# Cartridge Submission Rules

PixelForge welcomes tiny games, learning cartridges, templates, experiments, and polished 369 PocketGames candidates.

## Required for every submitted cartridge

- It runs locally.
- It has a short README.
- It has a clear title and one-sentence description.
- It has rights notes for art, audio, story, code, and fonts.
- It does not include stolen/ripped assets.
- It does not rely on hidden tracking.
- It does not require accounts or remote servers unless clearly reviewed and approved.
- It avoids deceptive or manipulative monetization.
- It is scoped small enough for maintainers to understand.

## Rights rule

Only submit assets you have the right to share. When in doubt, leave it out or replace it with a placeholder.

Allowed by default:

- original art/audio/text,
- CC0/public-domain assets,
- explicitly compatible open-license assets with attribution,
- placeholders made for the cartridge.

Not allowed by default:

- ripped game sprites,
- copyrighted music,
- trademarked characters,
- franchise fan-game assets,
- images downloaded from search results,
- unclear AI-generated assets without a rights note.

## Claim-boundary rule

If a cartridge references science, health, history, spirituality, psychology, mythology, AI, consciousness, or real people, add clear boundary language.

Example:

```text
This cartridge uses symbolic/mythic themes for fictional gameplay. It does not make historical, medical, scientific, or spiritual proof claims.
```

## 369 PocketGames candidate rule

A 369 PocketGames candidate must include a manifest in `pocketgames/` and pass:

```bash
npm run validate:pocketgame
npm run pocketgames:all
```

It must also preserve the 369 PocketGames promise:

- no ads,
- no predatory in-app purchases,
- no loot boxes,
- no energy timers,
- no required online account,
- offline playable where feasible,
- complete little experience,
- mobile readable,
- paid-once design.

## Review statuses

Maintainers may label submissions as:

- **learning-example** — useful for teaching, not polished.
- **community-cartridge** — playable user-created game.
- **pocketgames-candidate** — possible 369 PocketGames release after review.
- **needs-rights-review** — asset/license boundary unclear.
- **needs-claim-boundary** — theme requires clearer public wording.
- **needs-scope-trim** — too large or unfocused.
- **blocked** — cannot merge in current form.

## The spirit

We are not trying to create a noisy pile of unfinished projects. We are trying to help people finish tiny worlds that feel cared for.
