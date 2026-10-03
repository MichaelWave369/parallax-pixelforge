# Release Notes — PixelForge v5.3.0-alpha

## Release name

**Public GitHub Launch Kit**

## What changed

PixelForge v5.3 prepares the project for public GitHub release and community cartridge creation.

The project now has a clear public split:

```text
PixelForge Studio      = free/open-source forge
Sample cartridges      = learning examples
Community cartridges   = user-created tiny worlds
369 PocketGames        = polished premium mobile output label
```

## Added

- Public README rewrite.
- Starter cartridge template at `games/_template/`.
- First-cartridge tutorial.
- Cartridge submission rules.
- Maintainer release playbook.
- Public roadmap.
- GitHub issue templates.
- Pull request template.
- GitHub Actions validation workflow.
- Public release validator.
- Repo index generator.
- Content license notice.
- Journey cartridge rights notes.

## Acceptance command

```bash
npm run github:preflight
```

This passed for the packaged v5.3 alpha.

## Still gated

This release does not enable production public networking, free-text chat, accounts, hidden profiling, remote save sync, app-store signing, or automatic public publishing.

## Recommended next build

**v5.4 Creator Onboarding Polish**

Recommended next additions:

- one-command cartridge generator,
- beginner asset pack with clean rights,
- screenshot helper,
- store asset helper,
- improved mobile readability checks,
- better first-run onboarding.
