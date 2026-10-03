# v5.3 Public GitHub Launch Kit

## Purpose

v5.3 turns PixelForge from a private/local package into a public-ready open-source project with a clear creator path.

The release split is:

```text
PixelForge Studio      = free/open-source forge
Sample cartridges      = learning examples
Community cartridges   = user-created worlds
369 PocketGames        = polished premium mobile label
```

## What v5.3 adds

- Public-first README rewrite.
- First-cartridge tutorial.
- Starter cartridge template.
- Cartridge submission rules.
- Maintainer release playbook.
- Public roadmap.
- GitHub issue templates.
- Pull request template.
- GitHub Actions validation workflow.
- Public release validator.
- Repo index generator.
- Content/license boundary notice.

## Creator journey

A new creator should be able to land on the repo and understand this path:

1. Run PixelForge locally.
2. Play the Journey sample cartridge.
3. Copy the starter cartridge template.
4. Make one tiny loop.
5. Add original/license-safe assets.
6. Run the checks.
7. Submit a cartridge or share it independently.
8. Optionally promote it into a 369 PocketGames candidate.

## Maintainer journey

Maintainers should be able to review contributions by checking:

- Does it run?
- Is the scope tiny enough to finish?
- Are asset rights clean?
- Are claim boundaries clear?
- Does it avoid hidden tracking and manipulative monetization?
- Does it help the next creator learn?

## Public safety boundary

v5.3 does **not** enable:

- public networking,
- free-text chat,
- hidden profiling,
- public account systems,
- app-store signing,
- unreviewed asset publishing,
- automatic community uploads.

Everything remains local-first and review-led.

## Acceptance command

```bash
npm run github:preflight
```

A passing preflight means the repository is structurally ready for a public GitHub cut. It does not mean the project has completed legal review, security review, app-store review, or production publishing approval.
