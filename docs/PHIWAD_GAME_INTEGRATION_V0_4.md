# Michael & Ori ΦWAD Edition | Custom Level Loader v0.4

This is the first **game-owned** ΦWAD loader path. It patches a **new copy** of the downloadable Michael Wave & Ori: Break the Matrix v0.2.1 source archive. It does not modify the live ChatGPT-hosted site or overwrite the source ZIP.

## One-click GitHub workflow

After this PR merges:

1. Open the PixelForge GitHub repository **Actions** tab.
2. Select **Build Michael & Ori ΦWAD Edition**.
3. Choose **Run workflow**.
4. Once it passes, download the **Michael-Ori-PhiWad-v0.3.0** workflow artifact. Inside is a standalone ZIP of the original game with an opt-in custom-mission loader.

The workflow fetches the publicly downloadable game source from its published URL. Source drift fails the install rather than blindly patching files. A green packaging run does **not** mean the new browser gameplay has been manually qualified.

## Local build alternative

Download the game's original source: 
https://michael-wave-ori-break-the-matrix.microneesia79.chatgpt.site/game-source.zip

From a PixelForgeStudio checkout, run:

```sh
python scripts/install_ori_phiwad.py /path/to/game-source.zip Michael-Ori-PhiWad-v0.3.0.zip
python -m unittest discover -s tests -p phiwad_integration_test.py -v
```

This installer reads the original archive without extracting it, validates expected v0.2.1 source anchors and emits a **new** ZIP with the same game folder structure. It refuses to overwrite an existing output.

## What the patched game adds

The title screen gets a **LOAD ΦWAD CUSTOM MISSION** button. Select a mission-bearing `.phiwad` made in PixelForge's ΦWAD Mission Builder. The loader validates the package, creates a temporary custom sector, uses the original Game combat/weapon/Ori AI update loop, and supplies the verified 29×25 map, player spawn, enemies, relays, pickups, captives, key and extraction.

Original Xbox controller, keyboard and mouse input handlers are reused. It does not execute files inside the package. All original shipped levels remain unchanged and the appended custom sector is removed on quit or custom victory.

The original campaign save key is unchanged and cannot be written while a custom mission is active. **Custom mission checkpoints exist only during that play session.** On the custom mission's completion screen, Return to Campaign starts a new campaign game. Existing Continue checkpoint remains untouched.

The source's level decorator receives a fallback for the custom seventh sector and the offline service-worker cache list gains all added local modules.

## Limits / acceptance boundaries

- **This is an opt-in source-archive build, not an automatic update to the published game URL.** You must deploy the patched build separately to test it in the browser.
- This bridge handles static walls and existing enemy types, items, relays and extraction. No new custom doors, textures, secret walls, mission scripts, new audio, or multi-map campaigns.
- Custom missions have **no persistent saves** until we create a separate save namespace with its own upgrade/validation rules.
- The original game has static campaign-dependent rendering/HUD text. We override the custom victory text; some stats and Act II visual themes still depend on sector index.
- Automated tests assert source anchoring, package integrity and non-overwrite behavior. They do **not** prove manual playthrough, Quest 3 or Bluetooth performance.
- The ZIP importer uses the ΦPACK strict bounded data-only parser. CRC32 only detects corruption; it cannot certify a downloaded author. Respect asset ownership and license rights.

## Human QA checklist

- Play the original campaign sectors, confirm Act I/Act II progress and boss endings.
- Create a custom mission in PixelForge, export `.phiwad`, load it via the title screen, and finish relays/key/exit.
- Test controller movement, shooting, Ori ability, enemy behavior and loss/retry.
- During a custom mission quit or reload, confirm that **Continue** still restores the original saved campaign.
- Play offline after initial cache install and inspect developer console for module import failures.

**Status:** integration code and packaging mechanism added in this PR. Live deployment and controller/browser playtest remain separate required checks.

## Build #1 failure and repair

The first manual workflow run failed after successfully downloading the published ZIP, because the installer matched `showScreen('result-screen');}` as one exact token. In the updated real game source the closing brace is on a new line and a twelve-sector Act III/IV expansion has a `def.theme` fallback. The repaired installer matches the stable `showScreen('result-screen');` call and preserves that fallback, while the integration loader records the current campaign sector count dynamically and appends/removes only its custom level. Regression coverage includes both old and modern syntax. The GitHub build workflow now also runs on relevant pull requests, downloads the real source and proves successful archive patching before merge.
