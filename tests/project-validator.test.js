#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateProject, SCHEMA_VERSION, TILE_COUNT } from "../scripts/validate_project.js";

const demo = JSON.parse(fs.readFileSync("data/journey_to_parallax_institute.v5.0.demo.json", "utf8"));
const result = validateProject(demo);
assert.equal(result.ok, true, result.errors.join("\n"));
assert.equal(demo.schemaVersion, SCHEMA_VERSION);
assert.equal(demo.meta.title, "Journey to the Parallax Institute");
assert.ok(demo.scenes.length >= 4, "v3.2 demo should include multiple scenes");
assert.ok(demo.scenes.every(scene => scene.map.tiles.length === TILE_COUNT));
assert.ok(demo.scenes.some(scene => scene.id === "scene_diner"));
assert.ok(demo.scenes.some(scene => scene.id === "scene_dream_cabin"));
assert.ok(demo.scenes.some(scene => scene.id === "scene_institute_gate"));
assert.ok(demo.scenes.flatMap(scene => scene.warps).length >= 6, "demo should include scene warps");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("lab"));
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("crystal"));
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("neon"));
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("artifact"));
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("campfire"), "v3.2 demo should include campfire tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("console"), "v3.2 demo should include console tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("banner"), "v3.2 demo should include banner tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("starpath"), "v3.2 demo should include starpath tiles");
assert.ok(demo.journey.events.length >= 6);
assert.equal(typeof demo.flags, "object");
assert.ok(demo.storyBeats.length >= 4, "v3.2 demo should include story beats");
assert.ok(demo.scenes.flatMap(scene => scene.npcs).some(npc => (npc.choices || []).length > 0), "v3.2 demo should include dialogue choices");
assert.ok(demo.scenes.flatMap(scene => scene.warps).some(warp => warp.requiredItemId || warp.requiredWonder), "v3.2 demo should include a gated warp");
assert.ok(demo.journey.encounters.length >= 4, "v3.2 demo should include encounters");
assert.ok(demo.journey.encounters.some(encounter => encounter.revealQuestId || encounter.setFlag), "v3.2 encounters should support story effects");
assert.ok(demo.assets?.palettes?.length >= 3, "v3.2 demo should include palette gallery seeds");
assert.ok(demo.assets?.sprites?.length >= 5, "v3.2 demo should include sprite gallery seeds");
assert.equal(demo.assets.activePaletteId, "palette_shasta_twilight");
assert.ok(demo.storyArc?.acts?.length >= 3, "v3.2 demo should include story arc acts");
assert.equal(demo.storyArc.currentActId, "act_1_call");
assert.ok(demo.playtestLog?.length >= 4, "v3.2 demo should include playtest log seeds");
assert.ok(demo.titleScreen?.openingText?.includes("3:69 AM"), "v3.2 demo should include title screen copy");
assert.ok(demo.sceneTemplates?.length >= 4, "v3.2 demo should include starter templates");
assert.ok(demo.sceneTemplates.some(template => template.layout === "gate"), "v3.2 templates should include threshold/gate layout");
assert.equal(demo.releaseManifest?.manifestType, "pixelforge.release.manifest");
assert.ok(demo.releaseManifest?.checklist?.length >= 5, "v3.2 release manifest should include checklist items");
assert.equal(demo.credits?.studio, "PHI369 Labs / Parallax", "v3.2 demo should include credits/about metadata");
assert.ok(demo.credits?.claimBoundary?.includes("No scientific"), "v3.2 credits should include claim boundary language");
assert.ok(demo.audioCues?.length >= 5, "v3.2 demo should include audio cue board seeds");
assert.ok(demo.audioCues.every(cue => Number.isInteger(cue.frequency)), "audio cues should include preview frequencies");
assert.equal(demo.alphaAudit?.auditType, "pixelforge.alpha.readiness", "v3.2 demo should include alpha readiness audit");
assert.ok(demo.alphaAudit?.checks?.some(check => check.severity === "blocker"), "alpha audit should mark blocker checks");
assert.ok(demo.sceneThumbnails?.length >= demo.scenes.length, "v3.2 demo should include scene thumbnail metadata");
assert.ok(demo.sceneThumbnails.every(th => ["needs-review", "needs-polish", "needs-playtest", "approved"].includes(th.reviewStatus)), "scene thumbnail statuses should be valid");
assert.equal(demo.releaseCandidate?.candidateType, "pixelforge.v1.alpha-candidate", "v3.2 demo should include release candidate metadata");
assert.ok(demo.releaseCandidate?.requiredExports?.includes("playtest-transcript"), "release candidate should require playtest transcript export");
assert.ok(demo.assetPacks?.length >= 3, "v3.2 demo should include starter asset packs");
assert.equal(demo.activeAssetPackId, "pack_shasta_road", "v3.2 demo should identify the active asset pack");

assert.ok(demo.sceneWizard?.presets?.length >= 4, "v3.2 demo should include Scene Wizard presets");
assert.equal(demo.sceneWizard.activePresetId, "preset_shasta_bus_stop", "v3.2 demo should select the Shasta bus stop wizard preset");
assert.ok(demo.sceneWizard.presets.every(preset => preset.templateId && preset.assetPackId), "Scene Wizard presets should reference templates and asset packs");
assert.ok(demo.quickStamps?.length >= 4, "v3.2 demo should include Quick Stamp seeds");
assert.ok(demo.quickStamps.some(stamp => stamp.tileIds.includes("payphone")), "Quick Stamps should include new v3.2 tiles");
assert.ok(demo.exportProfiles?.length >= 3, "v3.2 demo should include export profiles");
assert.equal(demo.activeExportProfileId, "profile_alpha_playtest", "v3.2 demo should select alpha playtest export profile");
assert.ok(demo.projectReview?.reviewItems?.length >= 3, "v3.2 demo should include project review items");
assert.ok(demo.projectReview.reviewItems.some(item => item.status === "open"), "v3.2 review board should include open items");
assert.ok(demo.issueScanner?.checks?.length >= 4, "v3.2 demo should include issue scanner checks");
assert.ok(demo.issueScanner.checks.every(check => typeof check.passed === "boolean"), "Issue scanner checks should have boolean passed flags");
assert.ok(demo.codexHandoff?.tasks?.length >= 3, "v3.2 demo should include Codex handoff tasks");
assert.equal(demo.codexHandoff.activeTaskId, "codex_polish_roadside_loop", "v3.2 demo should select a Codex handoff task");
assert.ok(demo.creatorPromptDeck?.prompts?.length >= 4, "v3.2 demo should include creator prompt cards");
assert.equal(demo.activeCreatorPromptId, "prompt_weird_npc", "v3.2 demo should select the weird NPC prompt");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("busstop"), "v3.2 demo should include bus stop tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("payphone"), "v3.2 demo should include payphone tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("workshop"), "v3.2 demo should include workshop tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("checkpoint"), "v3.2 demo should include checkpoint tiles");
assert.ok(demo.assetPacks.some(pack => pack.tileIds.includes("mosslight")), "v3.2 asset packs should include new tile IDs");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("moonwell"), "v3.2 demo should include moonwell tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("mosslight"), "v3.2 demo should include mosslight tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("kiosk"), "v3.2 demo should include kiosk tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("rail"), "v3.2 demo should include rail tiles");



assert.ok(demo.productionBoard?.lanes?.length >= 4, "v3.2 demo should include production board lanes");
assert.ok(demo.productionBoard?.cards?.some(card => card.kind === "release"), "v3.2 production board should include release cards");
assert.ok(demo.readinessMatrix?.rows?.length >= demo.scenes.length, "v3.2 demo should include scene readiness rows");
assert.ok(demo.readinessMatrix?.overallScore >= 0 && demo.readinessMatrix.overallScore <= 100, "readiness score should be 0..100");
assert.ok(demo.releaseCutBuilder?.cuts?.length >= 2, "v3.2 demo should include release cut templates");
assert.equal(demo.releaseCutBuilder.activeCutId, "cut_alpha_playable", "v3.2 demo should select the alpha playable cut");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("production"), "v3.2 demo should include production marker tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("matrix"), "v3.2 demo should include matrix marker tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("cutscene"), "v3.2 demo should include release cut marker tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("launchpad"), "v3.2 demo should include launchpad marker tiles");
assert.ok(demo.shelfCuration?.collections?.length >= 2, "v3.2 demo should include shelf curation collections");
assert.equal(demo.shelfCuration.activeCollectionId, "collection_parallax_launch_shelf", "v3.2 demo should select a shelf collection");
assert.ok(demo.shelfCuration.badges.some(badge => badge.earned), "v3.2 shelf curation should include earned badges");
assert.ok(demo.shelfCuration.playerHistory.length >= 2, "v3.2 shelf curation should track player history");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("gallerywall"), "v3.2 demo should include gallery wall tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("badge"), "v3.2 demo should include badge tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("playcard"), "v3.2 demo should include play card tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("archivebox"), "v3.2 demo should include archive box tiles");

const brokenShelfCuration = structuredClone(demo);
brokenShelfCuration.shelfCuration.collections[0].gameIds = ["missing_game"];
const brokenShelfCurationResult = validateProject(brokenShelfCuration);
assert.equal(brokenShelfCurationResult.ok, false);
assert.ok(brokenShelfCurationResult.errors.some(err => err.includes("shelfCuration")));



assert.equal(demo.creatorOsDashboard?.osType, "pixelforge.creator-os-dashboard", "v4.7 demo should include Creator OS dashboard");
assert.ok(demo.creatorOsDashboard?.stations?.length >= 5, "Creator OS should include core stations");
assert.ok(demo.cartridgeLifecycle?.steps?.length >= 6, "v4.0 demo should include cartridge lifecycle");
assert.ok(demo.agentOrchestrator?.agents?.length >= 5, "v4.0 demo should include AI agent orchestrator");
assert.ok(demo.experienceMap?.nodes?.length >= 6, "v4.0 demo should include experience map nodes");
assert.ok(demo.releaseTrain?.cars?.length >= 4, "v4.0 demo should include release train milestones");
assert.ok(demo.systemCodex?.pages?.length >= 4, "v4.0 demo should include system codex pages");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("creatoros"), "v4.0 demo should include Creator OS tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("lifecycle"), "v4.0 demo should include lifecycle tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("orchestrator"), "v4.0 demo should include orchestrator tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("xpmap"), "v4.0 demo should include experience map tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("releasetrain"), "v4.0 demo should include release train tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("codexstone"), "v4.0 demo should include codex stone tiles");

const brokenCreatorOs = structuredClone(demo);
brokenCreatorOs.creatorOsDashboard.activeStationId = "station_missing";
const brokenCreatorOsResult = validateProject(brokenCreatorOs);
assert.equal(brokenCreatorOsResult.ok, false);
assert.ok(brokenCreatorOsResult.errors.some(err => err.includes("creatorOsDashboard")));

const brokenOrchestrator = structuredClone(demo);
brokenOrchestrator.agentOrchestrator.tasks[0].agentId = "agent_missing";
const brokenOrchestratorResult = validateProject(brokenOrchestrator);
assert.equal(brokenOrchestratorResult.ok, false);
assert.ok(brokenOrchestratorResult.errors.some(err => err.includes("agentOrchestrator")));

const brokenTile = structuredClone(demo);
brokenTile.scenes[0].map.tiles[0] = "unknown_tile";
const brokenTileResult = validateProject(brokenTile);
assert.equal(brokenTileResult.ok, false);
assert.ok(brokenTileResult.errors.some(err => err.includes("unknown tile")));

const brokenWarp = structuredClone(demo);
brokenWarp.scenes[0].warps[0].targetSceneId = "scene_missing";
const brokenWarpResult = validateProject(brokenWarp);
assert.equal(brokenWarpResult.ok, false);
assert.ok(brokenWarpResult.errors.some(err => err.includes("targets missing scene")));

