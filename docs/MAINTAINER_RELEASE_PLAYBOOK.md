# Maintainer Release Playbook

This playbook is for cutting public PixelForge releases.

## 1. Preflight

Run:

```bash
npm run github:preflight
```

Confirm generated files are expected:

```text
docs/REPO_INDEX.md
exports/store-pages/*.store-page.md
exports/qa/*.mobile-qa.receipt.md
```

## 2. Public boundary review

Confirm these remain locked/off by default:

- public BBS,
- public relay networking,
- free-text chat,
- hidden profiling,
- remote saves,
- automatic tester outreach,
- production app-store signing.

## 3. Rights review

Check:

- `LICENSE`
- `LICENSE-CONTENT-NOTICE.md`
- `docs/LICENSING_AND_RIGHTS.md`
- each cartridge `RIGHTS.md`
- generated rights receipts in `exports/qa/`

## 4. Sample cartridge review

For every included sample cartridge:

- run it locally,
- confirm the README is accurate,
- confirm no private notes are included,
- confirm content is public-safe,
- confirm the player can understand the first minute.

## 5. Release notes

Add a top changelog entry with:

- version,
- date,
- major additions,
- known boundaries,
- next recommended build.

## 6. Tagging suggestion

Suggested tag format:

```text
v5.3.0-alpha
```

## 7. What a release tag does not mean

A GitHub release tag does not mean:

- app-store approval,
- legal approval,
- security approval,
- commercial publishing approval,
- production multiplayer readiness.

It only means the open-source package is ready for public inspection and contribution.
