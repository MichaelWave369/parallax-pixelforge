# PixelForge Layer Studio — Rung 22: Device & Input Test Matrix

## Four separate real-game test lanes, never automatic cross-platform green

Rung 21 introduced authoring test missions with two explicitly separate records per authored story goal: **verified hypothetical narrative coverage** and an **author-reported manual gameplay outcome**. Rung 22 adds a **third, independent layer**: an author-reported outcome for a specific **device and input method**. A generic mission pass is not automatically a desktop pass, controller pass, touch pass or Quest 3 VR pass.

These are **author statements**, not automated gameplay telemetry. No part of Rung 22 launches a game, detects hardware, impersonates a player, accesses physical devices, certifies VR support, or proves that a reported test was actually performed.

## Supported input profiles

| Profile | Intended platform | Input |
| --- | --- | --- |
| **Desktop Keyboard + Mouse** | Desktop browser | Keyboard and mouse |
| **Xbox Controller** | Desktop or console-compatible browser | Gamepad |
| **Mobile Touch** | Phone/tablet browser | Touchscreen |
| **Quest 3 WebXR** | Meta Quest 3 browser | Tracked VR controllers |

These are labeled **testing categories**, not claims that every authored game supports all four. Choose only the actual hardware/input combination tested. For example, a conventional desktop 2D game might have no meaningful Quest 3 tracked-controller test. An untested cell remains **Not tested**; do not mark it passed because a different platform works.

## Workflow

Navigate to **PixelForge → Layer Studio → World Branch Map → Rung 21 / Authoring Test Missions → Rung 22 / Device & Input Test Matrix**.

1. Create a Rung 21 release mission and add one or more authored story goals, such as *Carry the forgotten promise* or *Release the echo into silence*.
2. Rung 22 displays a horizontally scrollable **mission goal × device/input profile** table with separate cells for Desktop Keyboard + Mouse, Xbox Controller, Mobile Touch and Quest 3 WebXR.
3. A row shows the goal's current **SIM** status from verified hypothetical Rung 16/Rung 18 narrative receipts. Each device cell initially shows **Not tested**. Even a generic Rung 21 manual pass will not fill any of these.
4. Click a cell to select its authored goal and device profile, or use the **Mission Goal** and **Device / Input Profile** selectors.
5. Select **Author-reported pass**, **fail**, or **blocked**. Describe the actual **OS, browser and hardware** used (3–120 characters) and **what happened during real gameplay** (8–500 characters).
6. Tick **I personally tested this mission goal on the selected physical device and input method in the actual game**. It begins unchecked **every time** a cell is selected or reloaded. Press **Record Selected Device Result**. The UI rejects a result without confirmation, notes, actual environment and a loaded Room Atlas.
7. If you need to withdraw an earlier claim, select **Not run / clear selected result**. This removes that one profile's stored result and does not change other profiles.
8. **Export Device Matrix JSON** downloads all bounded, versioned author reports. **Merge Selected Reports** imports a valid JSON export (up to 450 KB), adds new mission/goal/profile records and **keeps the existing local record when IDs collide**. Imported claims are not independently authenticated; the viewer labels them author-reported. Imported reports that no longer match an existing mission/goal/target remain excluded from coverage and are explicitly counted as **unmatched stored reports**.

The editor locally persists this sidecar record under **\`pixelforge.layer-device-input-matrix.v1.local\`**, separate from Rung 21 mission-book storage, the Rung 17 scenario catalog, editor scene saves and gameplay saves. If browser storage is unavailable, the UI warns that the current in-memory data must be exported.

## Independent readiness semantics

Each table cell is computed from these independent facts:

- **SIM:** the exact authored narrative target has at least one currently verified *hypothetical* route receipt. This remains a simulation, never proof of physical gameplay.
- **DEVICE:** the author explicitly reported a hands-on pass/fail/blocked on the **selected device and input method**, with notes and environment on the current authored world.
- **BOTH:** the cell receives its complete status **only** if SIM is currently verified **and** that exact device/input pair has an author-reported pass. This is *not independent device certification*.

An Xbox-controller pass does not color Desktop, Mobile or Quest 3 as passed. A Rung 21 generic manual pass does not color any device cell. A failed or blocked Quest 3 test remains actionable even if the narrative route is internally consistent.

A mission goal has *all four profiles accounted for* only when all four independent cell checks pass, but this is a descriptive matrix count, **not a release requirement** for every project and not certification of all platforms.

## Authored-world staleness and deleted goals

Rung 22 reuses Rung 21's **full Room Atlas noncryptographic change detector**, which includes the current authoring data rather than just the narrative topology. Changing a room's visual layer can leave SIM verified while making an older physical observation **STALE**. Historical notes remain readable, but do not count as a current pass.

Records include the original **authored target ID**, not merely a reusable numeric \`goal-N\`. If the goal is deleted and a new goal happens to reuse the same ID, an old report for a different authored target cannot count against it. Editor-initiated removal of a mission or goal also cleans its associated Rung 22 device records. Imported orphan reports may be retained for archival inspection but never count for a current goal.

The world fingerprint is not a cryptographic build signature. This cannot detect all changes to external libraries, server assets or gameplay binaries that sit outside the Room Atlas, and cannot prove where the author performed the test.

## Implementation

- **\`layer-studio/story-device-matrix.js\`**: pure, bounded, versioned data model \`pixelforge.layer-device-input-matrix.v1\`; four input profiles; strictly attested self-reported outcomes; authoring-target identity; exact-world staleness; non-destructive import merge; explicit orphan cleanup and current coverage review. Up to 512 profile/goal records, 400 KB of JSON.
- **\`layer-studio/studio.js\`**: separate browser-storage key and in-memory fallback, interactive scrollable goal/device table, independent manual attestation form and environment field, click-to-select cells, portable JSON export/import, and cleanup on mission/goal deletion.
- **\`layer-studio/index.html\`**, **\`studio.css\`**: accessible table with real text statuses, desktop/mobile scrolling, checked-versus-stale contrasts and keyboard-operable controls.
- **\`tests/layer-device-input-matrix.test.js\`**: mandatory under \`npm run test:studio\`; checks the real Forked Echo route and four profiles, generic mission pass isolation, real-test acknowledgement, independent failures and blockers, visual-world staleness, missing hypothetical evidence, deleted/retargeted goal identity, explicit clearing, portability conflicts, bounded validation, and unchanged game/scene state.

## Limits

The profile list is a **standardized starting point**, not automatic device detection. Results are entered manually and should include precise observed operating system, browser, headset/controller and version in the environment field and notes. A tester can be mistaken or dishonest; this system does not independently authenticate their self-reported results.

**Never infer universal compatibility from a single passing test.** Quest 3 tracked controls, browser rendering, desktop keyboard play and Xbox button mappings each require their own real-world acceptance tests.

## Next horizon

Potential Rung 23: **Release Evidence Bundles**, packaging scenario coverage snapshots, mission outcomes and device-specific author reports into one clearly labeled offline review artifact with freshness and provenance warnings, without representing it as signed or independently certified telemetry.