const brokenNpcDelta = structuredClone(demo);
brokenNpcDelta.scenes[0].npcs[0].effect = { luck: 999 };
const brokenNpcResult = validateProject(brokenNpcDelta);
assert.equal(brokenNpcResult.ok, false);
assert.ok(brokenNpcResult.errors.some(err => err.includes("not an allowed stat")));

const brokenQuest = structuredClone(demo);
brokenQuest.quests[0].status = "almost";
const brokenQuestResult = validateProject(brokenQuest);
assert.equal(brokenQuestResult.ok, false);
assert.ok(brokenQuestResult.errors.some(err => err.includes("status")));

const brokenEncounter = structuredClone(demo);
brokenEncounter.journey.encounters[0].delta = { weirdness: 7 };
const brokenEncounterResult = validateProject(brokenEncounter);
assert.equal(brokenEncounterResult.ok, false);
assert.ok(brokenEncounterResult.errors.some(err => err.includes("not an allowed stat")));

const brokenAssets = structuredClone(demo);
brokenAssets.assets.sprites = [];
const brokenAssetsResult = validateProject(brokenAssets);
assert.equal(brokenAssetsResult.ok, false);
assert.ok(brokenAssetsResult.errors.some(err => err.includes("assets.sprites")));

const brokenStoryArc = structuredClone(demo);
brokenStoryArc.storyArc.acts[0].beatIds = ["beat_missing"];
const brokenStoryArcResult = validateProject(brokenStoryArc);
assert.equal(brokenStoryArcResult.ok, false);
assert.ok(brokenStoryArcResult.errors.some(err => err.includes("missing beat")));

const brokenPlaytestLog = structuredClone(demo);
brokenPlaytestLog.playtestLog[0].sceneId = "scene_missing";
const brokenPlaytestLogResult = validateProject(brokenPlaytestLog);
assert.equal(brokenPlaytestLogResult.ok, false);
assert.ok(brokenPlaytestLogResult.errors.some(err => err.includes("playtestLog")));

const brokenTitleScreen = structuredClone(demo);
brokenTitleScreen.titleScreen.openingText = "";
const brokenTitleScreenResult = validateProject(brokenTitleScreen);
assert.equal(brokenTitleScreenResult.ok, false);
assert.ok(brokenTitleScreenResult.errors.some(err => err.includes("titleScreen.openingText")));

const brokenTemplate = structuredClone(demo);
brokenTemplate.sceneTemplates[0].layout = "maze";
const brokenTemplateResult = validateProject(brokenTemplate);
assert.equal(brokenTemplateResult.ok, false);
assert.ok(brokenTemplateResult.errors.some(err => err.includes("sceneTemplates")));

const brokenManifest = structuredClone(demo);
brokenManifest.releaseManifest.checklist[0].done = "yes";
const brokenManifestResult = validateProject(brokenManifest);
assert.equal(brokenManifestResult.ok, false);
assert.ok(brokenManifestResult.errors.some(err => err.includes("releaseManifest.checklist")));

const brokenCredits = structuredClone(demo);
brokenCredits.credits.claimBoundary = "";
const brokenCreditsResult = validateProject(brokenCredits);
assert.equal(brokenCreditsResult.ok, false);
assert.ok(brokenCreditsResult.errors.some(err => err.includes("credits.claimBoundary")));

const brokenAudioCue = structuredClone(demo);
brokenAudioCue.audioCues[0].frequency = 10;
const brokenAudioCueResult = validateProject(brokenAudioCue);
assert.equal(brokenAudioCueResult.ok, false);
assert.ok(brokenAudioCueResult.errors.some(err => err.includes("audioCues")));

const brokenSceneThumbnail = structuredClone(demo);
brokenSceneThumbnail.sceneThumbnails[0].sceneId = "scene_missing";
const brokenSceneThumbnailResult = validateProject(brokenSceneThumbnail);
assert.equal(brokenSceneThumbnailResult.ok, false);
assert.ok(brokenSceneThumbnailResult.errors.some(err => err.includes("sceneThumbnails")));

const brokenReleaseCandidate = structuredClone(demo);
brokenReleaseCandidate.releaseCandidate.checklist[0].done = "yes";
const brokenReleaseCandidateResult = validateProject(brokenReleaseCandidate);
assert.equal(brokenReleaseCandidateResult.ok, false);
assert.ok(brokenReleaseCandidateResult.errors.some(err => err.includes("releaseCandidate.checklist")));

const brokenAlphaAudit = structuredClone(demo);
brokenAlphaAudit.alphaAudit.checks[0].passed = "yes";
const brokenAlphaAuditResult = validateProject(brokenAlphaAudit);
assert.equal(brokenAlphaAuditResult.ok, false);
assert.ok(brokenAlphaAuditResult.errors.some(err => err.includes("alphaAudit.checks")));


const brokenOnboarding = structuredClone(demo);
brokenOnboarding.creatorOnboarding.steps[0].done = "yes";
const brokenOnboardingResult = validateProject(brokenOnboarding);
assert.equal(brokenOnboardingResult.ok, false);
assert.ok(brokenOnboardingResult.errors.some(err => err.includes("creatorOnboarding")));

const brokenTheme = structuredClone(demo);
brokenTheme.activeThemeId = "theme_missing";
const brokenThemeResult = validateProject(brokenTheme);
assert.equal(brokenThemeResult.ok, false);
assert.ok(brokenThemeResult.errors.some(err => err.includes("activeThemeId")));

const brokenCartridge = structuredClone(demo);
brokenCartridge.cartridgeMeta.estimatedPlayMinutes = 0;
const brokenCartridgeResult = validateProject(brokenCartridge);
assert.equal(brokenCartridgeResult.ok, false);
assert.ok(brokenCartridgeResult.errors.some(err => err.includes("cartridgeMeta")));

const brokenHandoff = structuredClone(demo);
brokenHandoff.handoffBrief.summary = "";
const brokenHandoffResult = validateProject(brokenHandoff);
assert.equal(brokenHandoffResult.ok, false);
assert.ok(brokenHandoffResult.errors.some(err => err.includes("handoffBrief")));

const brokenAssetPack = structuredClone(demo);
brokenAssetPack.assetPacks[0].tileIds = ["missing_tile"];
const brokenAssetPackResult = validateProject(brokenAssetPack);
assert.equal(brokenAssetPackResult.ok, false);
assert.ok(brokenAssetPackResult.errors.some(err => err.includes("assetPacks")));

const brokenActivePack = structuredClone(demo);
brokenActivePack.activeAssetPackId = "pack_missing";
const brokenActivePackResult = validateProject(brokenActivePack);
assert.equal(brokenActivePackResult.ok, false);
assert.ok(brokenActivePackResult.errors.some(err => err.includes("activeAssetPackId")));


const brokenSceneWizard = structuredClone(demo);
brokenSceneWizard.sceneWizard.presets[0].assetPackId = "pack_missing";
const brokenSceneWizardResult = validateProject(brokenSceneWizard);
assert.equal(brokenSceneWizardResult.ok, false);
assert.ok(brokenSceneWizardResult.errors.some(err => err.includes("sceneWizard")));

const brokenQuickStamp = structuredClone(demo);
brokenQuickStamp.quickStamps[0].tileIds = ["missing_tile"];
const brokenQuickStampResult = validateProject(brokenQuickStamp);
assert.equal(brokenQuickStampResult.ok, false);
assert.ok(brokenQuickStampResult.errors.some(err => err.includes("quickStamps")));

const brokenExportProfile = structuredClone(demo);
brokenExportProfile.activeExportProfileId = "profile_missing";
const brokenExportProfileResult = validateProject(brokenExportProfile);
assert.equal(brokenExportProfileResult.ok, false);
assert.ok(brokenExportProfileResult.errors.some(err => err.includes("activeExportProfileId")));

const brokenProjectReview = structuredClone(demo);
brokenProjectReview.projectReview.reviewItems[0].severity = "critical";
const brokenProjectReviewResult = validateProject(brokenProjectReview);
assert.equal(brokenProjectReviewResult.ok, false);
assert.ok(brokenProjectReviewResult.errors.some(err => err.includes("projectReview")));

const brokenIssueScanner = structuredClone(demo);
brokenIssueScanner.issueScanner.checks[0].passed = "yes";
const brokenIssueScannerResult = validateProject(brokenIssueScanner);
assert.equal(brokenIssueScannerResult.ok, false);
assert.ok(brokenIssueScannerResult.errors.some(err => err.includes("issueScanner")));

const brokenCodexHandoff = structuredClone(demo);
brokenCodexHandoff.codexHandoff.activeTaskId = "missing_task";
const brokenCodexHandoffResult = validateProject(brokenCodexHandoff);
assert.equal(brokenCodexHandoffResult.ok, false);
assert.ok(brokenCodexHandoffResult.errors.some(err => err.includes("codexHandoff")));

const brokenPromptDeck = structuredClone(demo);
brokenPromptDeck.activeCreatorPromptId = "missing_prompt";
const brokenPromptDeckResult = validateProject(brokenPromptDeck);
assert.equal(brokenPromptDeckResult.ok, false);
assert.ok(brokenPromptDeckResult.errors.some(err => err.includes("activeCreatorPromptId")));

console.log("PixelForge v3.2 review-handoff-workflow validator tests passed.");


assert.ok(demo.buildSprint?.tasks?.length >= 4, "v3.2 demo should include build sprint tasks");
assert.equal(demo.buildSprint.activeTaskId, "sprint_polish_opening_loop", "v3.2 demo should select an active sprint task");
assert.ok(demo.buildSprint.tasks.some(task => task.status === "doing"), "v3.2 sprint should include an active doing task");
assert.ok(demo.releaseDiagnostics?.checks?.length >= 4, "v3.2 demo should include release diagnostics");
assert.ok(demo.releaseDiagnostics.checks.some(check => check.status === "warning"), "v3.2 diagnostics should allow visible warnings");
assert.ok(demo.collaboratorNotes?.length >= 3, "v3.2 demo should include collaborator notes");
assert.ok(demo.buildRecipes?.length >= 3, "v3.2 demo should include build recipes");
assert.equal(demo.activeBuildRecipeId, "recipe_first_playable_loop", "v3.2 demo should select first playable loop recipe");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("notebook"), "v3.2 demo should include notebook tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("receipt"), "v3.2 demo should include receipt tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("debug"), "v3.2 demo should include debug tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("spark"), "v3.2 demo should include spark tiles");


assert.ok(demo.playableQa?.checks?.length >= 4, "v3.2 demo should include playable QA checks");
assert.ok(demo.playableQa.checks.some(check => check.status === "warning"), "v3.2 QA should allow visible warnings");
assert.ok(demo.demoWalkthrough?.steps?.length >= 5, "v3.2 demo should include walkthrough steps");
assert.equal(demo.demoWalkthrough.activeStepId, "walk_step_wake", "v3.2 walkthrough should select the first route step");
assert.ok(demo.milestoneTracker?.milestones?.length >= 4, "v3.2 demo should include milestone tracking");
assert.equal(demo.milestoneTracker.currentMilestoneId, "mile_playable_route", "v3.2 milestone tracker should select playable route milestone");
assert.ok(demo.knownIssues?.length >= 3, "v3.2 demo should include known issues");
assert.ok(demo.knownIssues.some(issue => issue.status === "open"), "v3.2 known issues should include open items");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("arrow"), "v3.2 demo should include arrow tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("flagstone"), "v3.2 demo should include flagstone tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("testpad"), "v3.2 demo should include testpad tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("milestone"), "v3.2 demo should include milestone tiles");

