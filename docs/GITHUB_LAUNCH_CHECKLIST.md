# GitHub Launch Checklist

Use this before making the public PixelForge repository visible.

## Required command

```bash
npm run github:preflight
```

This runs the root validator, demo validator, cartridge validator, 369 PocketGames exporter, repo index generator, and public release validator.

## Public repository checklist

- [ ] README explains PixelForge Studio, sample cartridges, community cartridges, and 369 PocketGames.
- [ ] `package.json` has `private: false`.
- [ ] License is present.
- [ ] Content license notice is present.
- [ ] Contributor guide is present.
- [ ] Code of conduct is present.
- [ ] Issue templates are present.
- [ ] Pull request template is present.
- [ ] GitHub validation workflow is present.
- [ ] Starter cartridge template is present.
- [ ] First-cartridge tutorial is present.
- [ ] Cartridge submission rules are present.
- [ ] Maintainer playbook is present.
- [ ] Public roadmap is present.
- [ ] Repo index is generated.

## Content / rights checklist

- [ ] Demo cartridge content reviewed for public release.
- [ ] Rights notes included for each sample cartridge.
- [ ] No private documents or personal notes included accidentally.
- [ ] No ripped sprites, copyrighted music, franchise characters, unclear web images, or private assets.
- [ ] Claim-boundary notes included where needed.

## Technical checklist

- [ ] Root app runs locally.
- [ ] Journey sample cartridge runs locally.
- [ ] Root tests pass.
- [ ] PocketGames manifest validates.
- [ ] Store page seed generates.
- [ ] Mobile QA receipt generates.
- [ ] Public release validator passes.

## Boundaries locked/off by default

- [ ] Public BBS disabled.
- [ ] Public relay networking disabled.
- [ ] Free-text chat disabled.
- [ ] Hidden profiling absent.
- [ ] Remote save overwrite disabled.
- [ ] Automatic tester outreach disabled.
- [ ] App-store production signing absent.
- [ ] Unreviewed public asset publishing absent.

## Suggested first public release description

> PixelForge is an open-source retro Creator OS for making tiny heartfelt games. v5.3 includes the public GitHub launch kit, a runnable Journey demo cartridge, a starter cartridge template, and the first 369 PocketGames mobile/premium export lane.
