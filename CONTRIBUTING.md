# Contributing to Parallax PixelForge

Thanks for helping build the tiny-world forge.

PixelForge is a creative porch for people who want to finish small retro games with care.

## What PixelForge is for

PixelForge is for making small, heartfelt, local-first retro game worlds that people can actually finish.

The public project has four lanes:

```text
PixelForge Studio      = open-source forge
Sample cartridges      = runnable learning examples
Community cartridges   = user-created tiny worlds
369 PocketGames        = polished premium mobile candidates
```

## Good first contributions

- Fix typos in docs.
- Improve mobile readability.
- Improve the starter cartridge template.
- Add original/CC0-safe tile or UI ideas.
- Create a tiny cartridge from `games/_template/`.
- Improve validators or exporter scripts.
- Add playtest notes and QA receipts.

## Before opening a pull request

Run what applies:

```bash
npm test
npm run validate:demo
npm run validate:journey-cartridge
npm run pocketgames:all
npm run validate:public-release
```

For a full public launch check:

```bash
npm run github:preflight
```

## Cartridge contribution checklist

Before submitting a cartridge, confirm:

- [ ] It runs locally.
- [ ] It has a clear title and short description.
- [ ] It has a short README.
- [ ] It does not require accounts, remote servers, hidden tracking, or public chat.
- [ ] It does not include unlicensed assets or copyrighted franchise material.
- [ ] It avoids manipulative monetization patterns.
- [ ] It includes a rights note for art/audio/text/fonts/code.
- [ ] It includes claim-boundary notes if it uses myth, spirituality, science, wellness, AI, history, or real people.
- [ ] It can be understood by a new player quickly.
- [ ] It is small enough to finish.

## 369 PocketGames candidates

A 369 PocketGames candidate must include a manifest in `pocketgames/` and pass:

```bash
npm run validate:pocketgame
npm run pocketgames:all
```

A candidate must preserve the 369 PocketGames promise: paid once, no ads, no predatory in-app purchases, no subscriptions, no loot boxes, no energy timers, offline-playable where feasible, complete, and mobile-readable.

## Rights and content

Do not contribute assets you do not have the right to share. This includes ripped game sprites, copyrighted music, trademarked characters, unclear AI outputs, and images downloaded from the web without a compatible license.

Engine/source code is MIT licensed unless a file says otherwise. Game content may have separate rights boundaries. Read `LICENSE-CONTENT-NOTICE.md` before reusing sample content commercially.

## Tone and community

Build like this is a creative porch, not a clout arena. Be kind, credit people, keep boundaries clear, and make the next creator feel brave enough to try.