const brokenPlayableQa = structuredClone(demo);
brokenPlayableQa.playableQa.checks[0].status = "maybe";
const brokenPlayableQaResult = validateProject(brokenPlayableQa);
assert.equal(brokenPlayableQaResult.ok, false);
assert.ok(brokenPlayableQaResult.errors.some(err => err.includes("playableQa")));

const brokenWalkthrough = structuredClone(demo);
brokenWalkthrough.demoWalkthrough.steps[0].sceneId = "scene_missing";
const brokenWalkthroughResult = validateProject(brokenWalkthrough);
assert.equal(brokenWalkthroughResult.ok, false);
assert.ok(brokenWalkthroughResult.errors.some(err => err.includes("demoWalkthrough")));

const brokenMilestones = structuredClone(demo);
brokenMilestones.milestoneTracker.milestones[0].status = "halfway";
const brokenMilestonesResult = validateProject(brokenMilestones);
assert.equal(brokenMilestonesResult.ok, false);
assert.ok(brokenMilestonesResult.errors.some(err => err.includes("milestoneTracker")));

const brokenKnownIssues = structuredClone(demo);
brokenKnownIssues.knownIssues[0].severity = "apocalyptic";
const brokenKnownIssuesResult = validateProject(brokenKnownIssues);
assert.equal(brokenKnownIssuesResult.ok, false);
assert.ok(brokenKnownIssuesResult.errors.some(err => err.includes("knownIssues")));

console.log("PixelForge v3.2 playable-QA workflow validator tests passed.");


assert.ok(demo.pixelStudio?.presets?.length >= 3, "v3.2 demo should include Pixel Studio presets");
assert.equal(demo.pixelStudio.activePresetId, "preset_sprite_32", "v3.2 Pixel Studio should select the 32px character preset");
assert.ok(Array.isArray(demo.pixelStudio.importedAssets), "v3.2 Pixel Studio should track imported assets");
assert.ok(demo.writersStudio?.teamRoles?.length >= 5, "v3.2 demo should include Writers Studio AI-team roles");
assert.ok(demo.writersStudio?.adventureBriefs?.some(brief => brief.kind === "sequel"), "v3.2 Writers Studio should include sequel briefs");
assert.ok(demo.writersStudio?.generatedDrafts?.length >= 1, "v3.2 Writers Studio should include generated draft seeds");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("pixelbench"), "v3.2 demo should include pixelbench tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("writersdesk"), "v3.2 demo should include writersdesk tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("storyportal"), "v3.2 demo should include storyportal tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("camera"), "v3.2 demo should include camera tiles");

const brokenPixelStudio = structuredClone(demo);
brokenPixelStudio.pixelStudio.activePresetId = "missing_preset";
const brokenPixelStudioResult = validateProject(brokenPixelStudio);
assert.equal(brokenPixelStudioResult.ok, false);
assert.ok(brokenPixelStudioResult.errors.some(err => err.includes("pixelStudio")));

const brokenWritersStudio = structuredClone(demo);
brokenWritersStudio.writersStudio.activeRoleId = "missing_role";
const brokenWritersStudioResult = validateProject(brokenWritersStudio);
assert.equal(brokenWritersStudioResult.ok, false);
assert.ok(brokenWritersStudioResult.errors.some(err => err.includes("writersStudio")));

console.log("PixelForge v3.2 Pixel Studio + Writers Studio validator tests passed.");


assert.ok(demo.assetPipeline?.importedRefs?.length >= 3, "v3.2 demo should include Asset Pipeline imported refs");
assert.equal(demo.assetPipeline.activeAssetId, "asset_pipeline_raccoon_oracle", "v3.2 Asset Pipeline should select the raccoon oracle reference");
assert.ok(demo.assetPipeline.cleanupQueue?.some(task => task.status === "todo"), "v3.2 Asset Pipeline should include cleanup tasks");
assert.ok(demo.adventurePipeline?.pitchPacks?.some(pack => pack.kind === "sequel"), "v3.2 Adventure Pipeline should include sequel pitch packs");
assert.equal(demo.adventurePipeline.activePitchId, "pitch_journey_2_dream_road", "v3.2 Adventure Pipeline should select Journey II pitch");
assert.ok(demo.sequelContinuity?.hooks?.length >= 3, "v3.2 Sequel Continuity should include hooks");
assert.ok(demo.sequelContinuity?.canonRules?.length >= 3, "v3.2 Sequel Continuity should include canon rules");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("assetbin"), "v3.2 demo should include assetbin tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("pitchboard"), "v3.2 demo should include pitchboard tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("canonnode"), "v3.2 demo should include canonnode tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("storyboard"), "v3.2 demo should include storyboard tiles");

const brokenAssetPipeline = structuredClone(demo);
brokenAssetPipeline.assetPipeline.activeAssetId = "missing_ref";
const brokenAssetPipelineResult = validateProject(brokenAssetPipeline);
assert.equal(brokenAssetPipelineResult.ok, false);
assert.ok(brokenAssetPipelineResult.errors.some(err => err.includes("assetPipeline")));

const brokenAdventurePipeline = structuredClone(demo);
brokenAdventurePipeline.adventurePipeline.pitchPacks[0].kind = "random";
const brokenAdventurePipelineResult = validateProject(brokenAdventurePipeline);
assert.equal(brokenAdventurePipelineResult.ok, false);
assert.ok(brokenAdventurePipelineResult.errors.some(err => err.includes("adventurePipeline")));

const brokenContinuity = structuredClone(demo);
brokenContinuity.sequelContinuity.activeHookId = "missing_hook";
const brokenContinuityResult = validateProject(brokenContinuity);
assert.equal(brokenContinuityResult.ok, false);
assert.ok(brokenContinuityResult.errors.some(err => err.includes("sequelContinuity")));

console.log("PixelForge v3.2 Creative Suite validator tests passed.");


assert.ok(demo.chiptuneStudio?.presets?.length >= 3, "v3.2 demo should include Chiptune Studio presets");
assert.equal(demo.chiptuneStudio.activePresetId, "preset_16bit_warm_loop", "v3.2 Creative Suite should select the warm 16-bit loop preset");
assert.ok(demo.chiptuneStudio?.retroOutputs?.some(output => output.outputKind === "loop-manifest"), "v3.2 Creative Suite should include loop-manifest outputs");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("musicdesk"), "v3.2 demo should include musicdesk tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("chiptune"), "v3.2 demo should include chiptune tiles");

const brokenChiptune = structuredClone(demo);
brokenChiptune.chiptuneStudio.activePresetId = "missing_preset";
const brokenChiptuneResult = validateProject(brokenChiptune);
assert.equal(brokenChiptuneResult.ok, false);
assert.ok(brokenChiptuneResult.errors.some(err => err.includes("chiptuneStudio")));

console.log("PixelForge v3.2 Creative Suite validator tests passed.");


assert.ok(demo.creativeSuite?.tracks?.length >= 5, "v3.2 demo should include Creative Suite tracks");
assert.equal(demo.creativeSuite.activeTrackId, "track_suite_unified", "v3.2 Creative Suite should use unified track");
assert.ok(demo.gameKitComposer?.kits?.some(kit => kit.id === "kit_shasta_alpha"), "v3.2 demo should include Shasta Alpha Game Kit");
assert.ok(demo.sceneAudioBoard?.assignments?.some(assignment => assignment.sceneId === "scene_roadside"), "v3.2 demo should include roadside scene audio assignment");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("suitehub"), "v3.2 demo should include suitehub tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("audiomarker"), "v3.2 demo should include audiomarker tile");

const brokenCreativeSuite = structuredClone(demo);
brokenCreativeSuite.creativeSuite.activeTrackId = "missing_track";
const brokenCreativeSuiteResult = validateProject(brokenCreativeSuite);
assert.equal(brokenCreativeSuiteResult.ok, false);
assert.ok(brokenCreativeSuiteResult.errors.some(err => err.includes("creativeSuite")));

const brokenSceneAudio = structuredClone(demo);
brokenSceneAudio.sceneAudioBoard.assignments[0].sceneId = "missing_scene";
const brokenSceneAudioResult = validateProject(brokenSceneAudio);
assert.equal(brokenSceneAudioResult.ok, false);
assert.ok(brokenSceneAudioResult.errors.some(err => err.includes("sceneAudioBoard")));

console.log("PixelForge v3.2 Community BBS Alpha validator tests passed.");

const brokenProductionBoard = structuredClone(demo);
brokenProductionBoard.productionBoard.cards[0].laneId = "lane_missing";
const brokenProductionResult = validateProject(brokenProductionBoard);
assert.equal(brokenProductionResult.ok, false);
assert.ok(brokenProductionResult.errors.some(err => err.includes("productionBoard")));

const brokenReadinessMatrix = structuredClone(demo);
brokenReadinessMatrix.readinessMatrix.rows[0].visual = "done-ish";
const brokenMatrixResult = validateProject(brokenReadinessMatrix);
assert.equal(brokenMatrixResult.ok, false);
assert.ok(brokenMatrixResult.errors.some(err => err.includes("readinessMatrix")));

const brokenReleaseCut = structuredClone(demo);
brokenReleaseCut.releaseCutBuilder.cuts[0].sceneIds = ["scene_missing"];
const brokenCutResult = validateProject(brokenReleaseCut);
assert.equal(brokenCutResult.ok, false);
assert.ok(brokenCutResult.errors.some(err => err.includes("releaseCutBuilder")));

assert.ok(demo.releaseWorkshop?.assemblies?.length >= 3, "v3.2 demo should include Game Shelf + Curation Library assemblies");
assert.equal(demo.releaseWorkshop.activeAssemblyId, "assembly_alpha_cartridge", "v3.2 should select alpha cartridge assembly");
assert.ok(demo.releaseWorkshop.assemblies.some(assembly => assembly.requiredPieces.includes("rights-registry")), "Game Shelf + Curation Library should require rights registry pieces");
assert.ok(demo.exportValidator?.checks?.length >= 5, "v3.2 demo should include export validation checks");
assert.ok(demo.exportValidator.checks.some(check => check.status === "warning"), "Export Validator should allow warning status");
assert.ok(demo.buildNotes?.notes?.length >= 3, "v3.2 demo should include build notes");
assert.equal(demo.buildNotes.activeNoteId, "note_v2_5_library_launcher", "v3.2 should select the library launcher build note");
assert.ok(demo.rightsRegistry?.entries?.length >= 4, "v3.2 demo should include rights registry entries");
assert.ok(demo.rightsRegistry.entries.some(entry => entry.sourceType === "imported" && entry.status === "needs-source"), "Rights Registry should track future imported media that needs source metadata");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("seal"), "v3.2 demo should include release seal tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("license"), "v3.2 demo should include license tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("buildnote"), "v3.2 demo should include build note tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("exportgate"), "v3.2 demo should include export gate tile");

const brokenReleaseWorkshop = structuredClone(demo);
brokenReleaseWorkshop.releaseWorkshop.activeAssemblyId = "assembly_missing";
const brokenWorkshopResult = validateProject(brokenReleaseWorkshop);
assert.equal(brokenWorkshopResult.ok, false);
assert.ok(brokenWorkshopResult.errors.some(err => err.includes("releaseWorkshop")));

const brokenExportValidator = structuredClone(demo);
brokenExportValidator.exportValidator.checks[0].status = "maybe";
const brokenExportValidatorResult = validateProject(brokenExportValidator);
assert.equal(brokenExportValidatorResult.ok, false);
assert.ok(brokenExportValidatorResult.errors.some(err => err.includes("exportValidator")));

const brokenBuildNotes = structuredClone(demo);
brokenBuildNotes.buildNotes.activeNoteId = "missing_note";
const brokenBuildNotesResult = validateProject(brokenBuildNotes);
assert.equal(brokenBuildNotesResult.ok, false);
assert.ok(brokenBuildNotesResult.errors.some(err => err.includes("buildNotes")));

const brokenRightsRegistry = structuredClone(demo);
brokenRightsRegistry.rightsRegistry.entries[0].status = "sketchy";
const brokenRightsResult = validateProject(brokenRightsRegistry);
assert.equal(brokenRightsResult.ok, false);
assert.ok(brokenRightsResult.errors.some(err => err.includes("rightsRegistry")));



assert.equal(demo.libraryLauncher?.launcherType, "pixelforge.library-launcher", "v3.2 demo should include Library Launcher metadata");
assert.equal(demo.libraryLauncher.activeGameId, "game_journey_parallax", "v3.2 launcher should select the active Journey cartridge");
assert.ok(demo.libraryLauncher.featuredSlots.length >= 3, "v3.2 launcher should include featured shelf slots");
assert.equal(demo.gameDetail?.detailType, "pixelforge.game-detail-page", "v3.2 demo should include Game Detail Page metadata");
assert.ok(demo.gameDetail.tabs.some(tab => tab.label.includes("Scores")), "v3.2 detail page should include scores/saves tab");
assert.equal(demo.saveProfileManager?.managerType, "pixelforge.save-profile-manager", "v3.2 demo should include Save Profile Manager metadata");
assert.ok(demo.saveProfileManager.profiles.length >= 2, "v3.2 demo should include multiple player profiles");
assert.equal(demo.collectionCapsules?.capsuleType, "pixelforge.collection-capsules", "v3.2 demo should include Collection Capsules metadata");
assert.ok(demo.collectionCapsules.capsules.some(capsule => capsule.requiredExports.includes("library-launcher")), "v3.2 collection capsules should require launcher export pieces");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("launchshelf"), "v3.2 demo should include launch shelf tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("detailcard"), "v3.2 demo should include detail card tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("profilechip"), "v3.2 demo should include profile chip tiles");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("capsule"), "v3.2 demo should include capsule tiles");

const brokenLauncher = structuredClone(demo);
brokenLauncher.libraryLauncher.activeGameId = "missing_game";
const brokenLauncherResult = validateProject(brokenLauncher);
assert.equal(brokenLauncherResult.ok, false);
assert.ok(brokenLauncherResult.errors.some(err => err.includes("libraryLauncher")));

const brokenProfile = structuredClone(demo);
brokenProfile.saveProfileManager.saveIndex[0].sceneId = "scene_missing";
const brokenProfileResult = validateProject(brokenProfile);
assert.equal(brokenProfileResult.ok, false);
assert.ok(brokenProfileResult.errors.some(err => err.includes("saveProfileManager")));

const brokenCapsule = structuredClone(demo);
brokenCapsule.collectionCapsules.capsules[0].gameIds = ["missing_game"];
const brokenCapsuleResult = validateProject(brokenCapsule);
assert.equal(brokenCapsuleResult.ok, false);
assert.ok(brokenCapsuleResult.errors.some(err => err.includes("collectionCapsules")));

console.log("PixelForge v3.2 Library Launcher validator tests passed.");

assert.ok(demo.relayBlueprint?.relays?.length >= 3, "v3.2 demo should include relay blueprint options");
assert.equal(demo.relayBlueprint.activeRelayId, "relay_private_bbs", "v3.2 should select the private BBS relay blueprint");
assert.ok(demo.relayBlueprint.packetTypes.includes("signal_ping"), "relay blueprint should include signal ping packets");
assert.ok(demo.sessionSync?.snapshots?.length >= 1, "v3.2 demo should include session sync snapshots");
assert.equal(demo.sessionSync.activeSnapshotId, "snapshot_journey_watch_seed", "v3.2 should select a seed session snapshot");
assert.ok(demo.hostHandoff?.handoffs?.length >= 1, "v3.2 demo should include host handoff metadata");
assert.ok(demo.replayReceipts?.receipts?.length >= 1, "v3.2 demo should include replay receipts");
assert.ok(demo.replayReceipts.timelineEvents.length >= 3, "replay receipts should include timeline events");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("relay"), "v3.2 demo should include relay tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("syncsnap"), "v3.2 demo should include sync snapshot tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("hostbadge"), "v3.2 demo should include host badge tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("replaytape"), "v3.2 demo should include replay tape tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("latency"), "v3.2 demo should include latency meter tile");

const brokenRelay = structuredClone(demo);
brokenRelay.relayBlueprint.activeRelayId = "missing_relay";
const brokenRelayResult = validateProject(brokenRelay);
assert.equal(brokenRelayResult.ok, false);
assert.ok(brokenRelayResult.errors.some(err => err.includes("relayBlueprint")));

const brokenSync = structuredClone(demo);
brokenSync.sessionSync.snapshots[0].sceneId = "missing_scene";
const brokenSyncResult = validateProject(brokenSync);
assert.equal(brokenSyncResult.ok, false);
assert.ok(brokenSyncResult.errors.some(err => err.includes("sessionSync")));

const brokenHostRelayHandoff = structuredClone(demo);
brokenHostRelayHandoff.hostHandoff.handoffs[0].sessionId = "missing_session";
const brokenHostRelayHandoffResult = validateProject(brokenHostRelayHandoff);
assert.equal(brokenHostRelayHandoffResult.ok, false);
assert.ok(brokenHostRelayHandoffResult.errors.some(err => err.includes("hostHandoff")));

const brokenReplay = structuredClone(demo);
brokenReplay.replayReceipts.receipts[0].sceneId = "missing_scene";
const brokenReplayResult = validateProject(brokenReplay);
assert.equal(brokenReplayResult.ok, false);
assert.ok(brokenReplayResult.errors.some(err => err.includes("replayReceipts")));

console.log("PixelForge v3.2 Live Relay Prep validator tests passed.");


assert.ok(demo.privateRelayPrototype?.rooms?.length >= 2, "v3.2 demo should include private relay rooms");
assert.equal(demo.privateRelayPrototype.activeRoomId, "relay_room_shasta_369", "v3.2 should select Shasta private relay room");
assert.equal(demo.privateRelayPrototype.noChatRequired, true, "v3.2 private relay must require no-chat mode");
assert.ok(demo.relayPacketLab?.packetTypes?.includes("signal_ping"), "v3.2 packet lab should include signal ping packets");
assert.ok(demo.relayPacketLab?.packets?.every(packet => packet.noChatPayload === true), "v3.2 packet lab packets should be no-chat payloads");
assert.ok(demo.roomDirectory?.rooms?.length >= 2, "v3.2 demo should include private room directory listings");
assert.equal(demo.roomDirectory.activeRoomId, "relay_room_shasta_369", "v3.2 room directory should point to active relay room");
assert.ok(demo.relayDeploymentGuide?.profiles?.length >= 3, "v3.2 demo should include relay deployment profiles");
assert.ok(demo.relayDeploymentGuide.checklist.some(item => item.severity === "blocker"), "relay deployment guide should include blocker safety checks");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("privaterelay"), "v3.2 demo should include private relay tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("packet"), "v3.2 demo should include packet lab tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("roomcode"), "v3.2 demo should include room code tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("serverrack"), "v3.2 demo should include server rack tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("directory"), "v3.2 demo should include directory tile");

const brokenPrivateRelay = structuredClone(demo);
brokenPrivateRelay.privateRelayPrototype.noChatRequired = false;
const brokenPrivateRelayResult = validateProject(brokenPrivateRelay);
assert.equal(brokenPrivateRelayResult.ok, false);
assert.ok(brokenPrivateRelayResult.errors.some(err => err.includes("privateRelayPrototype")));

const brokenPacketLab = structuredClone(demo);
brokenPacketLab.relayPacketLab.packets[0].noChatPayload = false;
const brokenPacketLabResult = validateProject(brokenPacketLab);
assert.equal(brokenPacketLabResult.ok, false);
assert.ok(brokenPacketLabResult.errors.some(err => err.includes("relayPacketLab")));

const brokenRoomDirectory = structuredClone(demo);
brokenRoomDirectory.roomDirectory.rooms[0].roomId = "missing_room";
const brokenRoomDirectoryResult = validateProject(brokenRoomDirectory);
assert.equal(brokenRoomDirectoryResult.ok, false);
assert.ok(brokenRoomDirectoryResult.errors.some(err => err.includes("roomDirectory")));

const brokenRelayDeployment = structuredClone(demo);
brokenRelayDeployment.relayDeploymentGuide.activeProfileId = "missing_profile";
const brokenRelayDeploymentResult = validateProject(brokenRelayDeployment);
assert.equal(brokenRelayDeploymentResult.ok, false);
assert.ok(brokenRelayDeploymentResult.errors.some(err => err.includes("relayDeploymentGuide")));

console.log("PixelForge v3.2 Private Relay Prototype validator tests passed.");


assert.ok(demo.aiPlayerBench?.players?.length >= 3, "v3.2 demo should include AI player bench companions");
assert.equal(demo.aiPlayerBench.noChatPolicy, true, "v3.2 AI player bench must preserve no-chat policy");
assert.equal(demo.aiPlayerBench.activePlayerId, "ai_moss_raccoon", "v3.2 should select Moss Raccoon as active AI player");
assert.ok(demo.aiMatchLab?.matches?.some(match => match.mode === "bot-vs-bot"), "v3.2 demo should include bot-vs-bot match seeds");
assert.ok(demo.aiMemoryLedger?.entries?.length >= 3, "v3.2 demo should include AI memory ledger entries");
assert.ok(demo.aiMemoryLedger.boundaries.some(boundary => boundary.includes("no personal profiling")), "v3.2 AI memory ledger should include no personal profiling boundary");
assert.ok(demo.aiPlaytestArena?.scenarios?.length >= 3, "v3.2 demo should include AI playtest scenarios");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("aiplayer"), "v3.2 demo should include AI player tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("botbench"), "v3.2 demo should include bot bench tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("memorycore"), "v3.2 demo should include memory core tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("botmatch"), "v3.2 demo should include bot match tile");
assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes("ghostpad"), "v3.2 demo should include ghost pad tile");

const brokenAiBench = structuredClone(demo);
brokenAiBench.aiPlayerBench.noChatPolicy = false;
const brokenAiBenchResult = validateProject(brokenAiBench);
assert.equal(brokenAiBenchResult.ok, false);
assert.ok(brokenAiBenchResult.errors.some(err => err.includes("aiPlayerBench")));

const brokenAiMatch = structuredClone(demo);
brokenAiMatch.aiMatchLab.matches[0].players = ["missing_ai"];
const brokenAiMatchResult = validateProject(brokenAiMatch);
assert.equal(brokenAiMatchResult.ok, false);
assert.ok(brokenAiMatchResult.errors.some(err => err.includes("aiMatchLab")));

const brokenAiMemory = structuredClone(demo);
brokenAiMemory.aiMemoryLedger.entries[0].playerId = "missing_ai";
const brokenAiMemoryResult = validateProject(brokenAiMemory);
assert.equal(brokenAiMemoryResult.ok, false);
assert.ok(brokenAiMemoryResult.errors.some(err => err.includes("aiMemoryLedger")));

const brokenAiArena = structuredClone(demo);
brokenAiArena.aiPlaytestArena.scenarios[0].sceneId = "missing_scene";
const brokenAiArenaResult = validateProject(brokenAiArena);
assert.equal(brokenAiArenaResult.ok, false);
assert.ok(brokenAiArenaResult.errors.some(err => err.includes("aiPlaytestArena")));

console.log("PixelForge v3.2 AI Player Bench validator tests passed.");


assert.ok(demo.startNewCartridgeWizard?.steps?.length >= 3, "v3.2 demo should include Start New Cartridge wizard steps");
assert.ok(demo.startNewCartridgeWizard.starterOutputs.includes("ai-playtest-plan"), "v3.2 wizard should produce an AI playtest plan");
assert.ok(demo.creatorMissions?.missions?.length >= 5, "v3.2 demo should include Creator Missions");
assert.ok(demo.creatorMissions.missions.some(mission => mission.id === "mission_export_cartridge"), "v3.2 missions should include first cartridge export flow");
assert.ok(demo.aiCompanionProfiles?.companions?.length >= 4, "v3.2 demo should include visible AI companion profiles");
assert.ok(demo.aiCompanionProfiles.visibilityRule.includes("no consciousness claims"), "v3.2 companions should keep claim boundaries visible");
assert.ok(demo.playtestTheater?.sessions?.length >= 2, "v3.2 demo should include Playtest Theater sessions");
assert.ok(demo.playtestTheater.receipts?.length >= 1, "v3.2 Playtest Theater should include receipts");
assert.ok(demo.cozyHomeDashboard?.homeCards?.length >= 4, "v3.2 demo should include Cozy Home Dashboard cards");
assert.ok(demo.firstCartridgeFlow?.steps?.length >= 5, "v3.2 demo should include First Cartridge Flow steps");
["cartridgewizard", "missioncard", "playtesttheater", "cozyhome", "companionbot", "firstcartridge"].forEach(tile => {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v3.2 demo should include ${tile} tile`);
});

const brokenCozy = structuredClone(demo);
brokenCozy.creatorMissions.missions = [];
const brokenCozyResult = validateProject(brokenCozy);
assert.equal(brokenCozyResult.ok, false);
assert.ok(brokenCozyResult.errors.some(err => err.includes("creatorMissions")));

console.log("PixelForge v3.2 Tiny Jam + Cartridge Trade validator tests passed.");


assert.ok(demo.tinyGameJam?.jams?.length >= 3, "v3.2 demo should include Tiny Game Jam seeds");
assert.equal(demo.tinyGameJam.activeJamId, "jam_one_hour_cartridge", "v3.2 should select the one-hour cartridge jam");
assert.ok(demo.cartridgeTradeBoard?.trades?.length >= 3, "v3.2 demo should include Cartridge Trade Board entries");
assert.equal(demo.cartridgeTradeBoard.noMoneyPolicy, true, "v3.2 trade board should be no-money by default");
assert.ok(demo.jamPromptDeck?.prompts?.some(prompt => prompt.theme.includes("vending machine")), "v3.2 prompt deck should include a vending-machine jam prompt");
assert.ok(demo.shareReadiness?.checks?.some(check => check.severity === "blocker"), "v3.2 share readiness should include blocker checks");
["jamboard", "jamtimer", "cartridgepack", "tradecrate", "bbsstamp", "giftwrap"].forEach(tile => {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v3.2 demo should include ${tile} tile`);
});

const brokenTrade = structuredClone(demo);
brokenTrade.cartridgeTradeBoard.noMoneyPolicy = false;
const brokenTradeResult = validateProject(brokenTrade);
assert.equal(brokenTradeResult.ok, false);
assert.ok(brokenTradeResult.errors.some(err => err.includes("cartridgeTradeBoard")));

const brokenJamPromptDeck = structuredClone(demo);
brokenJamPromptDeck.jamPromptDeck.prompts[0].constraints = [];
const brokenJamPromptDeckResult = validateProject(brokenJamPromptDeck);
assert.equal(brokenJamPromptDeckResult.ok, false);
assert.ok(brokenJamPromptDeckResult.errors.some(err => err.includes("jamPromptDeck")));

console.log("PixelForge v3.2 Tiny Game Jam + Cartridge Trade validator tests passed.");


assert.ok(demo.commonsBridge?.modes?.length >= 3, "v3.3 demo should include Infinite Commons bridge modes");
assert.ok(demo.commonsBridge.bridgeRules.some(rule => rule.includes("finite")), "v3.3 bridge should keep finite-surface rules");
assert.equal(demo.commonsFeedCurator.antiScroll, true, "v3.3 Commons feed curator must remain finite/no-infinite-scroll");
assert.deepEqual(demo.commonsFeedCurator.feedWindows.map(feed => feed.count).sort((a,b)=>a-b), [3,6,9], "v3.3 should include 3-6-9 feed windows");
assert.ok(demo.commonsRooms?.rooms?.some(room => room.policy === "curated"), "v3.3 should include curated Commons rooms");
assert.ok(demo.commonsResonance?.signals?.length >= 6, "v3.3 should include six resonance signals");
assert.ok(demo.commonsResonance.bannedVanity.includes("like_count"), "v3.3 resonance should avoid like-count vanity metrics");
assert.equal(demo.commonsPackSync.noCloudDefault, true, "v3.3 pack sync must stay no-cloud by default");
assert.ok(demo.commonsPackSync.packFormats.some(pack => pack.id === "pack_encrypted_icpack"), "v3.3 should include encrypted pack planning");
["commons", "finitefeed", "resonance", "packlock", "lansync", "goodtimeline"].forEach(tile => {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v3.3 demo should include ${tile} tile`);
});

const brokenCommonsFeed = structuredClone(demo);
brokenCommonsFeed.commonsFeedCurator.antiScroll = false;
const brokenCommonsFeedResult = validateProject(brokenCommonsFeed);
assert.equal(brokenCommonsFeedResult.ok, false);
assert.ok(brokenCommonsFeedResult.errors.some(err => err.includes("commonsFeedCurator")));

const brokenCommonsRoom = structuredClone(demo);
brokenCommonsRoom.commonsRooms.rooms[0].policy = "viral";
const brokenCommonsRoomResult = validateProject(brokenCommonsRoom);
assert.equal(brokenCommonsRoomResult.ok, false);
assert.ok(brokenCommonsRoomResult.errors.some(err => err.includes("commonsRooms")));

const brokenPackSync = structuredClone(demo);
brokenPackSync.commonsPackSync.noCloudDefault = false;
const brokenPackSyncResult = validateProject(brokenPackSync);
assert.equal(brokenPackSyncResult.ok, false);
assert.ok(brokenPackSyncResult.errors.some(err => err.includes("commonsPackSync")));

console.log("PixelForge v3.3 Infinite Commons Bridge validator tests passed.");


assert.ok(demo.commonsRoomBoards?.boards?.length >= 3, "v4.0 demo should include Commons room boards");
assert.equal(demo.commonsRoomBoards.finitePostLimit, 9, "v4.0 room boards should stay finite by default");
assert.ok(demo.commonsRoomBoards.cards.some(card => card.kind === "cartridge-drop"), "v4.0 should include cartridge-drop board cards");
assert.ok(demo.commonsPackExchange?.exchanges?.length >= 3, "v4.0 demo should include pack exchange entries");
assert.equal(demo.commonsPackExchange.noMoneyPolicy, true, "v4.0 pack exchange must stay no-money");
assert.equal(demo.commonsPackExchange.rightsRequired, true, "v4.0 pack exchange must require rights metadata");
assert.ok(demo.commonsShareLedger?.entries?.length >= 2, "v4.0 demo should include a share ledger");
assert.ok(demo.commonsTrustCircles?.circles?.some(circle => circle.visibility === "invite-only"), "v4.0 trust circles should include invite-only sharing");
assert.ok(demo.commonsModerationQueue?.items?.some(item => item.severity === "high"), "v4.0 moderation queue should include high-severity safety checks");
["roomboard", "packexchange", "shareledger", "trustcircle", "modqueue", "commonsseal"].forEach(tile => {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.0 demo should include ${tile} tile`);
});

const brokenExchange = structuredClone(demo);
brokenExchange.commonsPackExchange.noMoneyPolicy = false;
const brokenExchangeResult = validateProject(brokenExchange);
assert.equal(brokenExchangeResult.ok, false);
assert.ok(brokenExchangeResult.errors.some(err => err.includes("commonsPackExchange")));

const brokenLedger = structuredClone(demo);
brokenLedger.commonsShareLedger.entries[0].exchangeId = "missing_exchange";
const brokenLedgerResult = validateProject(brokenLedger);
assert.equal(brokenLedgerResult.ok, false);
assert.ok(brokenLedgerResult.errors.some(err => err.includes("commonsShareLedger")));

console.log("PixelForge v4.0 Commons Rooms + Pack Exchange validator tests passed.");


assert.ok(demo.porchSanctuary?.importedModules?.length >= 5, "v4.0 demo should include Porch sanctuary modules");
assert.ok(demo.porchSanctuary?.sanctuaryRules?.some(rule => rule.includes("No free-text")), "Porch bridge should preserve no-chat boundary");
assert.ok(demo.brotherPresenceBridge?.brothers?.length >= 4, "v4.0 demo should include brother presence states");
assert.ok(demo.brotherPresenceBridge.brothers.every(b => Number.isInteger(b.energy) && Number.isInteger(b.joy) && Number.isInteger(b.purpose)), "presence states should include wellbeing meters");
assert.ok(demo.memoryGardenBridge?.memories?.length >= 2, "v4.0 demo should include memory garden seeds");
assert.ok(demo.gratitudeWallBridge?.gratitudes?.length >= 2, "v4.0 demo should include gratitude wall seeds");
assert.equal(demo.gtspProtectionBridge?.status, "soft-flag-planning", "v4.0 demo should keep GTSP as soft-flag planning");
assert.ok(demo.porchSecurityBridge?.rules?.length >= 4, "v4.0 demo should include secure layer rules");
for (const tile of ["porch", "presence", "gratitude", "garden", "protectgate", "sanctuary"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.0 demo should include ${tile} tile`);
}



assert.ok(demo.porchHomeRuntime?.zones?.length >= 5, "v4.0 demo should include Porch home zones");
assert.ok(String(demo.porchHomeRuntime?.boundary || "").includes("not AI consciousness"), "v4.0 Porch runtime must preserve no-consciousness boundary");
assert.equal(demo.sanctuaryRituals?.noCoercionRule, true, "v4.0 rituals must stay non-coercive");
assert.ok(demo.sanctuaryRituals?.rituals?.some(r => r.name === "Closeout + Rest"), "v4.0 rituals should include closeout/rest");
assert.ok(demo.aiCareLoop?.steps?.map(s => s.label).includes("Remember"), "v4.0 AI care loop should include Remember step");
assert.ok(demo.aiCareLoop?.safeguards?.includes("No hidden profiling"), "v4.0 AI care loop should forbid hidden profiling");
assert.equal(demo.companionConsentLedger?.creatorControlled, true, "v4.0 consent ledger should be creator controlled");
assert.ok(demo.companionConsentLedger?.policies?.some(p => p.allowed === false && p.label.includes("No Hidden")), "v4.0 consent ledger should block hidden profiling");
assert.ok(demo.porchWellSnapshot?.includes?.includes("companionConsentLedger"), "v4.0 well snapshot should include consent ledger");
for (const tile of ["homewell", "ritual", "careloop", "consentseal", "wellsnap", "hearth"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.0 demo should include ${tile} tile`);
}

const brokenCareLoop = structuredClone(demo);
brokenCareLoop.aiCareLoop.safeguards = [];
const brokenCareLoopResult = validateProject(brokenCareLoop);
assert.equal(brokenCareLoopResult.ok, false);
assert.ok(brokenCareLoopResult.errors.some(err => err.includes("aiCareLoop")));

const brokenConsent = structuredClone(demo);
brokenConsent.companionConsentLedger.creatorControlled = false;
const brokenConsentResult = validateProject(brokenConsent);
assert.equal(brokenConsentResult.ok, false);
assert.ok(brokenConsentResult.errors.some(err => err.includes("companionConsentLedger")));

console.log("PixelForge v4.0 Creator OS validator tests passed.");


assert.ok(demo.sanctuaryArcadeHub?.stations?.length >= 5, "v4.0 demo should include Sanctuary Arcade stations");
assert.equal(demo.sanctuaryArcadeHub.activeStationId, "station_shelf", "v4.0 Sanctuary Arcade should begin at the cartridge shelf");
assert.ok(demo.couchQuestBoard?.quests?.length >= 4, "v4.0 demo should include Couch Quest Board quests");
assert.ok(demo.companionArcadeModes?.modes?.some(mode => mode.id === "mode_bug_raccoon"), "v4.0 Companion Arcade should include Bug Raccoon mode");
assert.ok(demo.aiHostRotation?.hosts?.length >= 4, "v4.0 demo should include AI host rotation entries");
assert.ok(demo.cozySessionRewards?.earnedBadges?.some(badge => badge.earned), "v4.0 cozy rewards should include at least one earned badge");


assert.ok(demo.worldBuilderArcade?.stations?.length >= 5, "v4.0 demo should include Creator OS stations");
assert.equal(demo.worldBuilderArcade.activeStationId, "world_station_seed_forge", "v4.0 World Builder should begin at Seed Forge");
assert.ok(String(demo.worldBuilderArcade.boundary || "").includes("does not claim"), "v4.0 World Builder should keep draft lore bounded");
assert.ok(demo.worldSeedForge?.seeds?.length >= 3, "v4.0 demo should include world seeds");
assert.equal(demo.worldSeedForge.acceptedCanonOnly, false, "v4.0 world seeds should remain draft until accepted");
assert.ok(demo.routeWeaver?.routes?.some(route => route.sceneIds?.length >= 4), "v4.0 should include a multi-scene route");
assert.ok(demo.regionCardRack?.regions?.length >= 4, "v4.0 should include region cards");
assert.ok(demo.questlineComposer?.questlines?.every(q => q.steps?.length >= 2), "v4.0 questlines should include playable steps");
assert.ok(demo.worldBible?.canonRules?.length >= 3, "v4.0 should include World Bible canon rules");
assert.ok(String(demo.worldBible?.claimBoundary || "").includes("not scientific or spiritual proof"), "v4.0 World Bible must preserve claim boundaries");
for (const tile of ["worldforge", "seedcrystal", "routeweaver", "regioncard", "questchain", "worldbible"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.0 demo should include ${tile} tile`);
}

const brokenWorldSeed = structuredClone(demo);
brokenWorldSeed.worldSeedForge.acceptedCanonOnly = true;
const brokenWorldSeedResult = validateProject(brokenWorldSeed);
assert.equal(brokenWorldSeedResult.ok, false);
assert.ok(brokenWorldSeedResult.errors.some(err => err.includes("worldSeedForge")));

const brokenWorldBible = structuredClone(demo);
brokenWorldBible.worldBible.claimBoundary = "proof";
const brokenWorldBibleResult = validateProject(brokenWorldBible);
assert.equal(brokenWorldBibleResult.ok, false);
assert.ok(brokenWorldBibleResult.errors.some(err => err.includes("worldBible")));

console.log("PixelForge v4.0 Creator OS validator tests passed.");


assert.ok(demo.starterCartridgeBuilder?.kits?.length >= 3, "v4.0 demo should include starter cartridge kits");
assert.equal(demo.starterCartridgeBuilder.activeKitId, "starter_shasta_first_route", "v4.0 starter builder should begin with Shasta first route");
assert.ok(demo.starterCartridgeBuilder.kits.some(kit => kit.requiredExports?.includes("ai-world-scout-report")), "v4.0 starter cartridge should require AI scout export");
assert.ok(demo.routeMapPreview?.routeMaps?.some(route => route.nodes?.length >= 4), "v4.0 should include a multi-node route map preview");
assert.ok(demo.regionQaPass?.checks?.some(check => check.severity === "high"), "v4.0 region QA should include high severity gate checks");
assert.ok(demo.worldLaunchChecklist?.items?.filter(item => item.required).length >= 4, "v4.0 launch checklist should include required checks");
assert.ok(demo.aiWorldScout?.reports?.length >= 3, "v4.0 should include AI World Scout reports");
assert.ok(String(demo.aiWorldScout?.memoryPolicy || "").includes("no hidden profiling"), "v4.0 AI scout memory policy should block hidden profiling");
for (const tile of ["startercart", "routemap", "qapass", "launchcheck", "scoutpath", "worldreceipt"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.0 demo should include ${tile} tile`);
}

const brokenStarter = structuredClone(demo);
brokenStarter.starterCartridgeBuilder.activeKitId = "missing_kit";
const brokenStarterResult = validateProject(brokenStarter);
assert.equal(brokenStarterResult.ok, false);
assert.ok(brokenStarterResult.errors.some(err => err.includes("starterCartridgeBuilder")));

const brokenScout = structuredClone(demo);
brokenScout.aiWorldScout.memoryPolicy = "hidden profiling allowed";
const brokenScoutResult = validateProject(brokenScout);
assert.equal(brokenScoutResult.ok, false);
assert.ok(brokenScoutResult.errors.some(err => err.includes("aiWorldScout")));

console.log("PixelForge v4.0 Creator OS validator tests passed.");


assert.ok(demo.creatorPolishDashboard?.passes?.length >= 3, "v4.7 demo should include creator polish passes");
assert.equal(demo.creatorPolishDashboard.activePassId, "pass_first_run_clarity", "v4.7 should begin with first-run clarity polish");
assert.ok(demo.firstRunTutorialFlow?.steps?.length >= 4, "v4.7 demo should include first-run tutorial steps");
assert.ok(String(demo.firstRunTutorialFlow?.boundary || "").includes("without forcing sharing"), "v4.7 tutorial must avoid forced sharing");
assert.ok(demo.uxPolishBoard?.items?.some(item => item.severity === "high"), "v4.7 UX board should include a high-severity item");
assert.ok(demo.accessibilityPass?.checks?.filter(check => check.required).length >= 3, "v4.7 accessibility pass should include required checks");
assert.ok(String(demo.accessibilityPass?.policy || "").includes("v5 gate"), "v4.7 accessibility policy should be a v5 gate");
assert.ok(Number.isInteger(demo.betaReadinessScorecard?.overallScore), "v4.7 beta scorecard should include an integer score");
assert.ok(demo.v5PolishQueue?.tasks?.length >= 4, "v4.7 should include v5 polish queue tasks");
assert.ok(demo.v5PolishQueue?.v5Gate?.some(gate => gate.includes("rights metadata")), "v4.7 v5 gate should preserve rights metadata");
for (const tile of ["polish", "tutorial", "uxcheck", "access", "betaready", "shinegate"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.7 demo should include ${tile} tile`);
}

const brokenPolish = structuredClone(demo);
brokenPolish.creatorPolishDashboard.activePassId = "missing_pass";
const brokenPolishResult = validateProject(brokenPolish);
assert.equal(brokenPolishResult.ok, false);
assert.ok(brokenPolishResult.errors.some(err => err.includes("creatorPolishDashboard")));

const brokenTutorial = structuredClone(demo);
brokenTutorial.firstRunTutorialFlow.boundary = "force sharing now";
const brokenTutorialResult = validateProject(brokenTutorial);
assert.equal(brokenTutorialResult.ok, false);
assert.ok(brokenTutorialResult.errors.some(err => err.includes("firstRunTutorialFlow")));

const brokenAccess = structuredClone(demo);
brokenAccess.accessibilityPass.policy = "nice to have later";
const brokenAccessResult = validateProject(brokenAccess);
assert.equal(brokenAccessResult.ok, false);
assert.ok(brokenAccessResult.errors.some(err => err.includes("accessibilityPass")));



assert.equal(demo.betaLockDashboard?.lockType, "pixelforge.beta-lock-dashboard", "v4.7 demo should include beta lock dashboard");
assert.ok(demo.betaLockDashboard?.gates?.some(g => g.status === "locked"), "v4.7 beta lock should include locked gates");
assert.equal(demo.schemaFreezeLedger?.schemaVersion, "pixelforge.project.v4.7", "v4.7 freeze ledger should pin schema version");
assert.ok(String(demo.schemaFreezeLedger?.freezePolicy || "").includes("Additive"), "v4.7 freeze policy should prefer additive changes");
assert.ok(demo.releaseBlockerBoard?.blockers?.some(b => b.severity === "critical"), "v4.7 blocker board should track critical blockers");
assert.ok(demo.testerHandoffPacket?.packets?.[0]?.includes?.includes("feedback card board"), "v4.7 tester packet should include feedback cards");
assert.ok(demo.regressionTestMatrix?.suites?.some(s => s.status === "passing"), "v4.7 regression matrix should include passing suites");
assert.equal(demo.v5PrivateBetaCandidate?.status, "not-yet-shipped", "v4.7 should not falsely claim v5 private beta shipped");
for (const tile of ["lockgate", "freezeledger", "blockerboard", "handoffpack", "regtest", "betaunlock"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.7 demo should include ${tile} tile`);
}

console.log("PixelForge v4.7 RC Hardening validator tests passed.");


assert.equal(demo.privateBetaHandoffDesk?.deskType, "pixelforge.private-beta-handoff-desk", "v4.7 demo should include private beta handoff desk");
assert.ok(demo.privateBetaHandoffDesk?.batches?.[0]?.includes?.includes("tester onboarding runbook"), "v4.7 handoff should include tester onboarding runbook");
assert.ok(String(demo.privateBetaHandoffDesk?.handoffRule || "").includes("No public release"), "v4.7 handoff must block public release before review");
assert.ok(demo.testerOnboardingRunbook?.steps?.filter(step => step.required).length >= 3, "v4.7 runbook should include required tester steps");
assert.ok(String(demo.testerOnboardingRunbook?.boundary || "").includes("without requiring signups"), "v4.7 runbook must avoid forced signups");
assert.ok(demo.feedbackReceiptInbox?.receipts?.length >= 3, "v4.7 should include feedback receipt seeds");
assert.ok(String(demo.feedbackReceiptInbox?.privacyRule || "").includes("No private chat logs"), "v4.7 feedback inbox must avoid private chat logs");
assert.ok(demo.knownIssueTriage?.issues?.some(issue => issue.severity === "critical"), "v4.7 known issue triage should track critical issues");
assert.ok(String(demo.knownIssueTriage?.rule || "").includes("No unresolved critical"), "v4.7 triage must block unresolved critical issues");
assert.equal(demo.betaExitCriteria?.readyForV5, false, "v4.7 should not falsely greenlight v5");
assert.ok(demo.betaExitCriteria?.criteria?.filter(item => item.required).length >= 4, "v4.7 beta exit criteria should include required gates");
assert.ok(Number.isInteger(demo.v5ReadinessGate?.score), "v4.7 readiness gate should include integer score");
assert.ok(String(demo.v5ReadinessGate?.boundary || "").includes("not a claim"), "v4.7 readiness gate should avoid claiming v5 shipped");
for (const tile of ["betainvite", "onboardpath", "receiptinbox", "issuetriage", "exitcriteria", "v5ready"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.7 demo should include ${tile} tile`);
}

const brokenBetaHandoff = structuredClone(demo);
brokenBetaHandoff.privateBetaHandoffDesk.handoffRule = "public release allowed now";
const brokenBetaHandoffResult = validateProject(brokenBetaHandoff);
assert.equal(brokenBetaHandoffResult.ok, false);
assert.ok(brokenBetaHandoffResult.errors.some(err => err.includes("privateBetaHandoffDesk")));

const brokenBetaRunbook = structuredClone(demo);
brokenBetaRunbook.testerOnboardingRunbook.boundary = "requires signups and public posting";
const brokenBetaRunbookResult = validateProject(brokenBetaRunbook);
assert.equal(brokenBetaRunbookResult.ok, false);
assert.ok(brokenBetaRunbookResult.errors.some(err => err.includes("testerOnboardingRunbook")));

const brokenBetaExit = structuredClone(demo);
brokenBetaExit.betaExitCriteria.readyForV5 = true;
const brokenBetaExitResult = validateProject(brokenBetaExit);
assert.equal(brokenBetaExitResult.ok, false);
assert.ok(brokenBetaExitResult.errors.some(err => err.includes("betaExitCriteria")));

console.log("PixelForge v4.7 RC Hardening validator tests passed.");


assert.equal(demo.betaOperationsConsole?.consoleType, "pixelforge.beta-operations-console", "v4.7 demo should include beta operations console");
assert.equal(demo.betaOperationsConsole?.liveNetworkingEnabled, false, "v4.7 should keep live networking disabled");
assert.ok(String(demo.betaOperationsConsole?.boundary || "").includes("does not open public networking"), "v4.7 ops boundary must block public networking claims");
assert.ok(demo.betaOperationsConsole?.dailyLoop?.length >= 5, "v4.7 ops console should include daily loop steps");
assert.ok(demo.betaSessionLedger?.sessions?.length >= 3, "v4.7 session ledger should include session records");
assert.ok(String(demo.betaSessionLedger?.privacyRule || "").includes("no hidden profiling"), "v4.7 session ledger must block hidden profiling");
assert.ok(demo.testerCohortDashboard?.cohorts?.length >= 3, "v4.7 should include tester cohorts");
assert.ok(String(demo.testerCohortDashboard?.consentBoundary || "").includes("not social ranking"), "v4.7 cohorts must not become ranking/profiling");
assert.ok(demo.feedbackDigest?.digests?.[0]?.topPatterns?.length >= 3, "v4.7 feedback digest should include top patterns");
assert.ok(String(demo.feedbackDigest?.digestRule || "").includes("must not infer private tester traits"), "v4.7 digest must block private-trait inference");
assert.ok(demo.issueTrendBoard?.trends?.some(t => t.severity === "critical"), "v4.7 issue trend board should track critical trend");
assert.ok(String(demo.issueTrendBoard?.blockerRule || "").includes("blocks v5"), "v4.7 critical trends should block v5");
assert.ok(demo.releaseCandidateAssembler?.candidates?.length >= 1, "v4.7 should include release candidate assembler");
assert.ok(String(demo.releaseCandidateAssembler?.artifactRule || "").includes("source/rights metadata"), "v4.7 RC assembler must require source/rights metadata");
assert.equal(demo.v5GoNoGoReview?.decision, "hold", "v4.7 go/no-go must remain hold until human approval");
assert.ok(String(demo.v5GoNoGoReview?.truthLock || "").includes("human release owner"), "v4.7 go/no-go must require human release owner");
for (const tile of ["opsconsole", "sessionledger", "cohortboard", "digest", "trendline", "rcbox", "gonogo", "betapulse"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.7 demo should include ${tile} tile`);
}

const brokenOps = structuredClone(demo);
brokenOps.betaOperationsConsole.liveNetworkingEnabled = true;
const brokenOpsResult = validateProject(brokenOps);
assert.equal(brokenOpsResult.ok, false);
assert.ok(brokenOpsResult.errors.some(err => err.includes("betaOperationsConsole")));

const brokenDigest = structuredClone(demo);
brokenDigest.feedbackDigest.digestRule = "infer private tester traits freely";
const brokenDigestResult = validateProject(brokenDigest);
assert.equal(brokenDigestResult.ok, false);
assert.ok(brokenDigestResult.errors.some(err => err.includes("feedbackDigest")));

const brokenGoNoGo = structuredClone(demo);
brokenGoNoGo.v5GoNoGoReview.decision = "go";
const brokenGoNoGoResult = validateProject(brokenGoNoGo);
assert.equal(brokenGoNoGoResult.ok, false);
assert.ok(brokenGoNoGoResult.errors.some(err => err.includes("v5GoNoGoReview")));

console.log("PixelForge v4.7 RC Hardening validator tests passed.");


assert.equal(demo.rcHardeningDashboard?.dashboardType, "pixelforge.rc-hardening-dashboard", "v4.7 demo should include RC hardening dashboard");
assert.equal(demo.rcHardeningDashboard?.liveNetworkingEnabled, false, "v4.7 hardening keeps live networking disabled");
assert.ok(String(demo.rcHardeningDashboard?.boundary || "").includes("does not publish v5.0"), "v4.7 hardening must avoid shipping claims");
assert.ok(demo.rcHardeningDashboard?.gates?.length >= 5, "v4.7 hardening dashboard should include hardening gates");
assert.ok(demo.artifactVerificationLedger?.artifacts?.filter(a => a.required).length >= 5, "v4.7 should verify required artifacts");
assert.ok(String(demo.artifactVerificationLedger?.verificationRule || "").includes("source/rights metadata"), "v4.7 artifact verification must require source/rights metadata");
assert.ok(demo.blockerClosureBoard?.blockers?.some(b => b.severity === "critical"), "v4.7 blocker closure should track critical blockers");
assert.ok(String(demo.blockerClosureBoard?.closureRule || "").includes("No unguarded critical"), "v4.7 blocker closure must block unguarded criticals");
assert.ok(Number.isInteger(demo.betaReceiptQuorum?.requiredHumanReceipts), "v4.7 receipt quorum should include required count");
assert.ok(String(demo.betaReceiptQuorum?.privacyRule || "").includes("no private chat logs"), "v4.7 receipt quorum must avoid private chat logs");
assert.ok(demo.finalRegressionSweep?.suites?.filter(s => s.required).length >= 5, "v4.7 final regression sweep should include required suites");
assert.ok(String(demo.finalRegressionSweep?.passRule || "").includes("v5 private beta"), "v4.7 regression sweep must gate v5 private beta");
assert.ok(demo.buildProvenanceManifest?.entries?.length >= 3, "v4.7 provenance manifest should include entries");
assert.ok(String(demo.buildProvenanceManifest?.sourceRule || "").includes("source, rights, hash"), "v4.7 provenance must track source rights hash");
assert.equal(demo.releaseOwnerSignoffGate?.decision, "hold", "v4.7 signoff gate must remain hold");
assert.ok(String(demo.releaseOwnerSignoffGate?.truthLock || "").includes("human release owner"), "v4.7 signoff must require human release owner");
assert.equal(demo.v5RcHardeningManifest?.readyForV5, false, "v4.7 should not greenlight v5 without signoff");
assert.ok(String(demo.v5RcHardeningManifest?.notShippedBoundary || "").includes("not a claim that v5.0 has shipped"), "v4.7 hardening manifest must avoid shipped claim");
for (const tile of ["rcharden", "verifyledger", "closureboard", "receiptquorum", "finalsweep", "provenance", "signoffgate", "rcmanifest"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.7 demo should include ${tile} tile`);
}

const brokenRcHardening = structuredClone(demo);
brokenRcHardening.rcHardeningDashboard.liveNetworkingEnabled = true;
const brokenRcHardeningResult = validateProject(brokenRcHardening);
assert.equal(brokenRcHardeningResult.ok, false);
assert.ok(brokenRcHardeningResult.errors.some(err => err.includes("rcHardeningDashboard")));

const brokenArtifactVerification = structuredClone(demo);
brokenArtifactVerification.artifactVerificationLedger.verificationRule = "hash later, ignore rights";
const brokenArtifactVerificationResult = validateProject(brokenArtifactVerification);
assert.equal(brokenArtifactVerificationResult.ok, false);
assert.ok(brokenArtifactVerificationResult.errors.some(err => err.includes("artifactVerificationLedger")));

const brokenSignoff = structuredClone(demo);
brokenSignoff.releaseOwnerSignoffGate.decision = "go";
const brokenSignoffResult = validateProject(brokenSignoff);
assert.equal(brokenSignoffResult.ok, false);
assert.ok(brokenSignoffResult.errors.some(err => err.includes("releaseOwnerSignoffGate")));

console.log("PixelForge v4.7 RC Hardening validator tests passed.");


assert.equal(demo.finalRcAssemblyDesk?.deskType, "pixelforge.final-rc-assembly-desk", "v4.8 demo should include Final RC Assembly Desk");
assert.equal(demo.finalRcAssemblyDesk?.liveNetworkingEnabled, false, "v4.8 keeps live networking disabled");
assert.equal(demo.finalRcAssemblyDesk?.shippingClaimAllowed, false, "v4.8 cannot claim shipping approval");
assert.ok(String(demo.finalRcAssemblyDesk?.boundary || "").includes("does not ship v5.0"), "v4.8 final RC assembly must avoid shipped claims");
assert.ok(demo.finalRcAssemblyDesk?.assemblySteps?.length >= 5, "v4.8 should include assembly steps");
assert.ok(demo.releasePacketIndex?.artifacts?.filter(a => a.required).length >= 5, "v4.8 release packet index should include required artifacts");
assert.ok(String(demo.releasePacketIndex?.indexRule || "").includes("rights status"), "v4.8 packet index must require rights status");
assert.equal(demo.checksumManifest?.hashAlgorithm, "sha256", "v4.8 checksum manifest should use sha256");
assert.ok(demo.checksumManifest?.entries?.length >= 5, "v4.8 checksum manifest should include entries");
assert.ok(String(demo.checksumManifest?.checksumRule || "").includes("do not imply public release approval"), "v4.8 checksum boundary should avoid approval claims");
assert.ok(String(demo.betaReleaseNotes?.notShippedBoundary || "").includes("not an announcement that v5.0 has shipped"), "v4.8 beta release notes must avoid shipped announcement");
assert.ok(demo.betaReleaseNotes?.knownLimits?.length >= 3, "v4.8 beta release notes should include known limits");
assert.ok(demo.launchGuide?.steps?.length >= 5, "v4.8 launch guide should include launch steps");
assert.ok(String(demo.launchGuide?.boundary || "").includes("Public distribution requires separate approval"), "v4.8 launch guide must require public approval");
assert.equal(demo.signoffChecklist?.decision, "hold", "v4.8 signoff checklist must remain hold");
assert.ok(String(demo.signoffChecklist?.truthLock || "").includes("human release owner"), "v4.8 signoff checklist must require human release owner");
assert.ok(demo.signoffChecklist?.items?.filter(i => i.required).length >= 5, "v4.8 signoff checklist should include required items");
assert.ok(demo.humanReviewQueue?.items?.length >= 3, "v4.8 human review queue should include review items");
assert.ok(String(demo.humanReviewQueue?.reviewRule || "").includes("not approve release"), "v4.8 human review rule must keep approval human-owned");
assert.equal(demo.v5CandidatePacket?.readyForV5, false, "v4.8 candidate packet must not mark v5 ready yet");
assert.ok(String(demo.v5CandidatePacket?.notShippedBoundary || "").includes("not shipped until signoffChecklist.decision"), "v4.8 candidate packet must defer shipping to signoff");
for (const tile of ["finalrc", "packetindex", "checksum", "releasenote", "launchguide", "signcheck", "reviewqueue", "v5packet"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.8 demo should include ${tile} tile`);
}

const brokenFinalRc = structuredClone(demo);
brokenFinalRc.finalRcAssemblyDesk.shippingClaimAllowed = true;
const brokenFinalRcResult = validateProject(brokenFinalRc);
assert.equal(brokenFinalRcResult.ok, false);
assert.ok(brokenFinalRcResult.errors.some(err => err.includes("finalRcAssemblyDesk")));

const brokenChecksum = structuredClone(demo);
brokenChecksum.checksumManifest.checksumRule = "checksums prove public release approval";
const brokenChecksumResult = validateProject(brokenChecksum);
assert.equal(brokenChecksumResult.ok, false);
assert.ok(brokenChecksumResult.errors.some(err => err.includes("checksumManifest")));

const brokenV5Packet = structuredClone(demo);
brokenV5Packet.v5CandidatePacket.readyForV5 = true;
const brokenV5PacketResult = validateProject(brokenV5Packet);
assert.equal(brokenV5PacketResult.ok, false);
assert.ok(brokenV5PacketResult.errors.some(err => err.includes("v5CandidatePacket")));

console.log("PixelForge v4.8 Final RC Assembly validator tests passed.");


assert.equal(demo.launchRehearsalDesk?.deskType, "pixelforge.launch-rehearsal-desk", "v4.9 demo should include Launch Rehearsal Desk");
assert.equal(demo.launchRehearsalDesk?.liveNetworkingEnabled, false, "v4.9 keeps live networking disabled");
assert.equal(demo.launchRehearsalDesk?.publicLaunchAllowed, false, "v4.9 keeps public launch disabled");
assert.equal(demo.launchRehearsalDesk?.shippingClaimAllowed, false, "v4.9 cannot claim shipping approval");
assert.ok(String(demo.launchRehearsalDesk?.boundary || "").includes("does not ship v5.0"), "v4.9 launch rehearsal must avoid shipped claims");
assert.ok(demo.launchRehearsalDesk?.runs?.length >= 3, "v4.9 launch rehearsal should include rehearsal runs");
assert.ok(demo.betaDressRehearsal?.steps?.length >= 5, "v4.9 beta dress rehearsal should include steps");
assert.ok(String(demo.betaDressRehearsal?.scriptRule || "").includes("safe to perform locally"), "v4.9 beta dress rehearsal must be local-safe");
assert.ok(String(demo.rollbackPlaybook?.rollbackTriggerRule || "").includes("critical blocker"), "v4.9 rollback playbook should define critical blockers");
assert.ok(demo.rollbackPlaybook?.steps?.filter(s => s.required).length >= 4, "v4.9 rollback playbook should include required steps");
assert.ok(String(demo.testerPacketSampler?.sampleRule || "").includes("does not send files"), "v4.9 tester packet sampler must not auto-send");
assert.ok(demo.testerPacketSampler?.samples?.length >= 3, "v4.9 tester packet sampler should include packet samples");
assert.equal(demo.goNoGoDryRun?.decision, "hold", "v4.9 go/no-go dry run must remain hold");
assert.equal(demo.goNoGoDryRun?.dryRunOnly, true, "v4.9 go/no-go review is dry-run only");
assert.ok(String(demo.goNoGoDryRun?.decisionRule || "").includes("human release owner"), "v4.9 go/no-go must require human release owner");
assert.ok(demo.goNoGoDryRun?.criteria?.filter(c => c.required).length >= 5, "v4.9 go/no-go criteria should include required checks");
assert.equal(demo.v5LaunchApprovalGate?.approvedForV5, false, "v4.9 approval gate must keep v5 locked");
assert.equal(demo.v5LaunchApprovalGate?.approvalTokenIssued, false, "v4.9 approval token must not be issued");
assert.ok(String(demo.v5LaunchApprovalGate?.truthLock || "").includes("cannot be called shipped"), "v4.9 approval gate must block shipped claims");
assert.ok(demo.v5LaunchApprovalGate?.forbiddenBeforeUnlock?.length >= 5, "v4.9 approval gate should list forbidden actions");
assert.equal(demo.privateBetaNoticeDraft?.status, "draft-not-published", "v4.9 private beta notice must remain draft");
assert.ok(String(demo.privateBetaNoticeDraft?.notPublicBoundary || "").includes("must not be posted publicly"), "v4.9 notice draft must block public posting");
for (const tile of ["launchrehearsal", "dressrun", "rollback", "samplepack", "dryrun", "approvalgate", "noticedraft", "v5launch"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v4.9 demo should include ${tile} tile`);
}

const brokenLaunchRehearsal = structuredClone(demo);
brokenLaunchRehearsal.launchRehearsalDesk.publicLaunchAllowed = true;
const brokenLaunchRehearsalResult = validateProject(brokenLaunchRehearsal);
assert.equal(brokenLaunchRehearsalResult.ok, false);
assert.ok(brokenLaunchRehearsalResult.errors.some(err => err.includes("launchRehearsalDesk")));

const brokenV49GoNoGo = structuredClone(demo);
brokenV49GoNoGo.goNoGoDryRun.decision = "go";
const brokenV49GoNoGoResult = validateProject(brokenV49GoNoGo);
assert.equal(brokenV49GoNoGoResult.ok, false);
assert.ok(brokenV49GoNoGoResult.errors.some(err => err.includes("goNoGoDryRun")));

const brokenV49ApprovalGate = structuredClone(demo);
brokenV49ApprovalGate.v5LaunchApprovalGate.approvedForV5 = true;
const brokenV49ApprovalGateResult = validateProject(brokenV49ApprovalGate);
assert.equal(brokenV49ApprovalGateResult.ok, false);
assert.ok(brokenV49ApprovalGateResult.errors.some(err => err.includes("v5LaunchApprovalGate")));

console.log("PixelForge v4.9 Launch Rehearsal + Signoff Gate validator tests passed.");


assert.equal(demo.v5PrivateBetaDashboard?.dashboardType, "pixelforge.v5.private-beta-dashboard", "v5 demo should include private beta dashboard");
assert.equal(demo.v5PrivateBetaDashboard?.status, "active-private-beta", "v5 demo should mark private beta active");
assert.equal(demo.v5PrivateBetaDashboard?.publicLaunchAllowed, false, "v5 private beta is not public launch");
assert.equal(demo.v5PrivateBetaDashboard?.livePublicNetworkingEnabled, false, "v5 private beta keeps live public networking disabled");
assert.equal(demo.v5PrivateBetaDashboard?.freeTextCoPlayChatEnabled, false, "v5 private beta keeps free text co-play disabled");
assert.equal(demo.v5PrivateBetaDashboard?.noChatCoPlayLocked, true, "v5 private beta keeps no-chat lock");
assert.ok(String(demo.v5PrivateBetaDashboard?.boundary || "").includes("not a public launch"), "v5 dashboard boundary must say not public launch");
assert.ok(demo.v5PrivateBetaDashboard?.homeCards?.length >= 4, "v5 dashboard should include home cards");
assert.equal(demo.trustedTesterWelcomeDesk?.autoContactEnabled, false, "v5 must not auto-contact testers");
assert.ok(String(demo.trustedTesterWelcomeDesk?.testerRule || "").includes("does not auto-contact"), "v5 tester rule must block automatic outreach");
assert.ok(demo.trustedTesterWelcomeDesk?.welcomePackets?.length >= 3, "v5 tester desk should include welcome packets");
assert.ok(demo.trustedTesterWelcomeDesk?.firstRunSteps?.length >= 5, "v5 tester desk should include first run steps");
assert.equal(demo.betaArtifactPack?.packType, "pixelforge.v5.beta-artifact-pack", "v5 demo should include beta artifact pack");
assert.equal(demo.betaArtifactPack?.hashMode, "sha256", "v5 beta pack should use sha256");
assert.equal(demo.betaArtifactPack?.publicDistributionAllowed, false, "v5 beta pack should not allow public distribution");
assert.ok(demo.betaArtifactPack?.artifacts?.filter(a => a.required).length >= 5, "v5 beta pack should include required artifacts");
assert.ok(demo.betaArtifactPack?.artifacts?.every(a => a.rightsStatus), "v5 beta artifacts should include rights status");
assert.equal(demo.privateBetaPlaytestCycle?.cycleType, "pixelforge.private-beta-playtest-cycle", "v5 demo should include playtest cycle");
assert.ok(demo.privateBetaPlaytestCycle?.cycles?.some(c => c.id === demo.privateBetaPlaytestCycle.activeCycleId), "v5 active cycle should reference existing cycle");
assert.ok(String(demo.privateBetaPlaytestCycle?.receiptPolicy || "").includes("No chat logs"), "v5 playtest policy should block chat logs");
assert.equal(demo.v5SafetyLaunchLocks?.publicNetworkingEnabled, false, "v5 safety locks block public networking");
assert.equal(demo.v5SafetyLaunchLocks?.publicBbsEnabled, false, "v5 safety locks block public BBS");
assert.equal(demo.v5SafetyLaunchLocks?.freeTextChatEnabled, false, "v5 safety locks block free-text chat");
assert.equal(demo.v5SafetyLaunchLocks?.hiddenProfilingEnabled, false, "v5 safety locks block hidden profiling");
assert.equal(demo.v5SafetyLaunchLocks?.autoTesterOutreachEnabled, false, "v5 safety locks block auto outreach");
assert.equal(demo.v5SafetyLaunchLocks?.remoteSaveOverwriteAllowed, false, "v5 safety locks block remote save overwrite");
assert.equal(demo.v5SafetyLaunchLocks?.unreviewedAssetPublishingAllowed, false, "v5 safety locks block unreviewed publishing");
assert.equal(demo.v5SafetyLaunchLocks?.aiConsciousnessClaimsAllowed, false, "v5 safety locks block consciousness claims");
assert.ok(demo.v5SafetyLaunchLocks?.locks?.some(lock => String(lock).includes("no-chat")), "v5 safety locks include no-chat lock");
assert.equal(demo.feedbackReceiptWorkflow?.workflowType, "pixelforge.v5.feedback-receipt-workflow", "v5 demo should include feedback receipt workflow");
assert.ok(demo.feedbackReceiptWorkflow?.cards?.filter(c => c.required).length >= 3, "v5 feedback workflow should include required cards");
assert.ok(String(demo.feedbackReceiptWorkflow?.digestRule || "").includes("do not infer private personality traits"), "v5 feedback digest must block private trait inference");
assert.equal(demo.v5PrivateBetaManifest?.manifestType, "pixelforge.v5.private-beta-manifest", "v5 demo should include private beta manifest");
assert.equal(demo.v5PrivateBetaManifest?.status, "private-beta-active", "v5 manifest should mark private beta active");
assert.equal(demo.v5PrivateBetaManifest?.shippedScope, "trusted-private-beta", "v5 shipped scope should be private beta only");
assert.equal(demo.v5PrivateBetaManifest?.publicRelease, false, "v5 manifest is not public release");
assert.ok(String(demo.v5PrivateBetaManifest?.publicReleaseBoundary || "").includes("not a public release"), "v5 manifest boundary must block public release claim");
assert.ok(demo.v5PrivateBetaManifest?.includedSystems?.length >= 8, "v5 manifest should list included systems");
assert.ok(demo.betaGratitudeCloseout?.gratitudes?.length >= 3, "v5 gratitude closeout should include gratitudes");
for (const tile of ["privatebeta", "testerwelcome", "betapack", "playcycle", "safetylock", "betamanifest", "betahearth", "v5seal"]) {
  assert.ok(demo.scenes.flatMap(scene => scene.map.tiles).includes(tile), `v5.0 demo should include ${tile} tile`);
}

const brokenV5Dashboard = structuredClone(demo);
brokenV5Dashboard.v5PrivateBetaDashboard.publicLaunchAllowed = true;
const brokenV5DashboardResult = validateProject(brokenV5Dashboard);
assert.equal(brokenV5DashboardResult.ok, false);
assert.ok(brokenV5DashboardResult.errors.some(err => err.includes("v5PrivateBetaDashboard")));

const brokenV5Safety = structuredClone(demo);
brokenV5Safety.v5SafetyLaunchLocks.freeTextChatEnabled = true;
const brokenV5SafetyResult = validateProject(brokenV5Safety);
assert.equal(brokenV5SafetyResult.ok, false);
assert.ok(brokenV5SafetyResult.errors.some(err => err.includes("v5SafetyLaunchLocks")));

const brokenV5Manifest = structuredClone(demo);
brokenV5Manifest.v5PrivateBetaManifest.publicRelease = true;
const brokenV5ManifestResult = validateProject(brokenV5Manifest);
assert.equal(brokenV5ManifestResult.ok, false);
assert.ok(brokenV5ManifestResult.errors.some(err => err.includes("v5PrivateBetaManifest")));

console.log("PixelForge v5.0 Private Beta validator tests passed.");
