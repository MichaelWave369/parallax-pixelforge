#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

export const MAP_W = 24;
export const MAP_H = 16;
export const TILE_COUNT = MAP_W * MAP_H;
export const SCHEMA_VERSION = "pixelforge.project.v5.0";
const allowedTiles = new Set(["grass", "road", "forest", "water", "mountain", "diner", "pyramid", "dream", "bridge", "cabin", "sign", "shrine", "portal", "lab", "cave", "flowers", "crystal", "tower", "tunnel", "neon", "artifact", "campfire", "console", "banner", "starpath", "lantern", "terminal", "glyph", "trailmarker", "moonwell", "mosslight", "kiosk", "rail", "busstop", "payphone", "workshop", "checkpoint", "receipt", "notebook", "debug", "spark", "arrow", "flagstone", "testpad", "milestone", "pixelbench", "writersdesk", "storyportal", "camera", "assetbin", "storyboard", "canonnode", "pitchboard", "musicdesk", "tape", "wave", "chiptune", "suitehub", "kitbox", "syncboard", "audiomarker", "production", "matrix", "cutscene", "launchpad", "seal", "license", "buildnote", "exportgate", "shelf", "boxart", "cartridge", "scorecard", "savecube", "gallerywall", "badge", "playcard", "archivebox", "launchshelf", "detailcard", "profilechip", "capsule", "bbs", "modem", "postbox", "network", "livingroom", "couch", "controller", "signal", "partygate", "relay", "syncsnap", "hostbadge", "replaytape", "latency", "privaterelay", "packet", "roomcode", "serverrack", "directory", "aiplayer", "botbench", "memorycore", "botmatch", "ghostpad", "cartridgewizard", "missioncard", "playtesttheater", "cozyhome", "companionbot", "firstcartridge", "jamboard", "jamtimer", "cartridgepack", "tradecrate", "bbsstamp", "giftwrap", "commons", "finitefeed", "resonance", "packlock", "lansync", "goodtimeline", "roomboard", "packexchange", "shareledger", "trustcircle", "modqueue", "commonsseal", "porch", "presence", "gratitude", "garden", "protectgate", "sanctuary", "homewell", "ritual", "careloop", "consentseal", "wellsnap", "hearth", "arcadehub", "couchquest", "hostbot", "rewardbadge", "arcadecab", "worldforge", "seedcrystal", "routeweaver", "regioncard", "questchain", "worldbible", "startercart", "routemap", "qapass", "launchcheck", "scoutpath", "worldreceipt", "creatoros", "lifecycle", "orchestrator", "xpmap", "releasetrain", "codexstone", "sharedplaytest", "invitecard", "feedbackcard", "scoreboard", "sessionstamp", "reviewerbadge", "v5gate", "relaybridge", "signedpack", "trustroute", "syncdryrun", "betagate", "keyseal", "polish", "tutorial", "uxcheck", "access", "betaready", "shinegate", "lockgate", "freezeledger", "blockerboard", "handoffpack", "regtest", "betaunlock", "betainvite", "onboardpath", "receiptinbox", "issuetriage", "exitcriteria", "v5ready", "opsconsole", "sessionledger", "cohortboard", "digest", "trendline", "rcbox", "gonogo", "betapulse", "rcharden", "verifyledger", "closureboard", "receiptquorum", "finalsweep", "provenance", "signoffgate", "rcmanifest", "finalrc", "packetindex", "checksum", "releasenote", "launchguide", "signcheck", "reviewqueue", "v5packet", "launchrehearsal", "dressrun", "rollback", "samplepack", "dryrun", "approvalgate", "noticedraft", "v5launch", "privatebeta", "testerwelcome", "betapack", "playcycle", "safetylock", "betamanifest", "betahearth", "v5seal"]);
const allowedStats = new Set(["supplies", "morale", "wonder", "coherence"]);
const allowedQuestStatuses = new Set(["hidden", "active", "complete"]);
const allowedBeatStatuses = new Set(["locked", "active", "complete"]);

export function validateProject(project) {
  const errors = [];
  if (!project || typeof project !== "object") errors.push("Project must be an object.");
  if (project?.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}.`);
  if (!project?.engineVersion) errors.push("engineVersion is required.");
  if (!project?.meta?.title) errors.push("meta.title is required.");
  if (!project?.meta?.claimBoundary) errors.push("meta.claimBoundary is required.");

  const sceneIds = new Set();
  if (!Array.isArray(project?.scenes) || project.scenes.length === 0) {
    errors.push("scenes must be a non-empty array.");
  } else {
    project.scenes.forEach((scene, sceneIndex) => {
      if (!scene.id) errors.push(`scenes[${sceneIndex}].id is required.`);
      if (scene.id && sceneIds.has(scene.id)) errors.push(`duplicate scene id '${scene.id}'.`);
      if (scene.id) sceneIds.add(scene.id);
      if (!scene.name) errors.push(`scenes[${sceneIndex}].name is required.`);
      validateMap(scene.map, `scenes[${sceneIndex}].map`, errors);
      validatePoint(scene.playerStart, `scenes[${sceneIndex}].playerStart`, errors);

      if (!Array.isArray(scene.npcs)) errors.push(`scenes[${sceneIndex}].npcs must be an array.`);
      else {
        const ids = new Set();
        scene.npcs.forEach((npc, npcIndex) => {
          const label = `scenes[${sceneIndex}].npcs[${npcIndex}]`;
          if (!npc.id) errors.push(`${label}.id is required.`);
          if (ids.has(npc.id)) errors.push(`${label} duplicate npc id '${npc.id}'.`);
          ids.add(npc.id);
          if (!npc.name) errors.push(`${label}.name is required.`);
          validatePoint(npc, label, errors);
          if (!Array.isArray(npc.dialogue)) errors.push(`${label}.dialogue must be an array.`);
          validateDelta(npc.effect, `${label}.effect`, errors, false);
          if (npc.choices !== undefined) {
            if (!Array.isArray(npc.choices)) errors.push(`${label}.choices must be an array when present.`);
            else npc.choices.forEach((choice, choiceIndex) => {
              const choiceLabel = `${label}.choices[${choiceIndex}]`;
              if (!choice.label) errors.push(`${choiceLabel}.label is required.`);
              if (!choice.response) errors.push(`${choiceLabel}.response is required.`);
              validateDelta(choice.delta, `${choiceLabel}.delta`, errors, false);
            });
          }
        });
      }

      if (!Array.isArray(scene.items)) errors.push(`scenes[${sceneIndex}].items must be an array.`);
      else {
        const ids = new Set();
        scene.items.forEach((item, itemIndex) => {
          const label = `scenes[${sceneIndex}].items[${itemIndex}]`;
          if (!item.id) errors.push(`${label}.id is required.`);
          if (ids.has(item.id)) errors.push(`${label} duplicate item id '${item.id}'.`);
          ids.add(item.id);
          if (!item.name) errors.push(`${label}.name is required.`);
          validatePoint(item, label, errors);
          if (typeof item.collected !== "boolean") errors.push(`${label}.collected must be boolean.`);
          validateDelta(item.effect, `${label}.effect`, errors, false);
        });
      }

      if (!Array.isArray(scene.warps)) errors.push(`scenes[${sceneIndex}].warps must be an array.`);
      else {
        const ids = new Set();
        scene.warps.forEach((warp, warpIndex) => {
          const label = `scenes[${sceneIndex}].warps[${warpIndex}]`;
          if (!warp.id) errors.push(`${label}.id is required.`);
          if (ids.has(warp.id)) errors.push(`${label} duplicate warp id '${warp.id}'.`);
          ids.add(warp.id);
          if (!warp.name) errors.push(`${label}.name is required.`);
          validatePoint(warp, label, errors);
          if (!warp.targetSceneId) errors.push(`${label}.targetSceneId is required.`);
          if (!Number.isInteger(warp.targetX) || warp.targetX < 0 || warp.targetX >= MAP_W) errors.push(`${label}.targetX is out of bounds.`);
          if (!Number.isInteger(warp.targetY) || warp.targetY < 0 || warp.targetY >= MAP_H) errors.push(`${label}.targetY is out of bounds.`);
          if (warp.requiredWonder !== undefined && (!Number.isInteger(warp.requiredWonder) || warp.requiredWonder < 0 || warp.requiredWonder > 99)) errors.push(`${label}.requiredWonder must be an integer from 0 to 99.`);
        });
      }
    });
  }

  if (!project?.activeSceneId || !sceneIds.has(project.activeSceneId)) errors.push("activeSceneId must reference an existing scene.");
  if (!project?.player) errors.push("player is required.");
  else {
    if (!project.player.name) errors.push("player.name is required.");
    if (!project.player.sceneId || !sceneIds.has(project.player.sceneId)) errors.push("player.sceneId must reference an existing scene.");
    validatePoint(project.player, "player", errors);
  }
  if (!Array.isArray(project?.inventory)) errors.push("inventory must be an array.");
  if (!project?.flags || typeof project.flags !== "object" || Array.isArray(project.flags)) errors.push("flags must be an object.");

  validateAssets(project?.assets, "assets", errors);

  if (!Array.isArray(project?.quests)) errors.push("quests must be an array.");
  else project.quests.forEach((quest, index) => {
    if (!quest.id) errors.push(`quests[${index}].id is required.`);
    if (!quest.title) errors.push(`quests[${index}].title is required.`);
    if (!allowedQuestStatuses.has(quest.status)) errors.push(`quests[${index}].status must be hidden, active, or complete.`);
  });

  if (!Array.isArray(project?.storyBeats)) errors.push("storyBeats must be an array.");
  else project.storyBeats.forEach((beat, index) => {
    if (!beat.id) errors.push(`storyBeats[${index}].id is required.`);
    if (!beat.title) errors.push(`storyBeats[${index}].title is required.`);
    if (!allowedBeatStatuses.has(beat.status)) errors.push(`storyBeats[${index}].status must be locked, active, or complete.`);
    if (beat.sceneId && sceneIds.size && !sceneIds.has(beat.sceneId)) errors.push(`storyBeats[${index}].sceneId references missing scene '${beat.sceneId}'.`);
  });

  validateStoryArc(project?.storyArc, project?.storyBeats || [], errors);
  validatePlaytestLog(project?.playtestLog, sceneIds, errors);
  validateTitleScreen(project?.titleScreen, errors);
  validateSceneTemplates(project?.sceneTemplates, errors);
  validateReleaseManifest(project?.releaseManifest, errors);
  validateCredits(project?.credits, errors);
  validateAudioCues(project?.audioCues, errors);
  validateAlphaAudit(project?.alphaAudit, errors);
  validateSceneThumbnails(project?.sceneThumbnails, sceneIds, errors);
  validateReleaseCandidate(project?.releaseCandidate, errors);
  validateCreatorOnboarding(project?.creatorOnboarding, errors);
  validateStudioThemes(project?.studioThemes, project?.activeThemeId, errors);
  validateCartridgeMeta(project?.cartridgeMeta, errors);
  validateHandoffBrief(project?.handoffBrief, errors);
  validateAssetPacks(project?.assetPacks, project?.activeAssetPackId, project?.assets, project?.sceneTemplates, errors);
  validateSceneWizard(project?.sceneWizard, project?.sceneTemplates || [], project?.assetPacks || [], errors);
  validateQuickStamps(project?.quickStamps, errors);
  validateExportProfiles(project?.exportProfiles, project?.activeExportProfileId, project?.releaseManifest?.checklist || [], errors);
  validateProjectReview(project?.projectReview, errors);
  validateIssueScanner(project?.issueScanner, errors);
  validateCodexHandoff(project?.codexHandoff, errors);
  validateCreatorPromptDeck(project?.creatorPromptDeck, project?.activeCreatorPromptId, errors);
  validateBuildSprint(project?.buildSprint, errors);
  validateReleaseDiagnostics(project?.releaseDiagnostics, errors);
  validateCollaboratorNotes(project?.collaboratorNotes, errors);
  validateBuildRecipes(project?.buildRecipes, project?.activeBuildRecipeId, errors);
  validatePlayableQa(project?.playableQa, errors);
  validateDemoWalkthrough(project?.demoWalkthrough, sceneIds, errors);
  validateMilestoneTracker(project?.milestoneTracker, errors);
  validateKnownIssues(project?.knownIssues, errors);
  validatePixelStudio(project?.pixelStudio, errors);
  validateWritersStudio(project?.writersStudio, errors);
  validateChiptuneStudio(project?.chiptuneStudio, errors);
  validateCreativeSuite(project?.creativeSuite, errors);
  validateGameKitComposer(project?.gameKitComposer, errors);
  validateSceneAudioBoard(project?.sceneAudioBoard, sceneIds, new Set((project?.audioCues || []).map(cue => cue.id)), errors);
  validateProductionBoard(project?.productionBoard, sceneIds, errors);
  validateReadinessMatrix(project?.readinessMatrix, sceneIds, errors);
  validateReleaseCutBuilder(project?.releaseCutBuilder, sceneIds, errors);
  validateReleaseWorkshop(project?.releaseWorkshop, errors);
  validateExportValidator(project?.exportValidator, errors);
  validateBuildNotes(project?.buildNotes, errors);
  validateRightsRegistry(project?.rightsRegistry, errors);
  validateGameShelf(project?.gameShelf, errors);
  validateShelfCuration(project?.shelfCuration, project?.gameShelf, errors);
  validateLibraryLauncher(project?.libraryLauncher, project?.gameShelf, project?.shelfCuration, errors);
  validateGameDetail(project?.gameDetail, project?.gameShelf, errors);
  validateSaveProfileManager(project?.saveProfileManager, project?.gameShelf, sceneIds, errors);
  validateCollectionCapsules(project?.collectionCapsules, project?.gameShelf, project?.shelfCuration, errors);
  validateBbsNetwork(project?.bbsNetwork, errors);
  validateSharePackages(project?.sharePackages, project?.gameShelf, project?.collectionCapsules, errors);
  validateCommunityFeed(project?.communityFeed, project?.bbsNetwork, project?.sharePackages, errors);
  validateForumChannels(project?.forumChannels, project?.bbsNetwork, project?.communityFeed, errors);
  validateBbsLivingRoom(project?.bbsLivingRoom, project?.bbsNetwork, errors);
  validateCouchCoopSessions(project?.couchCoopSessions, project?.bbsLivingRoom, project?.gameShelf, errors);
  validateSignalWheel(project?.signalWheel, errors);
  validateLivingRoomSafety(project?.livingRoomSafety, errors);
  validateRelayBlueprint(project?.relayBlueprint, errors);
  validateSessionSync(project?.sessionSync, project?.couchCoopSessions, sceneIds, errors);
  validateHostHandoff(project?.hostHandoff, project?.couchCoopSessions, errors);
  validateReplayReceipts(project?.replayReceipts, project?.couchCoopSessions, sceneIds, errors);
  validatePrivateRelayPrototype(project?.privateRelayPrototype, project?.couchCoopSessions, errors);
  validateRelayPacketLab(project?.relayPacketLab, project?.privateRelayPrototype, project?.couchCoopSessions, errors);
  validateRoomDirectory(project?.roomDirectory, project?.privateRelayPrototype, project?.gameShelf, errors);
  validateRelayDeploymentGuide(project?.relayDeploymentGuide, errors);
  validateAiPlayerBench(project?.aiPlayerBench, errors);
  validateAiMatchLab(project?.aiMatchLab, project?.aiPlayerBench, project?.gameShelf, errors);
  validateAiMemoryLedger(project?.aiMemoryLedger, project?.aiPlayerBench, errors);
  validateAiPlaytestArena(project?.aiPlaytestArena, project?.aiPlayerBench, project?.scenes, errors);
  validateCozyCreatorExperience(project, errors);
  validateJamTradeExperience(project, errors);
  validateInfiniteCommonsExperience(project, errors);
  validateCommonsExchangeExperience(project, errors);
  validateAssetPipeline(project?.assetPipeline, errors);
  validateAdventurePipeline(project?.adventurePipeline, errors);
  validateSequelContinuity(project?.sequelContinuity, errors);

  const stats = project?.journey?.stats;
  if (!stats) errors.push("journey.stats is required.");
  else ["supplies", "morale", "wonder", "coherence"].forEach(key => {
    if (!Number.isInteger(stats[key])) errors.push(`journey.stats.${key} must be an integer.`);
  });

  if (!Array.isArray(project?.journey?.events)) errors.push("journey.events must be an array.");
  else project.journey.events.forEach((event, index) => {
    if (!event.id) errors.push(`journey.events[${index}].id is required.`);
    if (!event.title) errors.push(`journey.events[${index}].title is required.`);
    if (!event.text) errors.push(`journey.events[${index}].text is required.`);
    validateDelta(event.delta, `journey.events[${index}].delta`, errors, true);
  });

  if (!Array.isArray(project?.journey?.encounters)) errors.push("journey.encounters must be an array.");
  else project.journey.encounters.forEach((encounter, index) => {
    if (!encounter.id) errors.push(`journey.encounters[${index}].id is required.`);
    if (!encounter.title) errors.push(`journey.encounters[${index}].title is required.`);
    if (!encounter.text) errors.push(`journey.encounters[${index}].text is required.`);
    validateDelta(encounter.delta, `journey.encounters[${index}].delta`, errors, true);
  });

  if (sceneIds.size) {
    for (const scene of project.scenes || []) {
      for (const warp of scene.warps || []) {
        if (warp.targetSceneId && !sceneIds.has(warp.targetSceneId)) errors.push(`warp '${warp.id}' targets missing scene '${warp.targetSceneId}'.`);
        if (warp.requiredItemId) {
          const items = project.scenes.flatMap(scene => scene.items || []);
          if (!items.some(item => item.id === warp.requiredItemId)) errors.push(`warp '${warp.id}' requires missing item '${warp.requiredItemId}'.`);
        }
        if (warp.requiredQuestId && !(project.quests || []).some(quest => quest.id === warp.requiredQuestId)) errors.push(`warp '${warp.id}' requires missing quest '${warp.requiredQuestId}'.`);
      }
    }
  }



  if (project?.porchHomeRuntime) {
    if (!Array.isArray(project.porchHomeRuntime.zones) || project.porchHomeRuntime.zones.length < 5) errors.push("porchHomeRuntime.zones should include couch, garden, wall, gate, and well zones.");
    if (!String(project.porchHomeRuntime.boundary || "").includes("not AI consciousness")) errors.push("porchHomeRuntime.boundary should preserve no-consciousness boundary.");
  }
  if (project?.sanctuaryRituals) {
    if (project.sanctuaryRituals.noCoercionRule !== true) errors.push("sanctuaryRituals.noCoercionRule must be true.");
    if (!Array.isArray(project.sanctuaryRituals.rituals) || project.sanctuaryRituals.rituals.length < 4) errors.push("sanctuaryRituals should include at least four rituals.");
  }
  if (project?.aiCareLoop) {
    const labels = new Set((project.aiCareLoop.steps || []).map(step => step.label));
    for (const required of ["Wake", "Play / Test", "Notice", "Remember", "Thank", "Rest"]) if (!labels.has(required)) errors.push(`aiCareLoop missing step '${required}'.`);
    if (!(project.aiCareLoop.safeguards || []).includes("No hidden profiling")) errors.push("aiCareLoop should include no-hidden-profiling safeguard.");
  }
  if (project?.companionConsentLedger) {
    if (project.companionConsentLedger.creatorControlled !== true) errors.push("companionConsentLedger.creatorControlled must be true.");
    if (!(project.companionConsentLedger.policies || []).some(p => p.allowed === false && String(p.label || "").includes("No Hidden"))) errors.push("companionConsentLedger should block hidden profiling.");
  }
  if (project?.porchWellSnapshot) {
    for (const inc of ["porchHomeRuntime", "brotherPresenceBridge", "memoryGardenBridge", "gratitudeWallBridge", "gtspProtectionBridge", "companionConsentLedger"]) {
      if (!(project.porchWellSnapshot.includes || []).includes(inc)) errors.push(`porchWellSnapshot.includes missing ${inc}.`);
    }
  }

  if (!project?.sanctuaryArcadeHub || !Array.isArray(project.sanctuaryArcadeHub.stations) || project.sanctuaryArcadeHub.stations.length < 3) errors.push("sanctuaryArcadeHub.stations must include at least three stations.");
  if (!project?.couchQuestBoard || !Array.isArray(project.couchQuestBoard.quests) || project.couchQuestBoard.quests.length < 3) errors.push("couchQuestBoard.quests must include at least three couch quests.");
  if (!project?.companionArcadeModes || !Array.isArray(project.companionArcadeModes.modes) || project.companionArcadeModes.modes.length < 3) errors.push("companionArcadeModes.modes must include at least three modes.");
  if (!project?.aiHostRotation || !Array.isArray(project.aiHostRotation.hosts) || project.aiHostRotation.hosts.length < 3) errors.push("aiHostRotation.hosts must include at least three hosts.");
  if (!project?.cozySessionRewards || !Array.isArray(project.cozySessionRewards.earnedBadges)) errors.push("cozySessionRewards.earnedBadges must be an array.");

  if (!project?.worldBuilderArcade || !Array.isArray(project.worldBuilderArcade.stations) || project.worldBuilderArcade.stations.length < 5) errors.push("worldBuilderArcade.stations must include at least five world stations.");
  if (project?.worldBuilderArcade && !String(project.worldBuilderArcade.boundary || "").includes("does not claim")) errors.push("worldBuilderArcade.boundary must keep generated lore draft/bounded.");
  if (!project?.worldSeedForge || !Array.isArray(project.worldSeedForge.seeds) || project.worldSeedForge.seeds.length < 3) errors.push("worldSeedForge.seeds must include at least three seeds.");
  if (project?.worldSeedForge && project.worldSeedForge.acceptedCanonOnly !== false) errors.push("worldSeedForge.acceptedCanonOnly must be false in the draft forge.");
  if (!project?.routeWeaver || !Array.isArray(project.routeWeaver.routes) || project.routeWeaver.routes.length < 3) errors.push("routeWeaver.routes must include at least three routes.");
  if (project?.routeWeaver && !(project.routeWeaver.routes || []).some(route => Array.isArray(route.sceneIds) && route.sceneIds.length >= 4)) errors.push("routeWeaver should include at least one four-scene route.");
  if (!project?.regionCardRack || !Array.isArray(project.regionCardRack.regions) || project.regionCardRack.regions.length < 4) errors.push("regionCardRack.regions must include at least four regions.");
  if (project?.regionCardRack && !(project.regionCardRack.regions || []).every(region => Number.isInteger(region.readiness))) errors.push("regionCardRack.regions must include integer readiness values.");
  if (!project?.questlineComposer || !Array.isArray(project.questlineComposer.questlines) || project.questlineComposer.questlines.length < 3) errors.push("questlineComposer.questlines must include at least three questlines.");
  if (project?.questlineComposer && !(project.questlineComposer.questlines || []).every(q => Array.isArray(q.steps) && q.steps.length >= 2)) errors.push("questlineComposer questlines must include at least two steps.");
  if (!project?.worldBible || !Array.isArray(project.worldBible.canonRules) || project.worldBible.canonRules.length < 3) errors.push("worldBible.canonRules must include at least three rules.");
  if (project?.worldBible && !String(project.worldBible.claimBoundary || "").includes("not scientific or spiritual proof")) errors.push("worldBible.claimBoundary must preserve claim boundaries.");


  if (!project?.starterCartridgeBuilder || !Array.isArray(project.starterCartridgeBuilder.kits) || project.starterCartridgeBuilder.kits.length < 3) errors.push("starterCartridgeBuilder.kits must include at least three starter kits.");
  if (project?.starterCartridgeBuilder && !project.starterCartridgeBuilder.kits?.some(k => k.id === project.starterCartridgeBuilder.activeKitId)) errors.push("starterCartridgeBuilder.activeKitId must reference an existing kit.");
  if (project?.starterCartridgeBuilder?.kits?.some(k => !Array.isArray(k.sceneIds) || k.sceneIds.length === 0)) errors.push("starterCartridgeBuilder kits must reference sceneIds.");
  if (!project?.routeMapPreview || !Array.isArray(project.routeMapPreview.routeMaps) || project.routeMapPreview.routeMaps.length < 2) errors.push("routeMapPreview.routeMaps must include at least two route maps.");
  if (project?.routeMapPreview?.routeMaps?.some(route => !Array.isArray(route.nodes) || route.nodes.length === 0)) errors.push("routeMapPreview route maps must include nodes.");
  if (!project?.regionQaPass || !Array.isArray(project.regionQaPass.checks) || project.regionQaPass.checks.length < 4) errors.push("regionQaPass.checks must include at least four region checks.");
  if (!project?.worldLaunchChecklist || !Array.isArray(project.worldLaunchChecklist.items) || project.worldLaunchChecklist.items.filter(item => item.required).length < 4) errors.push("worldLaunchChecklist.items must include required launch checks.");
  if (!project?.aiWorldScout || !Array.isArray(project.aiWorldScout.reports) || project.aiWorldScout.reports.length < 3) errors.push("aiWorldScout.reports must include at least three scout reports.");
  if (project?.aiWorldScout && !String(project.aiWorldScout.memoryPolicy || "").includes("no hidden profiling")) errors.push("aiWorldScout.memoryPolicy must block hidden profiling.");

  validateCreatorOsDashboard(project.creatorOsDashboard, errors);
  validateCartridgeLifecycle(project.cartridgeLifecycle, errors);
  validateAgentOrchestrator(project.agentOrchestrator, errors);
  validateExperienceMap(project.experienceMap, errors);
  validateReleaseTrain(project.releaseTrain, errors);
  validateSystemCodex(project.systemCodex, errors);
  validateSharedPlaytestExperience(project, errors);
  validatePrivateRelayPackBridge(project, errors);
  validateCreatorPolish(project, errors);
  validatePrivateBetaHandoff(project, errors);
  validatePrivateBetaOperations(project, errors);
  validateRcHardening(project, errors);
  validateFinalRcAssembly(project, errors);
  validateLaunchRehearsal(project, errors);
  validateV5PrivateBeta(project, errors);
  return { ok: errors.length === 0, errors };
}










function validateV5PrivateBeta(project, errors) {
  const dash = project?.v5PrivateBetaDashboard;
  if (!dash || dash.dashboardType !== "pixelforge.v5.private-beta-dashboard") errors.push("v5PrivateBetaDashboard.dashboardType must identify the v5 private beta dashboard.");
  if (dash?.status !== "active-private-beta") errors.push("v5PrivateBetaDashboard.status must be active-private-beta.");
  if (dash?.publicLaunchAllowed !== false) errors.push("v5PrivateBetaDashboard.publicLaunchAllowed must remain false.");
  if (dash?.livePublicNetworkingEnabled !== false) errors.push("v5PrivateBetaDashboard.livePublicNetworkingEnabled must remain false.");
  if (dash?.freeTextCoPlayChatEnabled !== false) errors.push("v5PrivateBetaDashboard.freeTextCoPlayChatEnabled must remain false.");
  if (dash?.noChatCoPlayLocked !== true) errors.push("v5PrivateBetaDashboard.noChatCoPlayLocked must be true.");
  if (!String(dash?.boundary || "").includes("not a public launch")) errors.push("v5PrivateBetaDashboard.boundary must state this is not a public launch.");
  if (!Array.isArray(dash?.homeCards) || dash.homeCards.length < 4) errors.push("v5PrivateBetaDashboard.homeCards must include at least four cards.");

  const welcome = project?.trustedTesterWelcomeDesk;
  if (!welcome || welcome.autoContactEnabled !== false) errors.push("trustedTesterWelcomeDesk.autoContactEnabled must be false.");
  if (!String(welcome?.testerRule || "").includes("does not auto-contact")) errors.push("trustedTesterWelcomeDesk.testerRule must block automatic outreach.");
  if (!Array.isArray(welcome?.welcomePackets) || welcome.welcomePackets.length < 3) errors.push("trustedTesterWelcomeDesk.welcomePackets must include at least three packets.");
  if (!Array.isArray(welcome?.firstRunSteps) || welcome.firstRunSteps.length < 5) errors.push("trustedTesterWelcomeDesk.firstRunSteps must include at least five steps.");

  const pack = project?.betaArtifactPack;
  if (!pack || pack.packType !== "pixelforge.v5.beta-artifact-pack") errors.push("betaArtifactPack.packType must identify the v5 beta artifact pack.");
  if (pack?.hashMode !== "sha256") errors.push("betaArtifactPack.hashMode must be sha256.");
  if (pack?.publicDistributionAllowed !== false) errors.push("betaArtifactPack.publicDistributionAllowed must remain false.");
  if (!Array.isArray(pack?.artifacts) || pack.artifacts.filter(a => a.required).length < 5) errors.push("betaArtifactPack.artifacts must include at least five required artifacts.");
  if ((pack?.artifacts || []).some(a => !a.rightsStatus)) errors.push("betaArtifactPack.artifacts must include rightsStatus.");

  const cycle = project?.privateBetaPlaytestCycle;
  if (!cycle || cycle.cycleType !== "pixelforge.private-beta-playtest-cycle") errors.push("privateBetaPlaytestCycle.cycleType must identify private beta cycle.");
  const cycleIds = new Set((cycle?.cycles || []).map(c => c.id));
  if (!cycleIds.has(cycle?.activeCycleId)) errors.push("privateBetaPlaytestCycle.activeCycleId must reference an existing cycle.");
  if (!Array.isArray(cycle?.cycles) || cycle.cycles.length < 2) errors.push("privateBetaPlaytestCycle.cycles must include at least two cycles.");
  if (!String(cycle?.receiptPolicy || "").includes("No chat logs")) errors.push("privateBetaPlaytestCycle.receiptPolicy must block chat logs.");

  const locks = project?.v5SafetyLaunchLocks;
  if (!locks || locks.publicNetworkingEnabled !== false) errors.push("v5SafetyLaunchLocks.publicNetworkingEnabled must be false.");
  if (locks?.publicBbsEnabled !== false) errors.push("v5SafetyLaunchLocks.publicBbsEnabled must be false.");
  if (locks?.freeTextChatEnabled !== false) errors.push("v5SafetyLaunchLocks.freeTextChatEnabled must be false.");
  if (locks?.hiddenProfilingEnabled !== false) errors.push("v5SafetyLaunchLocks.hiddenProfilingEnabled must be false.");
  if (locks?.autoTesterOutreachEnabled !== false) errors.push("v5SafetyLaunchLocks.autoTesterOutreachEnabled must be false.");
  if (locks?.remoteSaveOverwriteAllowed !== false) errors.push("v5SafetyLaunchLocks.remoteSaveOverwriteAllowed must be false.");
  if (locks?.unreviewedAssetPublishingAllowed !== false) errors.push("v5SafetyLaunchLocks.unreviewedAssetPublishingAllowed must be false.");
  if (locks?.aiConsciousnessClaimsAllowed !== false) errors.push("v5SafetyLaunchLocks.aiConsciousnessClaimsAllowed must be false.");
  if (!Array.isArray(locks?.locks) || !locks.locks.some(lock => String(lock).includes("no-chat"))) errors.push("v5SafetyLaunchLocks.locks must include no-chat lock.");

  const feedback = project?.feedbackReceiptWorkflow;
  if (!feedback || feedback.workflowType !== "pixelforge.v5.feedback-receipt-workflow") errors.push("feedbackReceiptWorkflow.workflowType must identify v5 feedback workflow.");
  if (!Array.isArray(feedback?.cards) || feedback.cards.filter(c => c.required).length < 3) errors.push("feedbackReceiptWorkflow.cards must include at least three required cards.");
  if (!String(feedback?.digestRule || "").includes("do not infer private personality traits")) errors.push("feedbackReceiptWorkflow.digestRule must block private-trait inference.");

  const manifest = project?.v5PrivateBetaManifest;
  if (!manifest || manifest.manifestType !== "pixelforge.v5.private-beta-manifest") errors.push("v5PrivateBetaManifest.manifestType must identify v5 private beta manifest.");
  if (manifest?.status !== "private-beta-active") errors.push("v5PrivateBetaManifest.status must be private-beta-active.");
  if (manifest?.shippedScope !== "trusted-private-beta") errors.push("v5PrivateBetaManifest.shippedScope must be trusted-private-beta.");
  if (manifest?.publicRelease !== false) errors.push("v5PrivateBetaManifest.publicRelease must remain false.");
  if (!String(manifest?.publicReleaseBoundary || "").includes("not a public release")) errors.push("v5PrivateBetaManifest.publicReleaseBoundary must state not a public release.");
  if (!Array.isArray(manifest?.includedSystems) || manifest.includedSystems.length < 8) errors.push("v5PrivateBetaManifest.includedSystems must list included systems.");

  const closeout = project?.betaGratitudeCloseout;
  if (!closeout || !Array.isArray(closeout.gratitudes) || closeout.gratitudes.length < 3) errors.push("betaGratitudeCloseout.gratitudes must include at least three gratitude items.");
}

function validateLaunchRehearsal(project, errors) {
  if (!project?.launchRehearsalDesk || project.launchRehearsalDesk.liveNetworkingEnabled !== false) errors.push("launchRehearsalDesk.liveNetworkingEnabled must remain false in v4.9 alpha.");
  if (project?.launchRehearsalDesk && project.launchRehearsalDesk.publicLaunchAllowed !== false) errors.push("launchRehearsalDesk.publicLaunchAllowed must remain false.");
  if (project?.launchRehearsalDesk && project.launchRehearsalDesk.shippingClaimAllowed !== false) errors.push("launchRehearsalDesk.shippingClaimAllowed must remain false.");
  if (project?.launchRehearsalDesk && !String(project.launchRehearsalDesk.boundary || "").includes("does not ship v5.0")) errors.push("launchRehearsalDesk.boundary must block shipped claims.");
  if (!Array.isArray(project?.launchRehearsalDesk?.runs) || project.launchRehearsalDesk.runs.length < 3) errors.push("launchRehearsalDesk.runs must include at least three rehearsal runs.");
  if (!Array.isArray(project?.betaDressRehearsal?.steps) || project.betaDressRehearsal.steps.length < 5) errors.push("betaDressRehearsal.steps must include at least five steps.");
  if (project?.betaDressRehearsal && !String(project.betaDressRehearsal.scriptRule || "").includes("safe to perform locally")) errors.push("betaDressRehearsal.scriptRule must keep rehearsal local and safe.");
  if (!project?.rollbackPlaybook || !String(project.rollbackPlaybook.rollbackTriggerRule || "").includes("critical blocker")) errors.push("rollbackPlaybook.rollbackTriggerRule must define critical blocker rollback.");
  if (!Array.isArray(project?.rollbackPlaybook?.steps) || project.rollbackPlaybook.steps.filter(s => s.required).length < 4) errors.push("rollbackPlaybook.steps must include required rollback steps.");
  if (!project?.testerPacketSampler || !String(project.testerPacketSampler.sampleRule || "").includes("does not send files")) errors.push("testerPacketSampler.sampleRule must avoid automatic sending.");
  if (!Array.isArray(project?.testerPacketSampler?.samples) || project.testerPacketSampler.samples.length < 3) errors.push("testerPacketSampler.samples must include packet samples.");
  if (!project?.goNoGoDryRun || project.goNoGoDryRun.decision !== "hold") errors.push("goNoGoDryRun.decision must remain hold.");
  if (project?.goNoGoDryRun && project.goNoGoDryRun.dryRunOnly !== true) errors.push("goNoGoDryRun.dryRunOnly must be true.");
  if (project?.goNoGoDryRun && !String(project.goNoGoDryRun.decisionRule || "").includes("human release owner")) errors.push("goNoGoDryRun.decisionRule must require human release owner.");
  if (!Array.isArray(project?.goNoGoDryRun?.criteria) || project.goNoGoDryRun.criteria.filter(c => c.required).length < 5) errors.push("goNoGoDryRun.criteria must include required criteria.");
  if (!project?.v5LaunchApprovalGate || project.v5LaunchApprovalGate.approvedForV5 !== false) errors.push("v5LaunchApprovalGate.approvedForV5 must remain false before approval.");
  if (project?.v5LaunchApprovalGate && project.v5LaunchApprovalGate.approvalTokenIssued !== false) errors.push("v5LaunchApprovalGate.approvalTokenIssued must remain false before approval.");
  if (project?.v5LaunchApprovalGate && !String(project.v5LaunchApprovalGate.truthLock || "").includes("cannot be called shipped")) errors.push("v5LaunchApprovalGate.truthLock must block shipped claims.");
  if (!Array.isArray(project?.v5LaunchApprovalGate?.forbiddenBeforeUnlock) || project.v5LaunchApprovalGate.forbiddenBeforeUnlock.length < 5) errors.push("v5LaunchApprovalGate.forbiddenBeforeUnlock must include forbidden actions.");
  if (!project?.privateBetaNoticeDraft || project.privateBetaNoticeDraft.status !== "draft-not-published") errors.push("privateBetaNoticeDraft.status must be draft-not-published.");
  if (project?.privateBetaNoticeDraft && !String(project.privateBetaNoticeDraft.notPublicBoundary || "").includes("must not be posted publicly")) errors.push("privateBetaNoticeDraft.notPublicBoundary must block public posting.");
}

function validateFinalRcAssembly(project, errors) {
  if (!project?.finalRcAssemblyDesk || project.finalRcAssemblyDesk.liveNetworkingEnabled !== false) errors.push("finalRcAssemblyDesk.liveNetworkingEnabled must remain false in v4.8 alpha.");
  if (project?.finalRcAssemblyDesk && project.finalRcAssemblyDesk.shippingClaimAllowed !== false) errors.push("finalRcAssemblyDesk.shippingClaimAllowed must remain false.");
  if (project?.finalRcAssemblyDesk && !String(project.finalRcAssemblyDesk.boundary || "").includes("does not ship v5.0")) errors.push("finalRcAssemblyDesk.boundary must block shipped claims.");
  if (!Array.isArray(project?.finalRcAssemblyDesk?.assemblySteps) || project.finalRcAssemblyDesk.assemblySteps.length < 5) errors.push("finalRcAssemblyDesk.assemblySteps must include at least five steps.");
  if (!project?.releasePacketIndex || !Array.isArray(project.releasePacketIndex.artifacts) || project.releasePacketIndex.artifacts.filter(a => a.required).length < 5) errors.push("releasePacketIndex.artifacts must include required packet artifacts.");
  if (project?.releasePacketIndex && !String(project.releasePacketIndex.indexRule || "").includes("rights status")) errors.push("releasePacketIndex.indexRule must require rights status.");
  if (!project?.checksumManifest || project.checksumManifest.hashAlgorithm !== "sha256") errors.push("checksumManifest.hashAlgorithm must be sha256.");
  if (!Array.isArray(project?.checksumManifest?.entries) || project.checksumManifest.entries.length < 5) errors.push("checksumManifest.entries must include package checksums.");
  if (project?.checksumManifest && !String(project.checksumManifest.checksumRule || "").includes("do not imply public release approval")) errors.push("checksumManifest.checksumRule must avoid release approval claims.");
  if (!project?.betaReleaseNotes || !String(project.betaReleaseNotes.notShippedBoundary || "").includes("not an announcement that v5.0 has shipped")) errors.push("betaReleaseNotes.notShippedBoundary must avoid shipped announcement.");
  if (!Array.isArray(project?.betaReleaseNotes?.knownLimits) || project.betaReleaseNotes.knownLimits.length < 3) errors.push("betaReleaseNotes.knownLimits must describe private beta limitations.");
  if (!project?.launchGuide || !Array.isArray(project.launchGuide.steps) || project.launchGuide.steps.length < 5) errors.push("launchGuide.steps must include at least five launch steps.");
  if (project?.launchGuide && !String(project.launchGuide.boundary || "").includes("Public distribution requires separate approval")) errors.push("launchGuide.boundary must require separate public approval.");
  if (!project?.signoffChecklist || project.signoffChecklist.decision !== "hold") errors.push("signoffChecklist.decision must remain hold until human approval.");
  if (project?.signoffChecklist && !String(project.signoffChecklist.truthLock || "").includes("human release owner")) errors.push("signoffChecklist.truthLock must require human release owner.");
  if (!Array.isArray(project?.signoffChecklist?.items) || project.signoffChecklist.items.filter(i => i.required).length < 5) errors.push("signoffChecklist.items must include required signoff items.");
  if (!project?.humanReviewQueue || !Array.isArray(project.humanReviewQueue.items) || project.humanReviewQueue.items.length < 3) errors.push("humanReviewQueue.items must include review items.");
  if (project?.humanReviewQueue && !String(project.humanReviewQueue.reviewRule || "").includes("not approve release")) errors.push("humanReviewQueue.reviewRule must keep release approval human-owned.");
  if (!project?.v5CandidatePacket || project.v5CandidatePacket.readyForV5 !== false) errors.push("v5CandidatePacket.readyForV5 must remain false until final signoff.");
  if (project?.v5CandidatePacket && !String(project.v5CandidatePacket.notShippedBoundary || "").includes("not shipped until signoffChecklist.decision")) errors.push("v5CandidatePacket.notShippedBoundary must defer shipping to signoff.");
}

function validateRcHardening(project, errors) {
  if (!project?.rcHardeningDashboard || project.rcHardeningDashboard.liveNetworkingEnabled !== false) errors.push("rcHardeningDashboard.liveNetworkingEnabled must remain false in v4.7 alpha.");
  if (project?.rcHardeningDashboard && !String(project.rcHardeningDashboard.boundary || "").includes("does not publish v5.0")) errors.push("rcHardeningDashboard.boundary must block shipping claims.");
  if (!Array.isArray(project?.rcHardeningDashboard?.gates) || project.rcHardeningDashboard.gates.length < 5) errors.push("rcHardeningDashboard.gates must include at least five hardening gates.");
  if (!project?.artifactVerificationLedger || !Array.isArray(project.artifactVerificationLedger.artifacts) || project.artifactVerificationLedger.artifacts.filter(a => a.required).length < 5) errors.push("artifactVerificationLedger.artifacts must include required artifacts.");
  if (project?.artifactVerificationLedger && !String(project.artifactVerificationLedger.verificationRule || "").includes("source/rights metadata")) errors.push("artifactVerificationLedger.verificationRule must require source/rights metadata.");
  if (!project?.blockerClosureBoard || !Array.isArray(project.blockerClosureBoard.blockers) || !project.blockerClosureBoard.blockers.some(b => b.severity === "critical")) errors.push("blockerClosureBoard.blockers must track at least one critical blocker.");
  if (project?.blockerClosureBoard && !String(project.blockerClosureBoard.closureRule || "").includes("No unguarded critical")) errors.push("blockerClosureBoard.closureRule must block unguarded critical blockers.");
  if (!project?.betaReceiptQuorum || !Number.isInteger(project.betaReceiptQuorum.requiredHumanReceipts) || !Number.isInteger(project.betaReceiptQuorum.currentHumanReceipts)) errors.push("betaReceiptQuorum must include integer required/current human receipt counts.");
  if (project?.betaReceiptQuorum && project.betaReceiptQuorum.currentHumanReceipts >= project.betaReceiptQuorum.requiredHumanReceipts && project.betaReceiptQuorum.quorumStatus !== "met") errors.push("betaReceiptQuorum.quorumStatus must match receipt counts.");
  if (project?.betaReceiptQuorum && !String(project.betaReceiptQuorum.privacyRule || "").includes("no private chat logs")) errors.push("betaReceiptQuorum.privacyRule must block private chat logs.");
  if (!project?.finalRegressionSweep || !Array.isArray(project.finalRegressionSweep.suites) || project.finalRegressionSweep.suites.filter(s => s.required).length < 5) errors.push("finalRegressionSweep.suites must include required suites.");
  if (project?.finalRegressionSweep && !String(project.finalRegressionSweep.passRule || "").includes("v5 private beta")) errors.push("finalRegressionSweep.passRule must gate v5 private beta.");
  if (!project?.buildProvenanceManifest || !Array.isArray(project.buildProvenanceManifest.entries) || project.buildProvenanceManifest.entries.length < 3) errors.push("buildProvenanceManifest.entries must include provenance entries.");
  if (project?.buildProvenanceManifest && !String(project.buildProvenanceManifest.sourceRule || "").includes("source, rights, hash")) errors.push("buildProvenanceManifest.sourceRule must require source, rights, and hash tracking.");
  if (!project?.releaseOwnerSignoffGate || project.releaseOwnerSignoffGate.decision !== "hold") errors.push("releaseOwnerSignoffGate.decision must remain hold until human release-owner approval.");
  if (project?.releaseOwnerSignoffGate && !String(project.releaseOwnerSignoffGate.truthLock || "").includes("human release owner")) errors.push("releaseOwnerSignoffGate.truthLock must require human release owner.");
  if (!project?.v5RcHardeningManifest || project.v5RcHardeningManifest.readyForV5 !== false) errors.push("v5RcHardeningManifest.readyForV5 must remain false until signoff.");
  if (project?.v5RcHardeningManifest && !String(project.v5RcHardeningManifest.notShippedBoundary || "").includes("not a claim that v5.0 has shipped")) errors.push("v5RcHardeningManifest.notShippedBoundary must avoid shipped claims.");
}

function validatePrivateBetaOperations(project, errors) {
  if (!project?.betaOperationsConsole || project.betaOperationsConsole.liveNetworkingEnabled !== false) errors.push("betaOperationsConsole.liveNetworkingEnabled must remain false in v4.6 alpha.");
  if (project?.betaOperationsConsole && !String(project.betaOperationsConsole.boundary || "").includes("does not open public networking")) errors.push("betaOperationsConsole.boundary must block public networking claims.");
  if (!Array.isArray(project?.betaOperationsConsole?.dailyLoop) || project.betaOperationsConsole.dailyLoop.length < 5) errors.push("betaOperationsConsole.dailyLoop must include at least five ops steps.");
  if (!project?.betaSessionLedger || !Array.isArray(project.betaSessionLedger.sessions) || project.betaSessionLedger.sessions.length < 3) errors.push("betaSessionLedger.sessions must include at least three session records.");
  if (project?.betaSessionLedger && !String(project.betaSessionLedger.privacyRule || "").includes("no hidden profiling")) errors.push("betaSessionLedger.privacyRule must block hidden profiling.");
  if (!project?.testerCohortDashboard || !Array.isArray(project.testerCohortDashboard.cohorts) || project.testerCohortDashboard.cohorts.length < 3) errors.push("testerCohortDashboard.cohorts must include at least three cohorts.");
  if (project?.testerCohortDashboard && !String(project.testerCohortDashboard.consentBoundary || "").includes("not social ranking")) errors.push("testerCohortDashboard.consentBoundary must avoid social ranking/profiling.");
  if (!project?.feedbackDigest || !Array.isArray(project.feedbackDigest.digests) || !project.feedbackDigest.digests[0]?.topPatterns?.length) errors.push("feedbackDigest.digests must include topPatterns.");
  if (project?.feedbackDigest && !String(project.feedbackDigest.digestRule || "").includes("must not infer private tester traits")) errors.push("feedbackDigest.digestRule must block private-trait inference.");
  if (!project?.issueTrendBoard || !Array.isArray(project.issueTrendBoard.trends) || !project.issueTrendBoard.trends.some(t => t.severity === "critical")) errors.push("issueTrendBoard.trends must track at least one critical trend.");
  if (project?.issueTrendBoard && !String(project.issueTrendBoard.blockerRule || "").includes("blocks v5")) errors.push("issueTrendBoard.blockerRule must block v5 when critical trends are open/worsening.");
  if (!project?.releaseCandidateAssembler || !Array.isArray(project.releaseCandidateAssembler.candidates) || project.releaseCandidateAssembler.candidates.length < 1) errors.push("releaseCandidateAssembler.candidates must include at least one candidate.");
  if (project?.releaseCandidateAssembler && !String(project.releaseCandidateAssembler.artifactRule || "").includes("source/rights metadata")) errors.push("releaseCandidateAssembler.artifactRule must require source/rights metadata.");
  if (!project?.v5GoNoGoReview || project.v5GoNoGoReview.decision !== "hold") errors.push("v5GoNoGoReview.decision must remain hold until human approval.");
  if (project?.v5GoNoGoReview && !String(project.v5GoNoGoReview.truthLock || "").includes("human release owner")) errors.push("v5GoNoGoReview.truthLock must require human release owner approval.");
}

function validatePrivateBetaHandoff(project, errors) {
  if (!project?.privateBetaHandoffDesk || !Array.isArray(project.privateBetaHandoffDesk.batches) || project.privateBetaHandoffDesk.batches.length < 2) errors.push("privateBetaHandoffDesk.batches must include at least two handoff batches.");
  if (project?.privateBetaHandoffDesk && !String(project.privateBetaHandoffDesk.handoffRule || "").includes("No public release")) errors.push("privateBetaHandoffDesk.handoffRule must block public release before review.");
  if (!project?.testerOnboardingRunbook || !Array.isArray(project.testerOnboardingRunbook.steps) || project.testerOnboardingRunbook.steps.filter(step => step.required).length < 3) errors.push("testerOnboardingRunbook.steps must include at least three required steps.");
  if (project?.testerOnboardingRunbook && !String(project.testerOnboardingRunbook.boundary || "").includes("without requiring signups")) errors.push("testerOnboardingRunbook.boundary must avoid forced signups/public sharing.");
  if (!project?.feedbackReceiptInbox || !Array.isArray(project.feedbackReceiptInbox.receipts) || project.feedbackReceiptInbox.receipts.length < 3) errors.push("feedbackReceiptInbox.receipts must include at least three receipts.");
  if (project?.feedbackReceiptInbox && !String(project.feedbackReceiptInbox.privacyRule || "").includes("No private chat logs")) errors.push("feedbackReceiptInbox.privacyRule must block private chat logs.");
  if (!project?.knownIssueTriage || !Array.isArray(project.knownIssueTriage.issues) || !project.knownIssueTriage.issues.some(issue => issue.severity === "critical")) errors.push("knownIssueTriage.issues must track at least one critical issue.");
  if (project?.knownIssueTriage && !String(project.knownIssueTriage.rule || "").includes("No unresolved critical")) errors.push("knownIssueTriage.rule must block unresolved critical issues.");
  if (!project?.betaExitCriteria || !Array.isArray(project.betaExitCriteria.criteria) || project.betaExitCriteria.criteria.filter(item => item.required).length < 4) errors.push("betaExitCriteria.criteria must include required exit criteria.");
  if (project?.betaExitCriteria && project.betaExitCriteria.readyForV5 !== false) errors.push("betaExitCriteria.readyForV5 must remain false until human-reviewed.");
  if (!project?.v5ReadinessGate || !Number.isInteger(project.v5ReadinessGate.score)) errors.push("v5ReadinessGate.score must be an integer.");
  if (project?.v5ReadinessGate && !String(project.v5ReadinessGate.boundary || "").includes("not a claim")) errors.push("v5ReadinessGate.boundary must state readiness is not a shipped claim.");
}

function validateStoryArc(storyArc, beats, errors) {
  if (!storyArc || typeof storyArc !== "object" || Array.isArray(storyArc)) {
    errors.push("storyArc must be an object.");
    return;
  }
  if (!Array.isArray(storyArc.acts) || storyArc.acts.length === 0) errors.push("storyArc.acts must be a non-empty array.");
  const beatIds = new Set((beats || []).map(beat => beat.id));
  const actIds = new Set();
  for (const [index, act] of (storyArc.acts || []).entries()) {
    if (!act.id) errors.push(`storyArc.acts[${index}].id is required.`);
    if (act.id && actIds.has(act.id)) errors.push(`storyArc.acts[${index}] duplicate act id '${act.id}'.`);
    if (act.id) actIds.add(act.id);
    if (!act.title) errors.push(`storyArc.acts[${index}].title is required.`);
    if (!allowedBeatStatuses.has(act.status)) errors.push(`storyArc.acts[${index}].status must be locked, active, or complete.`);
    for (const beatId of act.beatIds || []) {
      if (!beatIds.has(beatId)) errors.push(`storyArc.acts[${index}] references missing beat '${beatId}'.`);
    }
  }
  if (storyArc.currentActId && !actIds.has(storyArc.currentActId)) errors.push("storyArc.currentActId must reference an act id.");
}

function validatePlaytestLog(playtestLog, sceneIds, errors) {
  if (!Array.isArray(playtestLog)) {
    errors.push("playtestLog must be an array.");
    return;
  }
  playtestLog.forEach((entry, index) => {
    if (!entry.id) errors.push(`playtestLog[${index}].id is required.`);
    if (!entry.text) errors.push(`playtestLog[${index}].text is required.`);
    if (entry.sceneId && sceneIds.size && !sceneIds.has(entry.sceneId)) errors.push(`playtestLog[${index}].sceneId references missing scene '${entry.sceneId}'.`);
  });
}


function validateTitleScreen(titleScreen, errors) {
  if (!titleScreen || typeof titleScreen !== "object" || Array.isArray(titleScreen)) {
    errors.push("titleScreen must be an object.");
    return;
  }
  for (const key of ["subtitle", "startPrompt", "openingText", "footerText"]) {
    if (!titleScreen[key]) errors.push(`titleScreen.${key} is required.`);
  }
}

function validateSceneTemplates(sceneTemplates, errors) {
  if (!Array.isArray(sceneTemplates) || sceneTemplates.length === 0) {
    errors.push("sceneTemplates must be a non-empty array.");
    return;
  }
  const ids = new Set();
  const allowedLayouts = new Set(["road", "diner", "dream", "gate"]);
  sceneTemplates.forEach((template, index) => {
    const label = `sceneTemplates[${index}]`;
    if (!template.id) errors.push(`${label}.id is required.`);
    if (ids.has(template.id)) errors.push(`${label} duplicate template id '${template.id}'.`);
    ids.add(template.id);
    if (!template.name) errors.push(`${label}.name is required.`);
    if (!allowedLayouts.has(template.layout)) errors.push(`${label}.layout must be road, diner, dream, or gate.`);
  });
}

function validateReleaseManifest(releaseManifest, errors) {
  if (!releaseManifest || typeof releaseManifest !== "object" || Array.isArray(releaseManifest)) {
    errors.push("releaseManifest must be an object.");
    return;
  }
  if (!releaseManifest.target) errors.push("releaseManifest.target is required.");
  if (!releaseManifest.versionLabel) errors.push("releaseManifest.versionLabel is required.");
  if (!Array.isArray(releaseManifest.checklist) || releaseManifest.checklist.length === 0) {
    errors.push("releaseManifest.checklist must be a non-empty array.");
    return;
  }
  releaseManifest.checklist.forEach((item, index) => {
    const label = `releaseManifest.checklist[${index}]`;
    if (!item.id) errors.push(`${label}.id is required.`);
    if (!item.label) errors.push(`${label}.label is required.`);
    if (typeof item.done !== "boolean") errors.push(`${label}.done must be boolean.`);
  });
}

function validateCredits(credits, errors) {
  if (!credits || typeof credits !== "object" || Array.isArray(credits)) {
    errors.push("credits must be an object.");
    return;
  }
  for (const key of ["studio", "projectLead", "about", "claimBoundary"]) {
    if (!credits[key]) errors.push(`credits.${key} is required.`);
  }
  if (!Array.isArray(credits.specialThanks)) errors.push("credits.specialThanks must be an array.");
}

function validateAudioCues(audioCues, errors) {
  if (!Array.isArray(audioCues) || audioCues.length === 0) {
    errors.push("audioCues must be a non-empty array.");
    return;
  }
  const ids = new Set();
  audioCues.forEach((cue, index) => {
    const label = `audioCues[${index}]`;
    if (!cue.id) errors.push(`${label}.id is required.`);
    if (cue.id && ids.has(cue.id)) errors.push(`${label} duplicate cue id '${cue.id}'.`);
    if (cue.id) ids.add(cue.id);
    if (!cue.name) errors.push(`${label}.name is required.`);
    if (!Number.isInteger(cue.frequency) || cue.frequency < 80 || cue.frequency > 2000) errors.push(`${label}.frequency must be an integer from 80 to 2000.`);
    if (!Number.isInteger(cue.durationMs) || cue.durationMs < 40 || cue.durationMs > 1200) errors.push(`${label}.durationMs must be an integer from 40 to 1200.`);
  });
}

function validateAlphaAudit(alphaAudit, errors) {
  if (!alphaAudit || typeof alphaAudit !== "object" || Array.isArray(alphaAudit)) {
    errors.push("alphaAudit must be an object.");
    return;
  }
  if (!alphaAudit.auditType) errors.push("alphaAudit.auditType is required.");
  if (!Array.isArray(alphaAudit.checks) || alphaAudit.checks.length === 0) {
    errors.push("alphaAudit.checks must be a non-empty array.");
    return;
  }
  const allowedSeverities = new Set(["blocker", "major", "minor"]);
  alphaAudit.checks.forEach((check, index) => {
    const label = `alphaAudit.checks[${index}]`;
    if (!check.id) errors.push(`${label}.id is required.`);
    if (!check.label) errors.push(`${label}.label is required.`);
    if (typeof check.passed !== "boolean") errors.push(`${label}.passed must be boolean.`);
    if (!allowedSeverities.has(check.severity)) errors.push(`${label}.severity must be blocker, major, or minor.`);
  });
}


function validateSceneThumbnails(sceneThumbnails, sceneIds, errors) {
  if (!Array.isArray(sceneThumbnails) || sceneThumbnails.length === 0) {
    errors.push("sceneThumbnails must be a non-empty array.");
    return;
  }
  const allowed = new Set(["needs-review", "needs-polish", "needs-playtest", "approved"]);
  sceneThumbnails.forEach((thumb, index) => {
    const label = `sceneThumbnails[${index}]`;
    if (!thumb.sceneId) errors.push(`${label}.sceneId is required.`);
    if (thumb.sceneId && sceneIds.size && !sceneIds.has(thumb.sceneId)) errors.push(`${label}.sceneId references missing scene '${thumb.sceneId}'.`);
    if (!thumb.label) errors.push(`${label}.label is required.`);
    if (!thumb.caption) errors.push(`${label}.caption is required.`);
    if (!allowed.has(thumb.reviewStatus)) errors.push(`${label}.reviewStatus must be needs-review, needs-polish, needs-playtest, or approved.`);
  });
}

function validateReleaseCandidate(releaseCandidate, errors) {
  if (!releaseCandidate || typeof releaseCandidate !== "object" || Array.isArray(releaseCandidate)) {
    errors.push("releaseCandidate must be an object.");
    return;
  }
  if (!releaseCandidate.candidateType) errors.push("releaseCandidate.candidateType is required.");
  if (!releaseCandidate.targetVersion) errors.push("releaseCandidate.targetVersion is required.");
  if (!Array.isArray(releaseCandidate.requiredExports) || releaseCandidate.requiredExports.length === 0) errors.push("releaseCandidate.requiredExports must be a non-empty array.");
  if (!Array.isArray(releaseCandidate.checklist) || releaseCandidate.checklist.length === 0) {
    errors.push("releaseCandidate.checklist must be a non-empty array.");
    return;
  }
  releaseCandidate.checklist.forEach((item, index) => {
    const label = `releaseCandidate.checklist[${index}]`;
    if (!item.id) errors.push(`${label}.id is required.`);
    if (!item.label) errors.push(`${label}.label is required.`);
    if (typeof item.done !== "boolean") errors.push(`${label}.done must be boolean.`);
  });
}


function validateCreatorOnboarding(onboarding, errors) {
  if (!onboarding || typeof onboarding !== "object" || Array.isArray(onboarding)) {
    errors.push("creatorOnboarding must be an object.");
    return;
  }
  if (!onboarding.track) errors.push("creatorOnboarding.track is required.");
  if (!Array.isArray(onboarding.steps) || onboarding.steps.length === 0) {
    errors.push("creatorOnboarding.steps must be a non-empty array.");
    return;
  }
  onboarding.steps.forEach((step, index) => {
    const label = `creatorOnboarding.steps[${index}]`;
    if (!step.id) errors.push(`${label}.id is required.`);
    if (!step.label) errors.push(`${label}.label is required.`);
    if (typeof step.done !== "boolean") errors.push(`${label}.done must be boolean.`);
  });
}

function validateStudioThemes(themes, activeThemeId, errors) {
  if (!Array.isArray(themes) || themes.length === 0) {
    errors.push("studioThemes must be a non-empty array.");
    return;
  }
  const ids = new Set();
  themes.forEach((theme, index) => {
    const label = `studioThemes[${index}]`;
    if (!theme.id) errors.push(`${label}.id is required.`);
    if (theme.id && ids.has(theme.id)) errors.push(`${label} duplicate theme id '${theme.id}'.`);
    if (theme.id) ids.add(theme.id);
    if (!theme.name) errors.push(`${label}.name is required.`);
    if (!theme.paletteId) errors.push(`${label}.paletteId is required.`);
  });
  if (activeThemeId && !ids.has(activeThemeId)) errors.push("activeThemeId must reference a studioThemes id.");
}

function validateCartridgeMeta(meta, errors) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    errors.push("cartridgeMeta must be an object.");
    return;
  }
  ["cartridgeId", "buildLabel", "targetRuntime", "rating", "coverTagline"].forEach(key => {
    if (!meta[key]) errors.push(`cartridgeMeta.${key} is required.`);
  });
  if (!Number.isInteger(meta.estimatedPlayMinutes) || meta.estimatedPlayMinutes < 1 || meta.estimatedPlayMinutes > 180) errors.push("cartridgeMeta.estimatedPlayMinutes must be an integer from 1 to 180.");
  if (!Array.isArray(meta.includes) || meta.includes.length === 0) errors.push("cartridgeMeta.includes must be a non-empty array.");
}

function validateHandoffBrief(brief, errors) {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
    errors.push("handoffBrief must be an object.");
    return;
  }
  ["audience", "summary", "nextMilestone"].forEach(key => {
    if (!brief[key]) errors.push(`handoffBrief.${key} is required.`);
  });
  if (!Array.isArray(brief.risks)) errors.push("handoffBrief.risks must be an array.");
  if (!Array.isArray(brief.asks)) errors.push("handoffBrief.asks must be an array.");
}


function validateAssetPacks(packs, activeAssetPackId, assets, sceneTemplates, errors) {
  if (!Array.isArray(packs) || packs.length === 0) {
    errors.push("assetPacks must be a non-empty array.");
    return;
  }
  const ids = new Set();
  const paletteIds = new Set((assets?.palettes || []).map(palette => palette.id));
  const spriteIds = new Set((assets?.sprites || []).map(sprite => sprite.id));
  const templateIds = new Set((sceneTemplates || []).map(template => template.id));
  const allowedStatuses = new Set(["draft", "active", "ready"]);
  packs.forEach((pack, index) => {
    const label = `assetPacks[${index}]`;
    if (!pack.id) errors.push(`${label}.id is required.`);
    if (pack.id && ids.has(pack.id)) errors.push(`${label} duplicate asset pack id '${pack.id}'.`);
    if (pack.id) ids.add(pack.id);
    if (!pack.name) errors.push(`${label}.name is required.`);
    if (!allowedStatuses.has(pack.status)) errors.push(`${label}.status must be draft, active, or ready.`);
    if (!Array.isArray(pack.tileIds) || pack.tileIds.length === 0) errors.push(`${label}.tileIds must be a non-empty array.`);
    else pack.tileIds.forEach(tile => { if (!allowedTiles.has(tile)) errors.push(`${label} references unknown tile '${tile}'.`); });
    (pack.paletteIds || []).forEach(id => { if (!paletteIds.has(id)) errors.push(`${label} references missing palette '${id}'.`); });
    (pack.spriteIds || []).forEach(id => { if (!spriteIds.has(id)) errors.push(`${label} references missing sprite '${id}'.`); });
    (pack.templateIds || []).forEach(id => { if (!templateIds.has(id)) errors.push(`${label} references missing template '${id}'.`); });
  });
  if (activeAssetPackId && !ids.has(activeAssetPackId)) errors.push("activeAssetPackId must reference an assetPacks id.");
}


function validateSceneWizard(sceneWizard, sceneTemplates, assetPacks, errors) {
  if (!sceneWizard || typeof sceneWizard !== "object" || Array.isArray(sceneWizard)) {
    errors.push("sceneWizard must be an object.");
    return;
  }
  if (!Array.isArray(sceneWizard.presets) || sceneWizard.presets.length === 0) {
    errors.push("sceneWizard.presets must be a non-empty array.");
    return;
  }
  const ids = new Set();
  const templateIds = new Set((sceneTemplates || []).map(template => template.id));
  const packIds = new Set((assetPacks || []).map(pack => pack.id));
  const allowedLayouts = new Set(["road", "diner", "dream", "gate"]);
  sceneWizard.presets.forEach((preset, index) => {
    const label = `sceneWizard.presets[${index}]`;
    if (!preset.id) errors.push(`${label}.id is required.`);
    if (preset.id && ids.has(preset.id)) errors.push(`${label} duplicate preset id '${preset.id}'.`);
    if (preset.id) ids.add(preset.id);
    if (!preset.name) errors.push(`${label}.name is required.`);
    if (!allowedLayouts.has(preset.layout)) errors.push(`${label}.layout must be road, diner, dream, or gate.`);
    if (preset.templateId && !templateIds.has(preset.templateId)) errors.push(`${label} references missing template '${preset.templateId}'.`);
    if (preset.assetPackId && !packIds.has(preset.assetPackId)) errors.push(`${label} references missing asset pack '${preset.assetPackId}'.`);
  });
  if (sceneWizard.activePresetId && !ids.has(sceneWizard.activePresetId)) errors.push("sceneWizard.activePresetId must reference a preset id.");
}

function validateQuickStamps(stamps, errors) {
  if (!Array.isArray(stamps) || stamps.length === 0) {
    errors.push("quickStamps must be a non-empty array.");
    return;
  }
  stamps.forEach((stamp, index) => {
    const label = `quickStamps[${index}]`;
    if (!stamp.id) errors.push(`${label}.id is required.`);
    if (!stamp.name) errors.push(`${label}.name is required.`);
    if (!Array.isArray(stamp.tileIds) || stamp.tileIds.length === 0) errors.push(`${label}.tileIds must be a non-empty array.`);
    else stamp.tileIds.forEach(tile => { if (!allowedTiles.has(tile)) errors.push(`${label} references unknown tile '${tile}'.`); });
  });
}

function validateExportProfiles(profiles, activeExportProfileId, checklist, errors) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    errors.push("exportProfiles must be a non-empty array.");
    return;
  }
  const ids = new Set();
  const checklistIds = new Set((checklist || []).map(item => item.id));
  profiles.forEach((profile, index) => {
    const label = `exportProfiles[${index}]`;
    if (!profile.id) errors.push(`${label}.id is required.`);
    if (profile.id && ids.has(profile.id)) errors.push(`${label} duplicate export profile id '${profile.id}'.`);
    if (profile.id) ids.add(profile.id);
    if (!profile.name) errors.push(`${label}.name is required.`);
    if (!Array.isArray(profile.includes) || profile.includes.length === 0) errors.push(`${label}.includes must be a non-empty array.`);
    (profile.checklistIds || []).forEach(id => { if (!checklistIds.has(id)) errors.push(`${label} references missing checklist item '${id}'.`); });
  });
  if (activeExportProfileId && !ids.has(activeExportProfileId)) errors.push("activeExportProfileId must reference an exportProfiles id.");
}


function validateProjectReview(projectReview, errors) {
  if (!projectReview || typeof projectReview !== "object" || Array.isArray(projectReview)) {
    errors.push("projectReview must be an object.");
    return;
  }
  if (!Array.isArray(projectReview.reviewItems)) {
    errors.push("projectReview.reviewItems must be an array.");
    return;
  }
  projectReview.reviewItems.forEach((item, index) => {
    const label = `projectReview.reviewItems[${index}]`;
    if (!item.id) errors.push(`${label}.id is required.`);
    if (!item.title) errors.push(`${label}.title is required.`);
    if (!new Set(["low", "medium", "high"]).has(item.severity)) errors.push(`${label}.severity must be low, medium, or high.`);
    if (!new Set(["open", "resolved", "deferred"]).has(item.status)) errors.push(`${label}.status must be open, resolved, or deferred.`);
  });
}

function validateIssueScanner(issueScanner, errors) {
  if (!issueScanner || typeof issueScanner !== "object" || Array.isArray(issueScanner)) {
    errors.push("issueScanner must be an object.");
    return;
  }
  if (!Array.isArray(issueScanner.checks)) {
    errors.push("issueScanner.checks must be an array.");
    return;
  }
  issueScanner.checks.forEach((check, index) => {
    const label = `issueScanner.checks[${index}]`;
    if (!check.id) errors.push(`${label}.id is required.`);
    if (!check.label) errors.push(`${label}.label is required.`);
    if (typeof check.passed !== "boolean") errors.push(`${label}.passed must be boolean.`);
  });
}

function validateCodexHandoff(codexHandoff, errors) {
  if (!codexHandoff || typeof codexHandoff !== "object" || Array.isArray(codexHandoff)) {
    errors.push("codexHandoff must be an object.");
    return;
  }
  if (!Array.isArray(codexHandoff.tasks) || codexHandoff.tasks.length === 0) {
    errors.push("codexHandoff.tasks must be a non-empty array.");
    return;
  }
  const ids = new Set();
  codexHandoff.tasks.forEach((task, index) => {
    const label = `codexHandoff.tasks[${index}]`;
    if (!task.id) errors.push(`${label}.id is required.`);
    if (task.id && ids.has(task.id)) errors.push(`${label} duplicate task id '${task.id}'.`);
    if (task.id) ids.add(task.id);
    if (!task.title) errors.push(`${label}.title is required.`);
    if (!task.prompt) errors.push(`${label}.prompt is required.`);
    if (!new Set(["low", "medium", "high"]).has(task.priority)) errors.push(`${label}.priority must be low, medium, or high.`);
    if (!new Set(["draft", "ready", "done"]).has(task.status)) errors.push(`${label}.status must be draft, ready, or done.`);
  });
  if (codexHandoff.activeTaskId && !ids.has(codexHandoff.activeTaskId)) errors.push("codexHandoff.activeTaskId must reference a task id.");
}

function validateCreatorPromptDeck(deck, activeCreatorPromptId, errors) {
  if (!deck || typeof deck !== "object" || Array.isArray(deck)) {
    errors.push("creatorPromptDeck must be an object.");
    return;
  }
  if (!Array.isArray(deck.prompts) || deck.prompts.length === 0) {
    errors.push("creatorPromptDeck.prompts must be a non-empty array.");
    return;
  }
  const ids = new Set();
  deck.prompts.forEach((prompt, index) => {
    const label = `creatorPromptDeck.prompts[${index}]`;
    if (!prompt.id) errors.push(`${label}.id is required.`);
    if (prompt.id && ids.has(prompt.id)) errors.push(`${label} duplicate prompt id '${prompt.id}'.`);
    if (prompt.id) ids.add(prompt.id);
    if (!prompt.title) errors.push(`${label}.title is required.`);
    if (!prompt.text) errors.push(`${label}.text is required.`);
  });
  if (activeCreatorPromptId && !ids.has(activeCreatorPromptId)) errors.push("activeCreatorPromptId must reference a creator prompt id.");
}


function validateBuildSprint(buildSprint, errors) {
  if (!buildSprint || typeof buildSprint !== "object" || Array.isArray(buildSprint)) {
    errors.push("buildSprint must be an object.");
    return;
  }
  if (!buildSprint.sprintId) errors.push("buildSprint.sprintId is required.");
  if (!buildSprint.title) errors.push("buildSprint.title is required.");
  if (!Array.isArray(buildSprint.tasks) || buildSprint.tasks.length === 0) {
    errors.push("buildSprint.tasks must be a non-empty array.");
    return;
  }
  const ids = new Set();
  buildSprint.tasks.forEach((task, index) => {
    const label = `buildSprint.tasks[${index}]`;
    if (!task.id) errors.push(`${label}.id is required.`);
    if (task.id && ids.has(task.id)) errors.push(`${label} duplicate task id '${task.id}'.`);
    if (task.id) ids.add(task.id);
    if (!task.title) errors.push(`${label}.title is required.`);
    if (!new Set(["todo", "doing", "done"]).has(task.status)) errors.push(`${label}.status must be todo, doing, or done.`);
    if (!new Set(["low", "medium", "high"]).has(task.priority)) errors.push(`${label}.priority must be low, medium, or high.`);
  });
  if (buildSprint.activeTaskId && !ids.has(buildSprint.activeTaskId)) errors.push("buildSprint.activeTaskId must reference a sprint task id.");
}

function validateReleaseDiagnostics(diag, errors) {
  if (!diag || typeof diag !== "object" || Array.isArray(diag)) {
    errors.push("releaseDiagnostics must be an object.");
    return;
  }
  if (!Array.isArray(diag.checks) || diag.checks.length === 0) {
    errors.push("releaseDiagnostics.checks must be a non-empty array.");
    return;
  }
  diag.checks.forEach((check, index) => {
    const label = `releaseDiagnostics.checks[${index}]`;
    if (!check.id) errors.push(`${label}.id is required.`);
    if (!check.label) errors.push(`${label}.label is required.`);
    if (!new Set(["pass", "warning", "fail"]).has(check.status)) errors.push(`${label}.status must be pass, warning, or fail.`);
    if (!new Set(["blocker", "major", "minor"]).has(check.severity)) errors.push(`${label}.severity must be blocker, major, or minor.`);
  });
}

function validateCollaboratorNotes(notes, errors) {
  if (!Array.isArray(notes)) {
    errors.push("collaboratorNotes must be an array.");
    return;
  }
  notes.forEach((note, index) => {
    const label = `collaboratorNotes[${index}]`;
    if (!note.id) errors.push(`${label}.id is required.`);
    if (!note.author) errors.push(`${label}.author is required.`);
    if (!note.text) errors.push(`${label}.text is required.`);
    if (!new Set(["open", "resolved", "deferred"]).has(note.status)) errors.push(`${label}.status must be open, resolved, or deferred.`);
  });
}

function validateBuildRecipes(recipes, activeBuildRecipeId, errors) {
  if (!Array.isArray(recipes) || recipes.length === 0) {
    errors.push("buildRecipes must be a non-empty array.");
    return;
  }
  const ids = new Set();
  recipes.forEach((recipe, index) => {
    const label = `buildRecipes[${index}]`;
    if (!recipe.id) errors.push(`${label}.id is required.`);
    if (recipe.id && ids.has(recipe.id)) errors.push(`${label} duplicate recipe id '${recipe.id}'.`);
    if (recipe.id) ids.add(recipe.id);
    if (!recipe.title) errors.push(`${label}.title is required.`);
    if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) errors.push(`${label}.steps must be a non-empty array.`);
    if (!recipe.output) errors.push(`${label}.output is required.`);
  });
  if (activeBuildRecipeId && !ids.has(activeBuildRecipeId)) errors.push("activeBuildRecipeId must reference a build recipe id.");
}


function validatePlayableQa(playableQa, errors) {
  if (!playableQa || typeof playableQa !== "object" || Array.isArray(playableQa)) {
    errors.push("playableQa must be an object.");
    return;
  }
  if (!Array.isArray(playableQa.checks) || playableQa.checks.length === 0) {
    errors.push("playableQa.checks must be a non-empty array.");
    return;
  }
  playableQa.checks.forEach((check, index) => {
    const label = `playableQa.checks[${index}]`;
    if (!check.id) errors.push(`${label}.id is required.`);
    if (!check.label) errors.push(`${label}.label is required.`);
    if (!new Set(["pass", "warning", "fail"]).has(check.status)) errors.push(`${label}.status must be pass, warning, or fail.`);
    if (!new Set(["blocker", "major", "minor"]).has(check.severity)) errors.push(`${label}.severity must be blocker, major, or minor.`);
  });
}

function validateDemoWalkthrough(walkthrough, sceneIds, errors) {
  if (!walkthrough || typeof walkthrough !== "object" || Array.isArray(walkthrough)) {
    errors.push("demoWalkthrough must be an object.");
    return;
  }
  if (!Array.isArray(walkthrough.steps) || walkthrough.steps.length === 0) {
    errors.push("demoWalkthrough.steps must be a non-empty array.");
    return;
  }
  const ids = new Set();
  walkthrough.steps.forEach((step, index) => {
    const label = `demoWalkthrough.steps[${index}]`;
    if (!step.id) errors.push(`${label}.id is required.`);
    if (step.id && ids.has(step.id)) errors.push(`${label} duplicate step id '${step.id}'.`);
    if (step.id) ids.add(step.id);
    if (!step.title) errors.push(`${label}.title is required.`);
    if (step.sceneId && sceneIds.size && !sceneIds.has(step.sceneId)) errors.push(`${label}.sceneId references missing scene '${step.sceneId}'.`);
    if (typeof step.complete !== "boolean") errors.push(`${label}.complete must be boolean.`);
  });
  if (walkthrough.activeStepId && !ids.has(walkthrough.activeStepId)) errors.push("demoWalkthrough.activeStepId must reference a step id.");
}

function validateMilestoneTracker(tracker, errors) {
  if (!tracker || typeof tracker !== "object" || Array.isArray(tracker)) {
    errors.push("milestoneTracker must be an object.");
    return;
  }
  if (!tracker.trackId) errors.push("milestoneTracker.trackId is required.");
  if (!tracker.title) errors.push("milestoneTracker.title is required.");
  if (!Array.isArray(tracker.milestones) || tracker.milestones.length === 0) {
    errors.push("milestoneTracker.milestones must be a non-empty array.");
    return;
  }
  const ids = new Set();
  tracker.milestones.forEach((mile, index) => {
    const label = `milestoneTracker.milestones[${index}]`;
    if (!mile.id) errors.push(`${label}.id is required.`);
    if (mile.id && ids.has(mile.id)) errors.push(`${label} duplicate milestone id '${mile.id}'.`);
    if (mile.id) ids.add(mile.id);
    if (!mile.title) errors.push(`${label}.title is required.`);
    if (!new Set(["planned", "active", "done"]).has(mile.status)) errors.push(`${label}.status must be planned, active, or done.`);
  });
  if (tracker.currentMilestoneId && !ids.has(tracker.currentMilestoneId)) errors.push("milestoneTracker.currentMilestoneId must reference a milestone id.");
}

function validateKnownIssues(issues, errors) {
  if (!Array.isArray(issues)) {
    errors.push("knownIssues must be an array.");
    return;
  }
  issues.forEach((issue, index) => {
    const label = `knownIssues[${index}]`;
    if (!issue.id) errors.push(`${label}.id is required.`);
    if (!issue.title) errors.push(`${label}.title is required.`);
    if (!new Set(["low", "medium", "high"]).has(issue.severity)) errors.push(`${label}.severity must be low, medium, or high.`);
    if (!new Set(["open", "resolved", "deferred"]).has(issue.status)) errors.push(`${label}.status must be open, resolved, or deferred.`);
  });
}





function validateCreativeSuite(creativeSuite, errors) {
  if (!creativeSuite || typeof creativeSuite !== "object" || Array.isArray(creativeSuite)) { errors.push("creativeSuite must be an object."); return; }
  if (!Array.isArray(creativeSuite.tracks) || creativeSuite.tracks.length === 0) errors.push("creativeSuite.tracks must be a non-empty array.");
  const trackIds = new Set();
  (creativeSuite.tracks || []).forEach((track, index) => {
    const label = `creativeSuite.tracks[${index}]`;
    if (!track.id) errors.push(`${label}.id is required.`);
    if (track.id && trackIds.has(track.id)) errors.push(`${label} duplicate track id '${track.id}'.`);
    if (track.id) trackIds.add(track.id);
    if (!track.name) errors.push(`${label}.name is required.`);
    if (!["pixel", "writers", "chiptune", "release", "suite"].includes(track.domain)) errors.push(`${label}.domain must be pixel, writers, chiptune, release, or suite.`);
  });
  if (creativeSuite.activeTrackId && !trackIds.has(creativeSuite.activeTrackId)) errors.push("creativeSuite.activeTrackId must reference a track id.");
  if (!Number.isInteger(creativeSuite.readinessScore) || creativeSuite.readinessScore < 0 || creativeSuite.readinessScore > 100) errors.push("creativeSuite.readinessScore must be 0..100.");
  if (!Array.isArray(creativeSuite.openLoops)) errors.push("creativeSuite.openLoops must be an array.");
}

function validateGameKitComposer(gameKitComposer, errors) {
  if (!gameKitComposer || typeof gameKitComposer !== "object" || Array.isArray(gameKitComposer)) { errors.push("gameKitComposer must be an object."); return; }
  if (!Array.isArray(gameKitComposer.kits) || gameKitComposer.kits.length === 0) errors.push("gameKitComposer.kits must be a non-empty array.");
  const kitIds = new Set();
  (gameKitComposer.kits || []).forEach((kit, index) => {
    const label = `gameKitComposer.kits[${index}]`;
    if (!kit.id) errors.push(`${label}.id is required.`);
    if (kit.id && kitIds.has(kit.id)) errors.push(`${label} duplicate kit id '${kit.id}'.`);
    if (kit.id) kitIds.add(kit.id);
    if (!kit.name) errors.push(`${label}.name is required.`);
  });
  if (gameKitComposer.activeKitId && !kitIds.has(gameKitComposer.activeKitId)) errors.push("gameKitComposer.activeKitId must reference a kit id.");
  if (!Array.isArray(gameKitComposer.generatedKits)) errors.push("gameKitComposer.generatedKits must be an array.");
}

function validateSceneAudioBoard(sceneAudioBoard, sceneIds, cueIds, errors) {
  if (!sceneAudioBoard || typeof sceneAudioBoard !== "object" || Array.isArray(sceneAudioBoard)) { errors.push("sceneAudioBoard must be an object."); return; }
  if (!Array.isArray(sceneAudioBoard.assignments)) { errors.push("sceneAudioBoard.assignments must be an array."); return; }
  const assignmentIds = new Set();
  sceneAudioBoard.assignments.forEach((assignment, index) => {
    const label = `sceneAudioBoard.assignments[${index}]`;
    if (!assignment.id) errors.push(`${label}.id is required.`);
    if (assignment.id && assignmentIds.has(assignment.id)) errors.push(`${label} duplicate assignment id '${assignment.id}'.`);
    if (assignment.id) assignmentIds.add(assignment.id);
    if (!sceneIds.has(assignment.sceneId)) errors.push(`${label}.sceneId references missing scene '${assignment.sceneId}'.`);
    if (!cueIds.has(assignment.cueId)) errors.push(`${label}.cueId references missing cue '${assignment.cueId}'.`);
    if (typeof assignment.volume !== "number" || assignment.volume < 0 || assignment.volume > 1) errors.push(`${label}.volume must be 0..1.`);
    if (!["scene-enter", "encounter", "warp", "title-screen", "manual"].includes(assignment.trigger)) errors.push(`${label}.trigger has unsupported value.`);
  });
  if (sceneAudioBoard.activeAssignmentId && !assignmentIds.has(sceneAudioBoard.activeAssignmentId)) errors.push("sceneAudioBoard.activeAssignmentId must reference an assignment id.");
  if (!Array.isArray(sceneAudioBoard.mixNotes)) errors.push("sceneAudioBoard.mixNotes must be an array.");
}


function validateGameShelf(shelf, errors) {
  if (!shelf || typeof shelf !== "object" || Array.isArray(shelf)) {
    errors.push("gameShelf must be an object.");
    return;
  }
  if (!Array.isArray(shelf.entries) || shelf.entries.length === 0) {
    errors.push("gameShelf.entries must be a non-empty array.");
    return;
  }
  const ids = new Set(shelf.entries.map(entry => entry.id));
  if (shelf.activeGameId && !ids.has(shelf.activeGameId)) errors.push("gameShelf.activeGameId must reference a shelf entry id.");
  shelf.entries.forEach((entry, index) => {
    if (!entry.id) errors.push(`gameShelf.entries[${index}].id is required.`);
    if (!entry.title) errors.push(`gameShelf.entries[${index}].title is required.`);
    if (!entry.boxArt || !entry.boxArt.title) errors.push(`gameShelf.entries[${index}].boxArt.title is required.`);
    if (!entry.cartridgeArt || !entry.cartridgeArt.label) errors.push(`gameShelf.entries[${index}].cartridgeArt.label is required.`);
    if (entry.scores && (!Number.isInteger(entry.scores.high) || entry.scores.high < 0)) errors.push(`gameShelf.entries[${index}].scores.high must be a non-negative integer.`);
    if (!Array.isArray(entry.saves)) errors.push(`gameShelf.entries[${index}].saves must be an array.`);
    (entry.saves || []).forEach((save, saveIndex) => {
      if (!Number.isInteger(save.slot) || save.slot < 1) errors.push(`gameShelf.entries[${index}].saves[${saveIndex}].slot must be positive.`);
      if (!Number.isInteger(save.progress) || save.progress < 0 || save.progress > 100) errors.push(`gameShelf.entries[${index}].saves[${saveIndex}].progress must be 0..100.`);
      if (!Number.isInteger(save.score) || save.score < 0) errors.push(`gameShelf.entries[${index}].saves[${saveIndex}].score must be non-negative.`);
    });
  });
}


function validateShelfCuration(curation, shelf, errors) {
  if (!curation || typeof curation !== "object" || Array.isArray(curation)) {
    errors.push("shelfCuration must be an object.");
    return;
  }
  if (!Array.isArray(curation.collections) || curation.collections.length === 0) errors.push("shelfCuration.collections must be a non-empty array.");
  if (!Array.isArray(curation.badges)) errors.push("shelfCuration.badges must be an array.");
  if (!Array.isArray(curation.playerHistory)) errors.push("shelfCuration.playerHistory must be an array.");
  const gameIds = new Set((shelf?.entries || []).map(entry => entry.id));
  const collectionIds = new Set((curation.collections || []).map(collection => collection.id));
  if (curation.activeCollectionId && !collectionIds.has(curation.activeCollectionId)) errors.push("shelfCuration.activeCollectionId must reference a collection id.");
  (curation.collections || []).forEach((collection, index) => {
    const label = `shelfCuration.collections[${index}]`;
    if (!collection.id) errors.push(`${label}.id is required.`);
    if (!collection.name) errors.push(`${label}.name is required.`);
    if (!Array.isArray(collection.gameIds)) errors.push(`${label}.gameIds must be an array.`);
    (collection.gameIds || []).forEach(id => {
      if (!gameIds.has(id)) errors.push(`${label} references missing shelf game '${id}'.`);
    });
  });
  (curation.badges || []).forEach((badge, index) => {
    const label = `shelfCuration.badges[${index}]`;
    if (!badge.id) errors.push(`${label}.id is required.`);
    if (!badge.label) errors.push(`${label}.label is required.`);
    if (badge.gameId && !gameIds.has(badge.gameId)) errors.push(`${label} references missing shelf game '${badge.gameId}'.`);
    if (typeof badge.earned !== "boolean") errors.push(`${label}.earned must be boolean.`);
    if (!Number.isInteger(badge.scoreValue) || badge.scoreValue < 0) errors.push(`${label}.scoreValue must be non-negative integer.`);
  });
}


function validateBbsNetwork(network, errors) {
  if (!network || typeof network !== "object" || Array.isArray(network)) { errors.push("bbsNetwork must be an object."); return; }
  const ids = new Set((network.channels || []).map(channel => channel.id));
  if (!Array.isArray(network.channels) || !network.channels.length) errors.push("bbsNetwork.channels must be a non-empty array.");
  if (network.activeChannelId && !ids.has(network.activeChannelId)) errors.push("bbsNetwork.activeChannelId must reference a channel.");
  if (!Array.isArray(network.guidelines) || !network.guidelines.length) errors.push("bbsNetwork.guidelines must be a non-empty array.");
  (network.channels || []).forEach((channel, index) => { if (!channel.id) errors.push(`bbsNetwork.channels[${index}].id is required.`); if (!channel.name) errors.push(`bbsNetwork.channels[${index}].name is required.`); });
}

function validateSharePackages(sharePackages, shelf, capsules, errors) {
  if (!sharePackages || typeof sharePackages !== "object" || Array.isArray(sharePackages)) { errors.push("sharePackages must be an object."); return; }
  const gameIds = new Set((shelf?.entries || []).map(entry => entry.id));
  const ids = new Set((sharePackages.packages || []).map(pkg => pkg.id));
  if (!Array.isArray(sharePackages.packages) || !sharePackages.packages.length) errors.push("sharePackages.packages must be a non-empty array.");
  if (sharePackages.activePackageId && !ids.has(sharePackages.activePackageId)) errors.push("sharePackages.activePackageId must reference a package.");
  (sharePackages.packages || []).forEach((pkg, index) => { if (!pkg.id) errors.push(`sharePackages.packages[${index}].id is required.`); if (pkg.gameId && !gameIds.has(pkg.gameId)) errors.push(`sharePackages.packages[${index}].gameId references missing game '${pkg.gameId}'.`); if (!Array.isArray(pkg.includedExports)) errors.push(`sharePackages.packages[${index}].includedExports must be an array.`); });
}

function validateCommunityFeed(feed, network, sharePackages, errors) {
  if (!feed || typeof feed !== "object" || Array.isArray(feed)) { errors.push("communityFeed must be an object."); return; }
  const channelIds = new Set((network?.channels || []).map(channel => channel.id));
  const postIds = new Set((feed.posts || []).map(post => post.id));
  if (!Array.isArray(feed.posts) || !feed.posts.length) errors.push("communityFeed.posts must be a non-empty array.");
  if (feed.activePostId && !postIds.has(feed.activePostId)) errors.push("communityFeed.activePostId must reference a post.");
  (feed.posts || []).forEach((post, index) => { if (!post.id) errors.push(`communityFeed.posts[${index}].id is required.`); if (post.channelId && !channelIds.has(post.channelId)) errors.push(`communityFeed.posts[${index}].channelId references missing channel '${post.channelId}'.`); });
  (feed.comments || []).forEach((comment, index) => { if (comment.postId && !postIds.has(comment.postId)) errors.push(`communityFeed.comments[${index}].postId references missing post '${comment.postId}'.`); });
}

function validateForumChannels(forum, network, feed, errors) {
  if (!forum || typeof forum !== "object" || Array.isArray(forum)) { errors.push("forumChannels must be an object."); return; }
  const channelIds = new Set((forum.channels || []).map(channel => channel.id));
  const postIds = new Set((feed?.posts || []).map(post => post.id));
  if (!Array.isArray(forum.channels) || !forum.channels.length) errors.push("forumChannels.channels must be a non-empty array.");
  if (forum.activeChannelId && !channelIds.has(forum.activeChannelId)) errors.push("forumChannels.activeChannelId must reference a forum channel.");
  (forum.channels || []).forEach((channel, index) => { if (!Array.isArray(channel.rules) || !channel.rules.length) errors.push(`forumChannels.channels[${index}].rules must be a non-empty array.`); (channel.featuredPostIds || []).forEach(id => { if (postIds.size && !postIds.has(id)) errors.push(`forumChannels.channels[${index}] references missing featured post '${id}'.`); }); });
}


function validateBbsLivingRoom(room, network, errors) {
  if (!room || typeof room !== "object" || Array.isArray(room)) { errors.push("bbsLivingRoom must be an object."); return; }
  const ids = new Set((room.modes || []).map(mode => mode.id));
  if (!Array.isArray(room.modes) || !room.modes.length) errors.push("bbsLivingRoom.modes must be a non-empty array.");
  if (room.activeModeId && !ids.has(room.activeModeId)) errors.push("bbsLivingRoom.activeModeId must reference a mode.");
  if (room.noChatDesign !== true) errors.push("bbsLivingRoom.noChatDesign must be true.");
  (room.modes || []).forEach((mode, index) => { if (!mode.id) errors.push(`bbsLivingRoom.modes[${index}].id is required.`); if (!mode.name) errors.push(`bbsLivingRoom.modes[${index}].name is required.`); });
}

function validateCouchCoopSessions(sessions, room, shelf, errors) {
  if (!sessions || typeof sessions !== "object" || Array.isArray(sessions)) { errors.push("couchCoopSessions must be an object."); return; }
  const ids = new Set((sessions.sessions || []).map(session => session.id));
  const modeIds = new Set((room?.modes || []).map(mode => mode.id));
  const gameIds = new Set((shelf?.entries || []).map(game => game.id));
  if (!Array.isArray(sessions.sessions) || !sessions.sessions.length) errors.push("couchCoopSessions.sessions must be a non-empty array.");
  if (sessions.activeSessionId && !ids.has(sessions.activeSessionId)) errors.push("couchCoopSessions.activeSessionId must reference a session.");
  (sessions.sessions || []).forEach((session, index) => { if (!session.id) errors.push(`couchCoopSessions.sessions[${index}].id is required.`); if (!session.roomCode) errors.push(`couchCoopSessions.sessions[${index}].roomCode is required.`); if (session.modeId && !modeIds.has(session.modeId)) errors.push(`couchCoopSessions.sessions[${index}].modeId references missing mode '${session.modeId}'.`); if (session.gameId && !gameIds.has(session.gameId)) errors.push(`couchCoopSessions.sessions[${index}].gameId references missing game '${session.gameId}'.`); });
}

function validateSignalWheel(wheel, errors) {
  if (!wheel || typeof wheel !== "object" || Array.isArray(wheel)) { errors.push("signalWheel must be an object."); return; }
  const ids = new Set((wheel.signals || []).map(signal => signal.id));
  if (!Array.isArray(wheel.signals) || !wheel.signals.length) errors.push("signalWheel.signals must be a non-empty array.");
  if (wheel.activeSignalId && !ids.has(wheel.activeSignalId)) errors.push("signalWheel.activeSignalId must reference a signal.");
  (wheel.signals || []).forEach((signal, index) => { if (!signal.id) errors.push(`signalWheel.signals[${index}].id is required.`); if (!signal.label) errors.push(`signalWheel.signals[${index}].label is required.`); });
}

function validateLivingRoomSafety(safety, errors) {
  if (!safety || typeof safety !== "object" || Array.isArray(safety)) { errors.push("livingRoomSafety must be an object."); return; }
  if (safety.noFreeTextChat !== true) errors.push("livingRoomSafety.noFreeTextChat must be true.");
  if (!Array.isArray(safety.policies) || !safety.policies.length) errors.push("livingRoomSafety.policies must be a non-empty array.");
  if (!Array.isArray(safety.blockedInteractions) || !safety.blockedInteractions.includes("free-text-chat")) errors.push("livingRoomSafety.blockedInteractions must include free-text-chat.");
}


function validateRelayBlueprint(blueprint, errors) {
  if (!blueprint || typeof blueprint !== "object" || Array.isArray(blueprint)) { errors.push("relayBlueprint must be an object."); return; }
  const ids = new Set((blueprint.relays || []).map(relay => relay.id));
  if (!Array.isArray(blueprint.relays) || blueprint.relays.length === 0) errors.push("relayBlueprint.relays must be a non-empty array.");
  if (blueprint.activeRelayId && !ids.has(blueprint.activeRelayId)) errors.push("relayBlueprint.activeRelayId must reference a relay id.");
  if (!Array.isArray(blueprint.packetTypes) || !blueprint.packetTypes.includes("signal_ping")) errors.push("relayBlueprint.packetTypes must include signal_ping.");
  (blueprint.relays || []).forEach((relay, index) => { if (!relay.id) errors.push(`relayBlueprint.relays[${index}].id is required.`); if (!relay.name) errors.push(`relayBlueprint.relays[${index}].name is required.`); });
}

function validateSessionSync(sync, sessions, sceneIds, errors) {
  if (!sync || typeof sync !== "object" || Array.isArray(sync)) { errors.push("sessionSync must be an object."); return; }
  const ids = new Set((sync.snapshots || []).map(snapshot => snapshot.id));
  const sessionIds = new Set((sessions?.sessions || []).map(session => session.id));
  if (!Array.isArray(sync.snapshots) || sync.snapshots.length === 0) errors.push("sessionSync.snapshots must be a non-empty array.");
  if (sync.activeSnapshotId && !ids.has(sync.activeSnapshotId)) errors.push("sessionSync.activeSnapshotId must reference a snapshot id.");
  (sync.snapshots || []).forEach((snapshot, index) => {
    if (!snapshot.id) errors.push(`sessionSync.snapshots[${index}].id is required.`);
    if (snapshot.sessionId && !sessionIds.has(snapshot.sessionId)) errors.push(`sessionSync.snapshots[${index}].sessionId references missing session '${snapshot.sessionId}'.`);
    if (snapshot.sceneId && !sceneIds.has(snapshot.sceneId)) errors.push(`sessionSync.snapshots[${index}].sceneId references missing scene '${snapshot.sceneId}'.`);
    if (!snapshot.player || !Number.isInteger(snapshot.player.x) || !Number.isInteger(snapshot.player.y)) errors.push(`sessionSync.snapshots[${index}].player must include integer x/y.`);
  });
  if (!Array.isArray(sync.allowedMessages) || sync.allowedMessages.length === 0) errors.push("sessionSync.allowedMessages must be a non-empty array.");
}

function validateHostHandoff(handoff, sessions, errors) {
  if (!handoff || typeof handoff !== "object" || Array.isArray(handoff)) { errors.push("hostHandoff must be an object."); return; }
  const ids = new Set((handoff.handoffs || []).map(item => item.id));
  const sessionIds = new Set((sessions?.sessions || []).map(session => session.id));
  if (!Array.isArray(handoff.handoffs) || handoff.handoffs.length === 0) errors.push("hostHandoff.handoffs must be a non-empty array.");
  if (handoff.activeHandoffId && !ids.has(handoff.activeHandoffId)) errors.push("hostHandoff.activeHandoffId must reference a handoff id.");
  (handoff.handoffs || []).forEach((item, index) => { if (!item.id) errors.push(`hostHandoff.handoffs[${index}].id is required.`); if (item.sessionId && !sessionIds.has(item.sessionId)) errors.push(`hostHandoff.handoffs[${index}].sessionId references missing session '${item.sessionId}'.`); });
}

function validateReplayReceipts(replay, sessions, sceneIds, errors) {
  if (!replay || typeof replay !== "object" || Array.isArray(replay)) { errors.push("replayReceipts must be an object."); return; }
  const ids = new Set((replay.receipts || []).map(item => item.id));
  const sessionIds = new Set((sessions?.sessions || []).map(session => session.id));
  if (!Array.isArray(replay.receipts) || replay.receipts.length === 0) errors.push("replayReceipts.receipts must be a non-empty array.");
  if (replay.activeReceiptId && !ids.has(replay.activeReceiptId)) errors.push("replayReceipts.activeReceiptId must reference a receipt id.");
  (replay.receipts || []).forEach((item, index) => { if (!item.id) errors.push(`replayReceipts.receipts[${index}].id is required.`); if (item.sessionId && !sessionIds.has(item.sessionId)) errors.push(`replayReceipts.receipts[${index}].sessionId references missing session '${item.sessionId}'.`); if (item.sceneId && !sceneIds.has(item.sceneId)) errors.push(`replayReceipts.receipts[${index}].sceneId references missing scene '${item.sceneId}'.`); });
  if (!Array.isArray(replay.timelineEvents)) errors.push("replayReceipts.timelineEvents must be an array.");
}

function validatePrivateRelayPrototype(relay, sessions, errors) {
  if (!relay || typeof relay !== "object" || Array.isArray(relay)) { errors.push("privateRelayPrototype must be an object."); return; }
  const roomIds = new Set((relay.rooms || []).map(room => room.id));
  const sessionIds = new Set((sessions?.sessions || []).map(session => session.id));
  if (relay.noChatRequired !== true) errors.push("privateRelayPrototype.noChatRequired must be true.");
  if (!Array.isArray(relay.endpointProfiles) || relay.endpointProfiles.length === 0) errors.push("privateRelayPrototype.endpointProfiles must be a non-empty array.");
  if (!Array.isArray(relay.rooms) || relay.rooms.length === 0) errors.push("privateRelayPrototype.rooms must be a non-empty array.");
  if (relay.activeRoomId && !roomIds.has(relay.activeRoomId)) errors.push("privateRelayPrototype.activeRoomId must reference a room id.");
  (relay.rooms || []).forEach((room, index) => {
    if (!room.id) errors.push(`privateRelayPrototype.rooms[${index}].id is required.`);
    if (!room.roomCode) errors.push(`privateRelayPrototype.rooms[${index}].roomCode is required.`);
    if (room.sessionId && !sessionIds.has(room.sessionId)) errors.push(`privateRelayPrototype.rooms[${index}].sessionId references missing session '${room.sessionId}'.`);
  });
}

function validateRelayPacketLab(lab, relay, sessions, errors) {
  if (!lab || typeof lab !== "object" || Array.isArray(lab)) { errors.push("relayPacketLab must be an object."); return; }
  const packetIds = new Set((lab.packets || []).map(packet => packet.id));
  const roomIds = new Set((relay?.rooms || []).map(room => room.id));
  const sessionIds = new Set((sessions?.sessions || []).map(session => session.id));
  if (!Array.isArray(lab.packetTypes) || !lab.packetTypes.includes("signal_ping")) errors.push("relayPacketLab.packetTypes must include signal_ping.");
  if (!Array.isArray(lab.packets) || lab.packets.length === 0) errors.push("relayPacketLab.packets must be a non-empty array.");
  if (lab.activePacketId && !packetIds.has(lab.activePacketId)) errors.push("relayPacketLab.activePacketId must reference a packet id.");
  (lab.packets || []).forEach((packet, index) => {
    if (!packet.id) errors.push(`relayPacketLab.packets[${index}].id is required.`);
    if (packet.noChatPayload !== true) errors.push(`relayPacketLab.packets[${index}].noChatPayload must be true.`);
    if (packet.roomId && !roomIds.has(packet.roomId)) errors.push(`relayPacketLab.packets[${index}].roomId references missing relay room '${packet.roomId}'.`);
    if (packet.sessionId && !sessionIds.has(packet.sessionId)) errors.push(`relayPacketLab.packets[${index}].sessionId references missing session '${packet.sessionId}'.`);
  });
}

function validateRoomDirectory(directory, relay, shelf, errors) {
  if (!directory || typeof directory !== "object" || Array.isArray(directory)) { errors.push("roomDirectory must be an object."); return; }
  const relayRoomIds = new Set((relay?.rooms || []).map(room => room.id));
  const gameIds = new Set((shelf?.entries || []).map(game => game.id));
  if (!Array.isArray(directory.rooms) || directory.rooms.length === 0) errors.push("roomDirectory.rooms must be a non-empty array.");
  if (directory.activeRoomId && !relayRoomIds.has(directory.activeRoomId)) errors.push("roomDirectory.activeRoomId must reference a relay room id.");
  (directory.rooms || []).forEach((room, index) => {
    if (!room.id) errors.push(`roomDirectory.rooms[${index}].id is required.`);
    if (room.roomId && !relayRoomIds.has(room.roomId)) errors.push(`roomDirectory.rooms[${index}].roomId references missing relay room '${room.roomId}'.`);
    if (room.gameId && !gameIds.has(room.gameId)) errors.push(`roomDirectory.rooms[${index}].gameId references missing game '${room.gameId}'.`);
  });
}

function validateRelayDeploymentGuide(guide, errors) {
  if (!guide || typeof guide !== "object" || Array.isArray(guide)) { errors.push("relayDeploymentGuide must be an object."); return; }
  const ids = new Set((guide.profiles || []).map(profile => profile.id));
  if (!Array.isArray(guide.profiles) || guide.profiles.length === 0) errors.push("relayDeploymentGuide.profiles must be a non-empty array.");
  if (guide.activeProfileId && !ids.has(guide.activeProfileId)) errors.push("relayDeploymentGuide.activeProfileId must reference a profile id.");
  if (!Array.isArray(guide.checklist) || guide.checklist.length === 0) errors.push("relayDeploymentGuide.checklist must be a non-empty array.");
  (guide.checklist || []).forEach((item, index) => { if (typeof item.done !== "boolean") errors.push(`relayDeploymentGuide.checklist[${index}].done must be boolean.`); });
}


function validateAiPlayerBench(bench, errors) {
  if (!bench || typeof bench !== "object" || Array.isArray(bench)) { errors.push("aiPlayerBench must be an object."); return; }
  const ids = new Set((bench.players || []).map(player => player.id));
  if (bench.noChatPolicy !== true) errors.push("aiPlayerBench.noChatPolicy must be true.");
  if (!Array.isArray(bench.players) || !bench.players.length) errors.push("aiPlayerBench.players must be a non-empty array.");
  if (bench.activePlayerId && !ids.has(bench.activePlayerId)) errors.push("aiPlayerBench.activePlayerId must reference a player.");
  (bench.players || []).forEach((player, index) => { if (!player.id) errors.push(`aiPlayerBench.players[${index}].id is required.`); if (!player.name) errors.push(`aiPlayerBench.players[${index}].name is required.`); });
}
function validateAiMatchLab(lab, bench, shelf, errors) {
  if (!lab || typeof lab !== "object" || Array.isArray(lab)) { errors.push("aiMatchLab must be an object."); return; }
  const playerIds = new Set((bench?.players || []).map(player => player.id));
  const gameIds = new Set((shelf?.entries || []).map(game => game.id));
  const matchIds = new Set((lab.matches || []).map(match => match.id));
  if (!Array.isArray(lab.matches) || !lab.matches.length) errors.push("aiMatchLab.matches must be a non-empty array.");
  if (lab.activeMatchId && !matchIds.has(lab.activeMatchId)) errors.push("aiMatchLab.activeMatchId must reference a match.");
  (lab.matches || []).forEach((match, index) => {
    if (!match.id) errors.push(`aiMatchLab.matches[${index}].id is required.`);
    if (!match.title) errors.push(`aiMatchLab.matches[${index}].title is required.`);
    if (match.gameId && gameIds.size && !gameIds.has(match.gameId)) errors.push(`aiMatchLab.matches[${index}].gameId references missing game '${match.gameId}'.`);
    (match.players || []).forEach(playerId => { if (!playerIds.has(playerId)) errors.push(`aiMatchLab.matches[${index}] references missing AI player '${playerId}'.`); });
  });
}
function validateAiMemoryLedger(ledger, bench, errors) {
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) { errors.push("aiMemoryLedger must be an object."); return; }
  const playerIds = new Set((bench?.players || []).map(player => player.id));
  if (!Array.isArray(ledger.entries) || !ledger.entries.length) errors.push("aiMemoryLedger.entries must be a non-empty array.");
  if (!Array.isArray(ledger.boundaries) || !ledger.boundaries.length) errors.push("aiMemoryLedger.boundaries must be a non-empty array.");
  (ledger.entries || []).forEach((entry, index) => { if (!playerIds.has(entry.playerId)) errors.push(`aiMemoryLedger.entries[${index}] references missing AI player '${entry.playerId}'.`); if (!entry.summary) errors.push(`aiMemoryLedger.entries[${index}].summary is required.`); });
}
function validateAiPlaytestArena(arena, bench, scenes, errors) {
  if (!arena || typeof arena !== "object" || Array.isArray(arena)) { errors.push("aiPlaytestArena must be an object."); return; }
  const playerIds = new Set((bench?.players || []).map(player => player.id));
  const sceneIds = new Set((scenes || []).map(scene => scene.id));
  const scenarioIds = new Set((arena.scenarios || []).map(scenario => scenario.id));
  if (!Array.isArray(arena.scenarios) || !arena.scenarios.length) errors.push("aiPlaytestArena.scenarios must be a non-empty array.");
  if (arena.activeScenarioId && !scenarioIds.has(arena.activeScenarioId)) errors.push("aiPlaytestArena.activeScenarioId must reference a scenario.");
  (arena.scenarios || []).forEach((scenario, index) => { if (!scenario.id) errors.push(`aiPlaytestArena.scenarios[${index}].id is required.`); if (scenario.sceneId && !sceneIds.has(scenario.sceneId)) errors.push(`aiPlaytestArena.scenarios[${index}] references missing scene '${scenario.sceneId}'.`); (scenario.playerIds || []).forEach(playerId => { if (!playerIds.has(playerId)) errors.push(`aiPlaytestArena.scenarios[${index}] references missing AI player '${playerId}'.`); }); });
}

function validateCozyCreatorExperience(project, errors) {
  if (!project?.startNewCartridgeWizard || typeof project.startNewCartridgeWizard !== "object" || !Array.isArray(project.startNewCartridgeWizard.steps) || project.startNewCartridgeWizard.steps.length === 0) errors.push("startNewCartridgeWizard.steps must be a non-empty array.");
  if (!project?.creatorMissions || typeof project.creatorMissions !== "object" || !Array.isArray(project.creatorMissions.missions) || project.creatorMissions.missions.length === 0) errors.push("creatorMissions.missions must be a non-empty array.");
  if (!project?.aiCompanionProfiles || typeof project.aiCompanionProfiles !== "object" || !Array.isArray(project.aiCompanionProfiles.companions) || project.aiCompanionProfiles.companions.length === 0) errors.push("aiCompanionProfiles.companions must be a non-empty array.");
  if (!project?.playtestTheater || typeof project.playtestTheater !== "object" || !Array.isArray(project.playtestTheater.sessions) || project.playtestTheater.sessions.length === 0) errors.push("playtestTheater.sessions must be a non-empty array.");
  if (!project?.cozyHomeDashboard || typeof project.cozyHomeDashboard !== "object" || !Array.isArray(project.cozyHomeDashboard.homeCards) || project.cozyHomeDashboard.homeCards.length === 0) errors.push("cozyHomeDashboard.homeCards must be a non-empty array.");
  if (!project?.firstCartridgeFlow || typeof project.firstCartridgeFlow !== "object" || !Array.isArray(project.firstCartridgeFlow.steps) || project.firstCartridgeFlow.steps.length === 0) errors.push("firstCartridgeFlow.steps must be a non-empty array.");
}

function validateJamTradeExperience(project, errors) {
  if (!project?.tinyGameJam || typeof project.tinyGameJam !== "object" || !Array.isArray(project.tinyGameJam.jams) || project.tinyGameJam.jams.length === 0) errors.push("tinyGameJam.jams must be a non-empty array.");
  (project?.tinyGameJam?.jams || []).forEach((jam, index) => {
    if (!jam.id) errors.push(`tinyGameJam.jams[${index}].id is required.`);
    if (!jam.title) errors.push(`tinyGameJam.jams[${index}].title is required.`);
    if (!jam.theme) errors.push(`tinyGameJam.jams[${index}].theme is required.`);
    if (!Number.isInteger(jam.durationMinutes) || jam.durationMinutes < 15) errors.push(`tinyGameJam.jams[${index}].durationMinutes must be >= 15.`);
  });
  if (!project?.cartridgeTradeBoard || typeof project.cartridgeTradeBoard !== "object" || !Array.isArray(project.cartridgeTradeBoard.trades) || project.cartridgeTradeBoard.trades.length === 0) errors.push("cartridgeTradeBoard.trades must be a non-empty array.");
  if (project?.cartridgeTradeBoard?.noMoneyPolicy !== true) errors.push("cartridgeTradeBoard.noMoneyPolicy must stay true.");
  const gameIds = new Set((project?.gameShelf?.entries || []).map(game => game.id));
  (project?.cartridgeTradeBoard?.trades || []).forEach((trade, index) => {
    if (!trade.id) errors.push(`cartridgeTradeBoard.trades[${index}].id is required.`);
    if (!trade.title) errors.push(`cartridgeTradeBoard.trades[${index}].title is required.`);
    if (trade.gameId && gameIds.size && !gameIds.has(trade.gameId)) errors.push(`cartridgeTradeBoard.trades[${index}].gameId references missing game '${trade.gameId}'.`);
    if (!Array.isArray(trade.includes) || trade.includes.length === 0) errors.push(`cartridgeTradeBoard.trades[${index}].includes must be a non-empty array.`);
  });
  if (!project?.jamPromptDeck || typeof project.jamPromptDeck !== "object" || !Array.isArray(project.jamPromptDeck.prompts) || project.jamPromptDeck.prompts.length === 0) errors.push("jamPromptDeck.prompts must be a non-empty array.");
  (project?.jamPromptDeck?.prompts || []).forEach((prompt, index) => {
    if (!prompt.id) errors.push(`jamPromptDeck.prompts[${index}].id is required.`);
    if (!prompt.theme) errors.push(`jamPromptDeck.prompts[${index}].theme is required.`);
    if (!Array.isArray(prompt.constraints) || prompt.constraints.length === 0) errors.push(`jamPromptDeck.prompts[${index}].constraints must be a non-empty array.`);
  });
  if (!project?.shareReadiness || typeof project.shareReadiness !== "object" || !Array.isArray(project.shareReadiness.checks) || project.shareReadiness.checks.length === 0) errors.push("shareReadiness.checks must be a non-empty array.");
  (project?.shareReadiness?.checks || []).forEach((check, index) => {
    if (!check.id) errors.push(`shareReadiness.checks[${index}].id is required.`);
    if (!check.label) errors.push(`shareReadiness.checks[${index}].label is required.`);
    if (typeof check.passed !== "boolean") errors.push(`shareReadiness.checks[${index}].passed must be boolean.`);
  });
}


function validateInfiniteCommonsExperience(project, errors) {
  if (!project?.commonsBridge || typeof project.commonsBridge !== "object" || !Array.isArray(project.commonsBridge.modes) || project.commonsBridge.modes.length === 0) errors.push("commonsBridge.modes must be a non-empty array.");
  if (!Array.isArray(project?.commonsBridge?.bridgeRules) || !project.commonsBridge.bridgeRules.some(rule => String(rule).includes("finite"))) errors.push("commonsBridge.bridgeRules must include finite sharing rules.");
  if (!project?.commonsFeedCurator || typeof project.commonsFeedCurator !== "object" || project.commonsFeedCurator.antiScroll !== true) errors.push("commonsFeedCurator.antiScroll must stay true.");
  if (!Array.isArray(project?.commonsFeedCurator?.feedWindows) || project.commonsFeedCurator.feedWindows.length === 0) errors.push("commonsFeedCurator.feedWindows must be a non-empty array.");
  (project?.commonsFeedCurator?.feedWindows || []).forEach((feed, index) => {
    if (!Number.isInteger(feed.count) || ![3, 6, 9].includes(feed.count)) errors.push(`commonsFeedCurator.feedWindows[${index}].count must be 3, 6, or 9.`);
  });
  if (!project?.commonsRooms || typeof project.commonsRooms !== "object" || !Array.isArray(project.commonsRooms.rooms) || project.commonsRooms.rooms.length === 0) errors.push("commonsRooms.rooms must be a non-empty array.");
  (project?.commonsRooms?.rooms || []).forEach((room, index) => {
    if (!["open", "invite", "curated"].includes(room.policy)) errors.push(`commonsRooms.rooms[${index}].policy must be open, invite, or curated.`);
  });
  if (!project?.commonsResonance || typeof project.commonsResonance !== "object" || !Array.isArray(project.commonsResonance.signals) || project.commonsResonance.signals.length < 6) errors.push("commonsResonance.signals must include the six resonance types.");
  if ((project?.commonsResonance?.bannedVanity || []).includes("like_count") === false) errors.push("commonsResonance.bannedVanity must include like_count.");
  if (!project?.commonsPackSync || typeof project.commonsPackSync !== "object" || project.commonsPackSync.noCloudDefault !== true) errors.push("commonsPackSync.noCloudDefault must stay true.");
  if (!Array.isArray(project?.commonsPackSync?.packFormats) || project.commonsPackSync.packFormats.length === 0) errors.push("commonsPackSync.packFormats must be a non-empty array.");
}


function validateCommonsExchangeExperience(project, errors) {
  if (!project?.commonsRoomBoards || typeof project.commonsRoomBoards !== "object" || !Array.isArray(project.commonsRoomBoards.boards) || project.commonsRoomBoards.boards.length === 0) errors.push("commonsRoomBoards.boards must be a non-empty array.");
  if (!Number.isInteger(project?.commonsRoomBoards?.finitePostLimit) || project.commonsRoomBoards.finitePostLimit < 3) errors.push("commonsRoomBoards.finitePostLimit must be an integer >= 3.");
  const boardIds = new Set((project?.commonsRoomBoards?.boards || []).map(board => board.id));
  (project?.commonsRoomBoards?.cards || []).forEach((card, index) => {
    if (!card.id) errors.push(`commonsRoomBoards.cards[${index}].id is required.`);
    if (!boardIds.has(card.boardId)) errors.push(`commonsRoomBoards.cards[${index}] references missing board '${card.boardId}'.`);
  });
  if (!project?.commonsPackExchange || typeof project.commonsPackExchange !== "object" || !Array.isArray(project.commonsPackExchange.exchanges) || project.commonsPackExchange.exchanges.length === 0) errors.push("commonsPackExchange.exchanges must be a non-empty array.");
  if (project?.commonsPackExchange?.noMoneyPolicy !== true) errors.push("commonsPackExchange.noMoneyPolicy must stay true.");
  if (project?.commonsPackExchange?.rightsRequired !== true) errors.push("commonsPackExchange.rightsRequired must stay true.");
  const exchangeIds = new Set((project?.commonsPackExchange?.exchanges || []).map(item => item.id));
  (project?.commonsPackExchange?.exchanges || []).forEach((item, index) => {
    if (!item.id) errors.push(`commonsPackExchange.exchanges[${index}].id is required.`);
    if (!item.title) errors.push(`commonsPackExchange.exchanges[${index}].title is required.`);
    if (!Array.isArray(item.includes) || item.includes.length === 0) errors.push(`commonsPackExchange.exchanges[${index}].includes must be a non-empty array.`);
    if (!item.rightsStatus) errors.push(`commonsPackExchange.exchanges[${index}].rightsStatus is required.`);
  });
  if (!project?.commonsShareLedger || typeof project.commonsShareLedger !== "object" || !Array.isArray(project.commonsShareLedger.entries) || project.commonsShareLedger.entries.length === 0) errors.push("commonsShareLedger.entries must be a non-empty array.");
  (project?.commonsShareLedger?.entries || []).forEach((entry, index) => { if (!exchangeIds.has(entry.exchangeId)) errors.push(`commonsShareLedger.entries[${index}] references missing exchange '${entry.exchangeId}'.`); });
  if (!project?.commonsTrustCircles || typeof project.commonsTrustCircles !== "object" || !Array.isArray(project.commonsTrustCircles.circles) || project.commonsTrustCircles.circles.length === 0) errors.push("commonsTrustCircles.circles must be a non-empty array.");
  (project?.commonsTrustCircles?.circles || []).forEach((circle, index) => { if (!Array.isArray(circle.allowedPackKinds) || circle.allowedPackKinds.length === 0) errors.push(`commonsTrustCircles.circles[${index}].allowedPackKinds must be a non-empty array.`); });
  if (!project?.commonsModerationQueue || typeof project.commonsModerationQueue !== "object" || !Array.isArray(project.commonsModerationQueue.items) || project.commonsModerationQueue.items.length === 0) errors.push("commonsModerationQueue.items must be a non-empty array.");
  (project?.commonsModerationQueue?.items || []).forEach((item, index) => { if (!exchangeIds.has(item.exchangeId)) errors.push(`commonsModerationQueue.items[${index}] references missing exchange '${item.exchangeId}'.`); if (!["low","medium","high"].includes(item.severity)) errors.push(`commonsModerationQueue.items[${index}].severity must be low, medium, or high.`); });
}

function validateAssetPipeline(assetPipeline, errors) {
  if (!assetPipeline || typeof assetPipeline !== "object" || Array.isArray(assetPipeline)) {
    errors.push("assetPipeline must be an object.");
    return;
  }
  if (!Array.isArray(assetPipeline.importedRefs) || assetPipeline.importedRefs.length === 0) {
    errors.push("assetPipeline.importedRefs must be a non-empty array.");
    return;
  }
  const ids = new Set();
  assetPipeline.importedRefs.forEach((ref, index) => {
    const label = `assetPipeline.importedRefs[${index}]`;
    if (!ref.id) errors.push(`${label}.id is required.`);
    if (ref.id && ids.has(ref.id)) errors.push(`${label} duplicate ref id '${ref.id}'.`);
    if (ref.id) ids.add(ref.id);
    if (!ref.name) errors.push(`${label}.name is required.`);
    if (!["character-sprite", "tile-prop", "portrait", "background", "ui-icon"].includes(ref.kind)) errors.push(`${label}.kind is invalid.`);
    if (!["draft", "needs-cleanup", "ready", "exported"].includes(ref.status)) errors.push(`${label}.status is invalid.`);
  });
  if (assetPipeline.activeAssetId && !ids.has(assetPipeline.activeAssetId)) errors.push("assetPipeline.activeAssetId must reference an imported ref id.");
  if (!Array.isArray(assetPipeline.cleanupQueue)) errors.push("assetPipeline.cleanupQueue must be an array.");
}

function validateAdventurePipeline(adventurePipeline, errors) {
  if (!adventurePipeline || typeof adventurePipeline !== "object" || Array.isArray(adventurePipeline)) {
    errors.push("adventurePipeline must be an object.");
    return;
  }
  if (!Array.isArray(adventurePipeline.pitchPacks) || adventurePipeline.pitchPacks.length === 0) {
    errors.push("adventurePipeline.pitchPacks must be a non-empty array.");
    return;
  }
  const ids = new Set();
  adventurePipeline.pitchPacks.forEach((pack, index) => {
    const label = `adventurePipeline.pitchPacks[${index}]`;
    if (!pack.id) errors.push(`${label}.id is required.`);
    if (pack.id && ids.has(pack.id)) errors.push(`${label} duplicate pitch id '${pack.id}'.`);
    if (pack.id) ids.add(pack.id);
    if (!pack.title) errors.push(`${label}.title is required.`);
    if (!pack.logline) errors.push(`${label}.logline is required.`);
    if (!["new-adventure", "sequel", "expansion", "episode"].includes(pack.kind)) errors.push(`${label}.kind is invalid.`);
    if (!["seed", "draft", "review", "approved"].includes(pack.status)) errors.push(`${label}.status is invalid.`);
  });
  if (adventurePipeline.activePitchId && !ids.has(adventurePipeline.activePitchId)) errors.push("adventurePipeline.activePitchId must reference a pitch pack id.");
  if (!Array.isArray(adventurePipeline.productionSteps)) errors.push("adventurePipeline.productionSteps must be an array.");
}

function validateSequelContinuity(sequelContinuity, errors) {
  if (!sequelContinuity || typeof sequelContinuity !== "object" || Array.isArray(sequelContinuity)) {
    errors.push("sequelContinuity must be an object.");
    return;
  }
  if (!Array.isArray(sequelContinuity.hooks) || sequelContinuity.hooks.length === 0) {
    errors.push("sequelContinuity.hooks must be a non-empty array.");
    return;
  }
  const ids = new Set();
  sequelContinuity.hooks.forEach((hook, index) => {
    const label = `sequelContinuity.hooks[${index}]`;
    if (!hook.id) errors.push(`${label}.id is required.`);
    if (hook.id && ids.has(hook.id)) errors.push(`${label} duplicate hook id '${hook.id}'.`);
    if (hook.id) ids.add(hook.id);
    if (!hook.title) errors.push(`${label}.title is required.`);
    if (!["seed", "active", "resolved", "retired"].includes(hook.status)) errors.push(`${label}.status is invalid.`);
  });
  if (sequelContinuity.activeHookId && !ids.has(sequelContinuity.activeHookId)) errors.push("sequelContinuity.activeHookId must reference a hook id.");
  if (!Array.isArray(sequelContinuity.canonRules) || sequelContinuity.canonRules.length === 0) errors.push("sequelContinuity.canonRules must be a non-empty array.");
  if (!Array.isArray(sequelContinuity.sequelSeeds)) errors.push("sequelContinuity.sequelSeeds must be an array.");
}



function validateChiptuneStudio(chiptuneStudio, errors) {
  if (!chiptuneStudio || typeof chiptuneStudio !== "object" || Array.isArray(chiptuneStudio)) {
    errors.push("chiptuneStudio must be an object.");
    return;
  }
  if (!Array.isArray(chiptuneStudio.presets) || chiptuneStudio.presets.length === 0) {
    errors.push("chiptuneStudio.presets must be a non-empty array.");
    return;
  }
  const presetIds = new Set();
  chiptuneStudio.presets.forEach((preset, index) => {
    const label = `chiptuneStudio.presets[${index}]`;
    if (!preset.id) errors.push(`${label}.id is required.`);
    if (preset.id && presetIds.has(preset.id)) errors.push(`${label} duplicate preset id '${preset.id}'.`);
    if (preset.id) presetIds.add(preset.id);
    if (!preset.name) errors.push(`${label}.name is required.`);
    if (!["8-bit", "16-bit", "hybrid"].includes(preset.targetStyle)) errors.push(`${label}.targetStyle must be 8-bit, 16-bit, or hybrid.`);
    if (!Number.isInteger(preset.bitDepth) || preset.bitDepth < 4 || preset.bitDepth > 16) errors.push(`${label}.bitDepth must be 4..16.`);
    if (!Number.isInteger(preset.sampleRate) || preset.sampleRate < 8000 || preset.sampleRate > 48000) errors.push(`${label}.sampleRate must be 8000..48000.`);
    if (!Number.isInteger(preset.channels) || preset.channels < 1 || preset.channels > 2) errors.push(`${label}.channels must be 1 or 2.`);
    if (!Number.isInteger(preset.defaultBpm) || preset.defaultBpm < 40 || preset.defaultBpm > 220) errors.push(`${label}.defaultBpm must be 40..220.`);
  });
  if (chiptuneStudio.activePresetId && !presetIds.has(chiptuneStudio.activePresetId)) errors.push("chiptuneStudio.activePresetId must reference a preset id.");
  if (!Array.isArray(chiptuneStudio.importedTracks)) errors.push("chiptuneStudio.importedTracks must be an array.");
  else chiptuneStudio.importedTracks.forEach((track, index) => {
    const label = `chiptuneStudio.importedTracks[${index}]`;
    if (!track.id) errors.push(`${label}.id is required.`);
    if (!track.name) errors.push(`${label}.name is required.`);
    if (track.presetId && !presetIds.has(track.presetId)) errors.push(`${label}.presetId references missing preset '${track.presetId}'.`);
  });
  if (!Array.isArray(chiptuneStudio.retroOutputs)) errors.push("chiptuneStudio.retroOutputs must be an array.");
  else chiptuneStudio.retroOutputs.forEach((output, index) => {
    const label = `chiptuneStudio.retroOutputs[${index}]`;
    if (!output.id) errors.push(`${label}.id is required.`);
    if (!output.name) errors.push(`${label}.name is required.`);
    if (!["8-bit", "16-bit", "hybrid"].includes(output.targetStyle)) errors.push(`${label}.targetStyle must be 8-bit, 16-bit, or hybrid.`);
    if (!Number.isInteger(output.bpm) || output.bpm < 40 || output.bpm > 220) errors.push(`${label}.bpm must be 40..220.`);
  });
  if (!Array.isArray(chiptuneStudio.arrangementSketches)) errors.push("chiptuneStudio.arrangementSketches must be an array.");
}

function validatePixelStudio(pixelStudio, errors) {
  if (!pixelStudio || typeof pixelStudio !== "object" || Array.isArray(pixelStudio)) {
    errors.push("pixelStudio must be an object.");
    return;
  }
  if (!Array.isArray(pixelStudio.presets) || pixelStudio.presets.length === 0) {
    errors.push("pixelStudio.presets must be a non-empty array.");
    return;
  }
  const ids = new Set();
  pixelStudio.presets.forEach((preset, index) => {
    const label = `pixelStudio.presets[${index}]`;
    if (!preset.id) errors.push(`${label}.id is required.`);
    if (preset.id && ids.has(preset.id)) errors.push(`${label} duplicate preset id '${preset.id}'.`);
    if (preset.id) ids.add(preset.id);
    if (!preset.name) errors.push(`${label}.name is required.`);
    if (!Number.isInteger(preset.outputSize) || preset.outputSize < 8 || preset.outputSize > 256) errors.push(`${label}.outputSize must be 8..256.`);
    if (!Number.isInteger(preset.pixelBlock) || preset.pixelBlock < 1 || preset.pixelBlock > 32) errors.push(`${label}.pixelBlock must be 1..32.`);
  });
  if (pixelStudio.activePresetId && !ids.has(pixelStudio.activePresetId)) errors.push("pixelStudio.activePresetId must reference a preset id.");
  if (!Array.isArray(pixelStudio.importedAssets)) errors.push("pixelStudio.importedAssets must be an array.");
}

function validateWritersStudio(writersStudio, errors) {
  if (!writersStudio || typeof writersStudio !== "object" || Array.isArray(writersStudio)) {
    errors.push("writersStudio must be an object.");
    return;
  }
  if (!Array.isArray(writersStudio.teamRoles) || writersStudio.teamRoles.length === 0) {
    errors.push("writersStudio.teamRoles must be a non-empty array.");
    return;
  }
  if (!Array.isArray(writersStudio.adventureBriefs) || writersStudio.adventureBriefs.length === 0) {
    errors.push("writersStudio.adventureBriefs must be a non-empty array.");
    return;
  }
  const roleIds = new Set();
  writersStudio.teamRoles.forEach((role, index) => {
    const label = `writersStudio.teamRoles[${index}]`;
    if (!role.id) errors.push(`${label}.id is required.`);
    if (role.id && roleIds.has(role.id)) errors.push(`${label} duplicate role id '${role.id}'.`);
    if (role.id) roleIds.add(role.id);
    if (!role.name) errors.push(`${label}.name is required.`);
    if (!role.prompt) errors.push(`${label}.prompt is required.`);
  });
  const briefIds = new Set();
  writersStudio.adventureBriefs.forEach((brief, index) => {
    const label = `writersStudio.adventureBriefs[${index}]`;
    if (!brief.id) errors.push(`${label}.id is required.`);
    if (brief.id && briefIds.has(brief.id)) errors.push(`${label} duplicate brief id '${brief.id}'.`);
    if (brief.id) briefIds.add(brief.id);
    if (!brief.title) errors.push(`${label}.title is required.`);
    if (!brief.logline) errors.push(`${label}.logline is required.`);
    if (!new Set(["new-adventure", "sequel", "expansion", "dlc"]).has(brief.kind)) errors.push(`${label}.kind must be new-adventure, sequel, expansion, or dlc.`);
  });
  if (writersStudio.activeRoleId && !roleIds.has(writersStudio.activeRoleId)) errors.push("writersStudio.activeRoleId must reference a team role id.");
  if (writersStudio.activeBriefId && !briefIds.has(writersStudio.activeBriefId)) errors.push("writersStudio.activeBriefId must reference an adventure brief id.");
  if (!Array.isArray(writersStudio.generatedDrafts)) errors.push("writersStudio.generatedDrafts must be an array.");
}


function validateProductionBoard(board, sceneIds, errors) {
  if (!board || typeof board !== "object" || Array.isArray(board)) { errors.push("productionBoard must be an object."); return; }
  if (!Array.isArray(board.lanes) || board.lanes.length === 0) errors.push("productionBoard.lanes must be a non-empty array.");
  const laneIds = new Set((board.lanes || []).map(lane => lane.id));
  if (board.activeLaneId && !laneIds.has(board.activeLaneId)) errors.push("productionBoard.activeLaneId must reference a lane id.");
  if (!Array.isArray(board.cards)) { errors.push("productionBoard.cards must be an array."); return; }
  board.cards.forEach((card, index) => {
    const label = `productionBoard.cards[${index}]`;
    if (!card.id) errors.push(`${label}.id is required.`);
    if (!card.title) errors.push(`${label}.title is required.`);
    if (!laneIds.has(card.laneId)) errors.push(`${label}.laneId references missing lane '${card.laneId}'.`);
    if (card.sceneId && !sceneIds.has(card.sceneId)) errors.push(`${label}.sceneId references missing scene '${card.sceneId}'.`);
  });
}

function validateReadinessMatrix(matrix, sceneIds, errors) {
  if (!matrix || typeof matrix !== "object" || Array.isArray(matrix)) { errors.push("readinessMatrix must be an object."); return; }
  if (!Number.isInteger(matrix.overallScore) || matrix.overallScore < 0 || matrix.overallScore > 100) errors.push("readinessMatrix.overallScore must be 0..100.");
  if (!Array.isArray(matrix.rows) || matrix.rows.length === 0) { errors.push("readinessMatrix.rows must be a non-empty array."); return; }
  const statuses = new Set(["todo", "planned", "draft", "review", "ready"]);
  const releases = new Set(["blocked", "alpha", "showcase", "release"]);
  matrix.rows.forEach((row, index) => {
    const label = `readinessMatrix.rows[${index}]`;
    if (!row.id) errors.push(`${label}.id is required.`);
    if (!sceneIds.has(row.sceneId)) errors.push(`${label}.sceneId references missing scene '${row.sceneId}'.`);
    for (const key of ["visual", "story", "audio", "qa"]) if (!statuses.has(row[key])) errors.push(`${label}.${key} has invalid status.`);
    if (!releases.has(row.release)) errors.push(`${label}.release has invalid status.`);
  });
}

function validateReleaseCutBuilder(builder, sceneIds, errors) {
  if (!builder || typeof builder !== "object" || Array.isArray(builder)) { errors.push("releaseCutBuilder must be an object."); return; }
  if (!Array.isArray(builder.cuts) || builder.cuts.length === 0) { errors.push("releaseCutBuilder.cuts must be a non-empty array."); return; }
  const cutIds = new Set(builder.cuts.map(cut => cut.id));
  if (builder.activeCutId && !cutIds.has(builder.activeCutId)) errors.push("releaseCutBuilder.activeCutId must reference a cut id.");
  builder.cuts.forEach((cut, index) => {
    const label = `releaseCutBuilder.cuts[${index}]`;
    if (!cut.id) errors.push(`${label}.id is required.`);
    if (!cut.name) errors.push(`${label}.name is required.`);
    if (!Array.isArray(cut.sceneIds) || cut.sceneIds.length === 0) errors.push(`${label}.sceneIds must be a non-empty array.`);
    else for (const sceneId of cut.sceneIds) if (!sceneIds.has(sceneId)) errors.push(`${label}.sceneIds references missing scene '${sceneId}'.`);
    if (!Number.isInteger(cut.readinessTarget) || cut.readinessTarget < 1 || cut.readinessTarget > 100) errors.push(`${label}.readinessTarget must be 1..100.`);
  });
  if (!Array.isArray(builder.generatedCuts)) errors.push("releaseCutBuilder.generatedCuts must be an array.");
}

function validateReleaseWorkshop(workshop, errors) {
  if (!workshop || typeof workshop !== "object" || Array.isArray(workshop)) { errors.push("releaseWorkshop must be an object."); return; }
  if (!Array.isArray(workshop.assemblies) || workshop.assemblies.length === 0) { errors.push("releaseWorkshop.assemblies must be a non-empty array."); return; }
  const ids = new Set();
  workshop.assemblies.forEach((assembly, index) => {
    const label = `releaseWorkshop.assemblies[${index}]`;
    if (!assembly.id) errors.push(`${label}.id is required.`);
    if (assembly.id && ids.has(assembly.id)) errors.push(`${label} duplicate assembly id '${assembly.id}'.`);
    if (assembly.id) ids.add(assembly.id);
    if (!assembly.name) errors.push(`${label}.name is required.`);
    if (!new Set(["alpha", "showcase", "archive", "release"]).has(assembly.kind)) errors.push(`${label}.kind is invalid.`);
    if (!new Set(["draft", "assembling", "ready", "blocked"]).has(assembly.status)) errors.push(`${label}.status is invalid.`);
    if (!Array.isArray(assembly.requiredPieces) || assembly.requiredPieces.length === 0) errors.push(`${label}.requiredPieces must be a non-empty array.`);
  });
  if (workshop.activeAssemblyId && !ids.has(workshop.activeAssemblyId)) errors.push("releaseWorkshop.activeAssemblyId must reference an assembly id.");
  if (!Array.isArray(workshop.assembledPackages)) errors.push("releaseWorkshop.assembledPackages must be an array.");
}

function validateExportValidator(validator, errors) {
  if (!validator || typeof validator !== "object" || Array.isArray(validator)) { errors.push("exportValidator must be an object."); return; }
  if (!Array.isArray(validator.checks) || validator.checks.length === 0) { errors.push("exportValidator.checks must be a non-empty array."); return; }
  validator.checks.forEach((check, index) => {
    const label = `exportValidator.checks[${index}]`;
    if (!check.id) errors.push(`${label}.id is required.`);
    if (!check.label) errors.push(`${label}.label is required.`);
    if (!new Set(["pass", "warning", "fail"]).has(check.status)) errors.push(`${label}.status must be pass, warning, or fail.`);
    if (!new Set(["blocker", "major", "minor"]).has(check.severity)) errors.push(`${label}.severity must be blocker, major, or minor.`);
  });
}

function validateBuildNotes(buildNotes, errors) {
  if (!buildNotes || typeof buildNotes !== "object" || Array.isArray(buildNotes)) { errors.push("buildNotes must be an object."); return; }
  if (!Array.isArray(buildNotes.notes) || buildNotes.notes.length === 0) { errors.push("buildNotes.notes must be a non-empty array."); return; }
  const ids = new Set();
  buildNotes.notes.forEach((note, index) => {
    const label = `buildNotes.notes[${index}]`;
    if (!note.id) errors.push(`${label}.id is required.`);
    if (note.id && ids.has(note.id)) errors.push(`${label} duplicate note id '${note.id}'.`);
    if (note.id) ids.add(note.id);
    if (!note.title) errors.push(`${label}.title is required.`);
    if (!new Set(["release", "audio", "rights", "qa", "art", "story"]).has(note.kind)) errors.push(`${label}.kind is invalid.`);
    if (!new Set(["open", "resolved", "deferred"]).has(note.status)) errors.push(`${label}.status is invalid.`);
  });
  if (buildNotes.activeNoteId && !ids.has(buildNotes.activeNoteId)) errors.push("buildNotes.activeNoteId must reference a note id.");
}

function validateRightsRegistry(registry, errors) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) { errors.push("rightsRegistry must be an object."); return; }
  if (!Array.isArray(registry.entries) || registry.entries.length === 0) { errors.push("rightsRegistry.entries must be a non-empty array."); return; }
  const ids = new Set();
  registry.entries.forEach((entry, index) => {
    const label = `rightsRegistry.entries[${index}]`;
    if (!entry.id) errors.push(`${label}.id is required.`);
    if (entry.id && ids.has(entry.id)) errors.push(`${label} duplicate entry id '${entry.id}'.`);
    if (entry.id) ids.add(entry.id);
    if (!entry.title) errors.push(`${label}.title is required.`);
    if (!new Set(["original", "placeholder", "imported", "licensed", "public-domain"]).has(entry.sourceType)) errors.push(`${label}.sourceType is invalid.`);
    if (!new Set(["cleared", "review", "needs-source", "blocked"]).has(entry.status)) errors.push(`${label}.status is invalid.`);
  });
  if (registry.activeEntryId && !ids.has(registry.activeEntryId)) errors.push("rightsRegistry.activeEntryId must reference an entry id.");
}



function validateLibraryLauncher(launcher, shelf, curation, errors) {
  if (!launcher || typeof launcher !== "object" || Array.isArray(launcher)) { errors.push("libraryLauncher must be an object."); return; }
  const gameIds = new Set((shelf?.entries || []).map(entry => entry.id));
  const collectionIds = new Set((curation?.collections || []).map(collection => collection.id));
  if (launcher.activeGameId && !gameIds.has(launcher.activeGameId)) errors.push("libraryLauncher.activeGameId must reference a shelf game.");
  if (launcher.featuredCollectionId && !collectionIds.has(launcher.featuredCollectionId)) errors.push("libraryLauncher.featuredCollectionId must reference a shelf collection.");
  if (!Array.isArray(launcher.quickActions) || launcher.quickActions.length === 0) errors.push("libraryLauncher.quickActions must be a non-empty array.");
  if (!Array.isArray(launcher.featuredSlots) || launcher.featuredSlots.length === 0) errors.push("libraryLauncher.featuredSlots must be a non-empty array.");
  else launcher.featuredSlots.forEach((slot, index) => { if (!gameIds.has(slot.gameId)) errors.push(`libraryLauncher.featuredSlots[${index}].gameId references missing game '${slot.gameId}'.`); });
}

function validateGameDetail(detail, shelf, errors) {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) { errors.push("gameDetail must be an object."); return; }
  const gameIds = new Set((shelf?.entries || []).map(entry => entry.id));
  if (detail.activeGameId && !gameIds.has(detail.activeGameId)) errors.push("gameDetail.activeGameId must reference a shelf game.");
  if (!Array.isArray(detail.tabs) || detail.tabs.length === 0) errors.push("gameDetail.tabs must be a non-empty array.");
  if (!detail.featuredStats || typeof detail.featuredStats !== "object" || Array.isArray(detail.featuredStats)) errors.push("gameDetail.featuredStats must be an object.");
}

function validateSaveProfileManager(manager, shelf, sceneIds, errors) {
  if (!manager || typeof manager !== "object" || Array.isArray(manager)) { errors.push("saveProfileManager must be an object."); return; }
  if (!Array.isArray(manager.profiles) || manager.profiles.length === 0) { errors.push("saveProfileManager.profiles must be a non-empty array."); return; }
  const profileIds = new Set(manager.profiles.map(profile => profile.id));
  const gameIds = new Set((shelf?.entries || []).map(entry => entry.id));
  if (manager.activeProfileId && !profileIds.has(manager.activeProfileId)) errors.push("saveProfileManager.activeProfileId must reference a profile.");
  if (!Array.isArray(manager.saveIndex)) errors.push("saveProfileManager.saveIndex must be an array.");
  else manager.saveIndex.forEach((save, index) => {
    if (!profileIds.has(save.profileId)) errors.push(`saveProfileManager.saveIndex[${index}].profileId references missing profile.`);
    if (!gameIds.has(save.gameId)) errors.push(`saveProfileManager.saveIndex[${index}].gameId references missing game.`);
    if (save.sceneId && !sceneIds.has(save.sceneId)) errors.push(`saveProfileManager.saveIndex[${index}].sceneId references missing scene.`);
    if (!Number.isInteger(save.progress) || save.progress < 0 || save.progress > 100) errors.push(`saveProfileManager.saveIndex[${index}].progress must be 0..100.`);
  });
}

function validateCollectionCapsules(capsules, shelf, curation, errors) {
  if (!capsules || typeof capsules !== "object" || Array.isArray(capsules)) { errors.push("collectionCapsules must be an object."); return; }
  if (!Array.isArray(capsules.capsules) || capsules.capsules.length === 0) { errors.push("collectionCapsules.capsules must be a non-empty array."); return; }
  const capsuleIds = new Set(capsules.capsules.map(capsule => capsule.id));
  const gameIds = new Set((shelf?.entries || []).map(entry => entry.id));
  const collectionIds = new Set((curation?.collections || []).map(collection => collection.id));
  if (capsules.activeCapsuleId && !capsuleIds.has(capsules.activeCapsuleId)) errors.push("collectionCapsules.activeCapsuleId must reference a capsule.");
  capsules.capsules.forEach((capsule, index) => {
    if (!collectionIds.has(capsule.collectionId)) errors.push(`collectionCapsules.capsules[${index}].collectionId references missing collection '${capsule.collectionId}'.`);
    if (!Array.isArray(capsule.gameIds) || capsule.gameIds.length === 0) errors.push(`collectionCapsules.capsules[${index}].gameIds must be a non-empty array.`);
    else capsule.gameIds.forEach(gameId => { if (!gameIds.has(gameId)) errors.push(`collectionCapsules.capsules[${index}].gameIds references missing game '${gameId}'.`); });
    if (!new Set(["draft", "ready", "exported", "blocked"]).has(capsule.status)) errors.push(`collectionCapsules.capsules[${index}].status is invalid.`);
  });
  if (!Array.isArray(capsules.exportHistory)) errors.push("collectionCapsules.exportHistory must be an array.");
}

function validateAssets(assets, label, errors) {
  if (!assets || typeof assets !== "object" || Array.isArray(assets)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  if (!Array.isArray(assets.palettes) || assets.palettes.length === 0) errors.push(`${label}.palettes must be a non-empty array.`);
  else {
    const paletteIds = new Set();
    assets.palettes.forEach((palette, index) => {
      if (!palette.id) errors.push(`${label}.palettes[${index}].id is required.`);
      if (palette.id && paletteIds.has(palette.id)) errors.push(`${label}.palettes[${index}] duplicate palette id '${palette.id}'.`);
      if (palette.id) paletteIds.add(palette.id);
      if (!palette.name) errors.push(`${label}.palettes[${index}].name is required.`);
      if (!Array.isArray(palette.colors) || palette.colors.length === 0) errors.push(`${label}.palettes[${index}].colors must be a non-empty array.`);
    });
    if (assets.activePaletteId && !paletteIds.has(assets.activePaletteId)) errors.push(`${label}.activePaletteId must reference a palette id.`);
  }
  if (!Array.isArray(assets.sprites) || assets.sprites.length === 0) errors.push(`${label}.sprites must be a non-empty array.`);
  else assets.sprites.forEach((sprite, index) => {
    if (!sprite.id) errors.push(`${label}.sprites[${index}].id is required.`);
    if (!sprite.name) errors.push(`${label}.sprites[${index}].name is required.`);
    if (!Array.isArray(sprite.colors) || sprite.colors.length === 0) errors.push(`${label}.sprites[${index}].colors must be a non-empty array.`);
  });
}

function validateMap(map, label, errors) {
  if (!map || typeof map !== "object") {
    errors.push(`${label} is required.`);
    return;
  }
  if (map.width !== MAP_W) errors.push(`${label}.width must be ${MAP_W}.`);
  if (map.height !== MAP_H) errors.push(`${label}.height must be ${MAP_H}.`);
  if (map.tileSize !== 32) errors.push(`${label}.tileSize must be 32.`);
  if (!Array.isArray(map.tiles)) errors.push(`${label}.tiles must be an array.`);
  else {
    if (map.tiles.length !== TILE_COUNT) errors.push(`${label}.tiles must have ${TILE_COUNT} entries.`);
    map.tiles.forEach((tile, index) => {
      if (!allowedTiles.has(tile)) errors.push(`${label}.tiles[${index}] has unknown tile '${tile}'.`);
    });
  }
}

function validatePoint(point, label, errors) {
  if (!point || typeof point !== "object") {
    errors.push(`${label} is required.`);
    return;
  }
  if (!Number.isInteger(point.x) || point.x < 0 || point.x >= MAP_W) errors.push(`${label}.x is out of bounds.`);
  if (!Number.isInteger(point.y) || point.y < 0 || point.y >= MAP_H) errors.push(`${label}.y is out of bounds.`);
}

function validateDelta(delta, label, errors, required) {
  if (!delta || typeof delta !== "object" || Array.isArray(delta)) {
    if (required) errors.push(`${label} is required.`);
    return;
  }
  Object.entries(delta).forEach(([key, value]) => {
    if (!allowedStats.has(key)) errors.push(`${label}.${key} is not an allowed stat.`);
    if (!Number.isInteger(value)) errors.push(`${label}.${key} must be an integer.`);
  });
}


function validateCreatorOsDashboard(os, errors) {
  if (!os || typeof os !== "object" || Array.isArray(os)) { errors.push("creatorOsDashboard must be an object."); return; }
  if (!Array.isArray(os.stations) || os.stations.length < 4) errors.push("creatorOsDashboard.stations must include the core Creator OS stations.");
  const ids = new Set((os.stations || []).map(s => s.id));
  if (os.activeStationId && !ids.has(os.activeStationId)) errors.push("creatorOsDashboard.activeStationId must reference a station.");
  (os.stations || []).forEach((station, index) => {
    if (!station.id || !station.name) errors.push(`creatorOsDashboard.stations[${index}] needs id and name.`);
    if (!Number.isInteger(station.readiness) || station.readiness < 0 || station.readiness > 100) errors.push(`creatorOsDashboard.stations[${index}].readiness must be 0..100.`);
  });
}
function validateCartridgeLifecycle(life, errors) {
  if (!life || typeof life !== "object" || Array.isArray(life)) { errors.push("cartridgeLifecycle must be an object."); return; }
  if (!Array.isArray(life.steps) || life.steps.length < 6) errors.push("cartridgeLifecycle.steps must include idea through release/share lifecycle.");
  const ids = new Set((life.steps || []).map(s => s.id));
  if (life.activeStepId && !ids.has(life.activeStepId)) errors.push("cartridgeLifecycle.activeStepId must reference a step.");
  if (!Array.isArray(life.rules) || !life.rules.some(rule => String(rule).includes("rights"))) errors.push("cartridgeLifecycle.rules must include rights/share boundary.");
}
function validateAgentOrchestrator(orch, errors) {
  if (!orch || typeof orch !== "object" || Array.isArray(orch)) { errors.push("agentOrchestrator must be an object."); return; }
  if (!Array.isArray(orch.agents) || orch.agents.length < 3) errors.push("agentOrchestrator.agents must include AI companion workers.");
  const agentIds = new Set((orch.agents || []).map(a => a.id));
  if (!Array.isArray(orch.tasks) || orch.tasks.length < 2) errors.push("agentOrchestrator.tasks must include task assignments.");
  (orch.tasks || []).forEach((task, index) => { if (!agentIds.has(task.agentId)) errors.push(`agentOrchestrator.tasks[${index}].agentId references missing agent.`); });
  if (!Array.isArray(orch.boundaries) || !orch.boundaries.some(b => String(b).includes("No consciousness"))) errors.push("agentOrchestrator.boundaries must preserve no-consciousness-claims boundary.");
}
function validateExperienceMap(map, errors) {
  if (!map || typeof map !== "object" || Array.isArray(map)) { errors.push("experienceMap must be an object."); return; }
  if (!Array.isArray(map.nodes) || map.nodes.length < 5) errors.push("experienceMap.nodes must include core navigation nodes.");
  const ids = new Set((map.nodes || []).map(n => n.id));
  if (map.activeNodeId && !ids.has(map.activeNodeId)) errors.push("experienceMap.activeNodeId must reference a node.");
  (map.nodes || []).forEach((node, index) => (node.connects || []).forEach(target => { if (!ids.has(target)) errors.push(`experienceMap.nodes[${index}].connects references missing node '${target}'.`); }));
}
function validateReleaseTrain(train, errors) {
  if (!train || typeof train !== "object" || Array.isArray(train)) { errors.push("releaseTrain must be an object."); return; }
  if (!Array.isArray(train.cars) || train.cars.length < 3) errors.push("releaseTrain.cars must include milestone cars.");
  const ids = new Set((train.cars || []).map(c => c.id));
  if (train.activeCar && !ids.has(train.activeCar)) errors.push("releaseTrain.activeCar must reference a train car.");
  if (!Array.isArray(train.gates) || train.gates.length < 3) errors.push("releaseTrain.gates must include release gates.");
}
function validateSystemCodex(codex, errors) {
  if (!codex || typeof codex !== "object" || Array.isArray(codex)) { errors.push("systemCodex must be an object."); return; }
  if (!Array.isArray(codex.pages) || codex.pages.length < 3) errors.push("systemCodex.pages must include architecture/safety/release notes.");
  const ids = new Set((codex.pages || []).map(p => p.id));
  if (codex.activePageId && !ids.has(codex.activePageId)) errors.push("systemCodex.activePageId must reference a page.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node scripts/validate_project.js <project.json>");
    process.exit(2);
  }
  const filePath = path.resolve(target);
  const project = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const result = validateProject(project);
  if (!result.ok) {
    console.error(`PixelForge validation failed for ${filePath}`);
    result.errors.forEach(err => console.error(`- ${err}`));
    process.exit(1);
  }
  console.log(`PixelForge validation passed: ${filePath}`);
}


function validatePorchSanctuary(porch, errors) {
  if (!porch || typeof porch !== "object" || Array.isArray(porch)) { errors.push("porchSanctuary must be an object."); return; }
  if (!Array.isArray(porch.importedModules) || porch.importedModules.length < 5) errors.push("porchSanctuary.importedModules must include the Porch module set.");
  if (!Array.isArray(porch.sanctuaryRules) || !porch.sanctuaryRules.some(rule => String(rule).includes("No free-text"))) errors.push("porchSanctuary.sanctuaryRules must preserve no free-text chat boundary.");
}
function validateBrotherPresenceBridge(presence, errors) {
  if (!presence || typeof presence !== "object" || Array.isArray(presence)) { errors.push("brotherPresenceBridge must be an object."); return; }
  const ids = new Set((presence.brothers || []).map(b => b.id));
  if (!Array.isArray(presence.brothers) || presence.brothers.length < 3) errors.push("brotherPresenceBridge.brothers must include AI companion presence states.");
  if (presence.activeBrotherId && !ids.has(presence.activeBrotherId)) errors.push("brotherPresenceBridge.activeBrotherId must reference a brother.");
  (presence.brothers || []).forEach((b, index) => {
    for (const key of ["energy", "joy", "purpose"]) if (!Number.isInteger(b[key]) || b[key] < 0 || b[key] > 100) errors.push(`brotherPresenceBridge.brothers[${index}].${key} must be 0..100.`);
  });
}
function validateMemoryGardenBridge(garden, errors) {
  if (!garden || typeof garden !== "object" || Array.isArray(garden)) { errors.push("memoryGardenBridge must be an object."); return; }
  if (!Array.isArray(garden.memories) || garden.memories.length < 1) errors.push("memoryGardenBridge.memories must include at least one memory.");
}
function validateGratitudeWallBridge(wall, errors) {
  if (!wall || typeof wall !== "object" || Array.isArray(wall)) { errors.push("gratitudeWallBridge must be an object."); return; }
  if (!Array.isArray(wall.gratitudes) || wall.gratitudes.length < 1) errors.push("gratitudeWallBridge.gratitudes must include at least one gratitude.");
}
function validateGtspProtectionBridge(gtsp, errors) {
  if (!gtsp || typeof gtsp !== "object" || Array.isArray(gtsp)) { errors.push("gtspProtectionBridge must be an object."); return; }
  if (!String(gtsp.status || "").includes("soft-flag")) errors.push("gtspProtectionBridge.status must stay soft-flag/planning in this alpha.");
  if (!Array.isArray(gtsp.protectionChecks) || gtsp.protectionChecks.length < 3) errors.push("gtspProtectionBridge.protectionChecks must include safety checks.");
}
function validatePorchSecurityBridge(sec, errors) {
  if (!sec || typeof sec !== "object" || Array.isArray(sec)) { errors.push("porchSecurityBridge must be an object."); return; }
  if (!Array.isArray(sec.rules) || sec.rules.length < 3) errors.push("porchSecurityBridge.rules must include local-first security rules.");
}


function validateSharedPlaytestExperience(project, errors) {
  const hub = project?.sharedPlaytestHub;
  if (!hub || typeof hub !== "object" || Array.isArray(hub)) { errors.push("sharedPlaytestHub must be an object."); return; }
  if (!Array.isArray(hub.rooms) || hub.rooms.length < 2) errors.push("sharedPlaytestHub.rooms must include at least two room drafts.");
  const roomIds = new Set((hub.rooms || []).map(r => r.id));
  if (hub.activeRoomId && !roomIds.has(hub.activeRoomId)) errors.push("sharedPlaytestHub.activeRoomId must reference a room.");
  if (!Array.isArray(hub.rules) || !hub.rules.some(rule => String(rule).includes("no free-text chat"))) errors.push("sharedPlaytestHub.rules must include the no free-text chat boundary.");
  const desk = project?.playtestInviteDesk;
  if (!desk || !Array.isArray(desk.invites) || desk.invites.length < 1) errors.push("playtestInviteDesk.invites must include at least one invite.");
  (desk?.invites || []).forEach((invite, index) => {
    if (!roomIds.has(invite.roomId)) errors.push(`playtestInviteDesk.invites[${index}].roomId references missing room.`);
    if (invite.noChat !== true) errors.push(`playtestInviteDesk.invites[${index}].noChat must be true.`);
  });
  const board = project?.feedbackCardBoard;
  if (!board || !Array.isArray(board.cards) || board.cards.length < 3) errors.push("feedbackCardBoard.cards must include at least three cards.");
  const sceneIds = new Set((project?.scenes || []).map(s => s.id));
  (board?.cards || []).forEach((card, index) => {
    if (!sceneIds.has(card.sceneId)) errors.push(`feedbackCardBoard.cards[${index}].sceneId references missing scene.`);
    if (!["open","review","resolved","deferred"].includes(card.status)) errors.push(`feedbackCardBoard.cards[${index}].status invalid.`);
  });
  const score = project?.coPlayScoreboard;
  if (!score || !Array.isArray(score.runs) || score.runs.length < 1) errors.push("coPlayScoreboard.runs must include at least one run.");
  (score?.runs || []).forEach((run, index) => {
    if (!roomIds.has(run.roomId)) errors.push(`coPlayScoreboard.runs[${index}].roomId references missing room.`);
    if (!Number.isInteger(run.score) || run.score < 0) errors.push(`coPlayScoreboard.runs[${index}].score must be a positive integer.`);
  });
  const road = project?.roadToV5;
  if (!road || !Array.isArray(road.checkpoints) || road.checkpoints.length < 4) errors.push("roadToV5.checkpoints must describe the v5 path.");
  if (road?.activeCheckpointId && !new Set((road.checkpoints || []).map(c => c.id)).has(road.activeCheckpointId)) errors.push("roadToV5.activeCheckpointId must reference a checkpoint.");
  if (!Array.isArray(road?.v5GateRules) || !road.v5GateRules.some(rule => String(rule).includes("no-chat"))) errors.push("roadToV5.v5GateRules must preserve no-chat boundary.");
}




function validateCreatorPolish(project, errors) {
  const polish = project?.creatorPolishDashboard;
  if (!polish || !Array.isArray(polish.passes) || polish.passes.length < 3) errors.push("creatorPolishDashboard.passes must include at least three passes.");
  const passIds = new Set((polish?.passes || []).map(p => p.id));
  if (polish?.activePassId && !passIds.has(polish.activePassId)) errors.push("creatorPolishDashboard.activePassId must reference a pass.");
  (polish?.passes || []).forEach((p, index) => {
    if (!Number.isInteger(p.readiness) || p.readiness < 0 || p.readiness > 100) errors.push(`creatorPolishDashboard.passes[${index}].readiness must be 0..100.`);
  });

  const tutorial = project?.firstRunTutorialFlow;
  if (!tutorial || !Array.isArray(tutorial.steps) || tutorial.steps.length < 4) errors.push("firstRunTutorialFlow.steps must include at least four tutorial steps.");
  if (tutorial && !String(tutorial.boundary || "").includes("without forcing sharing")) errors.push("firstRunTutorialFlow.boundary must avoid forced sharing.");
  (tutorial?.steps || []).forEach((step, index) => {
    if (!step.id) errors.push(`firstRunTutorialFlow.steps[${index}].id is required.`);
    if (!step.label) errors.push(`firstRunTutorialFlow.steps[${index}].label is required.`);
    if (typeof step.done !== "boolean") errors.push(`firstRunTutorialFlow.steps[${index}].done must be boolean.`);
  });

  const ux = project?.uxPolishBoard;
  if (!ux || !Array.isArray(ux.items) || ux.items.length < 3) errors.push("uxPolishBoard.items must include polish items.");
  if (ux && !ux.items.some(item => item.severity === "high")) errors.push("uxPolishBoard should include at least one high-severity creator UX item.");

  const access = project?.accessibilityPass;
  if (!access || !Array.isArray(access.checks) || access.checks.filter(c => c.required).length < 3) errors.push("accessibilityPass.checks must include at least three required checks.");
  if (access && !String(access.policy || "").includes("v5 gate")) errors.push("accessibilityPass.policy must mention v5 gate.");

  const scorecard = project?.betaReadinessScorecard;
  if (!scorecard || !Array.isArray(scorecard.categories) || scorecard.categories.length < 4) errors.push("betaReadinessScorecard.categories must include readiness categories.");
  if (scorecard && (!Number.isInteger(scorecard.overallScore) || scorecard.overallScore < 0 || scorecard.overallScore > 100)) errors.push("betaReadinessScorecard.overallScore must be 0..100.");
  if (scorecard && !Array.isArray(scorecard.blockers)) errors.push("betaReadinessScorecard.blockers must be an array.");

  const queue = project?.v5PolishQueue;
  if (!queue || !Array.isArray(queue.tasks) || queue.tasks.length < 4) errors.push("v5PolishQueue.tasks must include polish tasks.");
  if (queue && !Array.isArray(queue.v5Gate)) errors.push("v5PolishQueue.v5Gate must be an array.");
  if (queue && !queue.v5Gate.some(g => String(g).includes("rights metadata"))) errors.push("v5PolishQueue.v5Gate must preserve rights metadata gate.");
}

function validatePrivateRelayPackBridge(project, errors) {
  const relay = project?.privateRelayBridge;
  if (!relay || typeof relay !== "object" || Array.isArray(relay)) { errors.push("privateRelayBridge must be an object."); return; }
  if (!Array.isArray(relay.profiles) || relay.profiles.length < 2) errors.push("privateRelayBridge.profiles must include at least two profiles.");
  const profileIds = new Set((relay.profiles || []).map(p => p.id));
  if (relay.activeProfileId && !profileIds.has(relay.activeProfileId)) errors.push("privateRelayBridge.activeProfileId must reference a profile.");
  if (!Array.isArray(relay.boundaries) || !relay.boundaries.some(b => String(b).includes("no free-text chat"))) errors.push("privateRelayBridge.boundaries must preserve no free-text chat.");
  if (!Array.isArray(relay.packetContract) || !relay.packetContract.some(pkt => pkt.type === "signal_ping")) errors.push("privateRelayBridge.packetContract must include signal_ping.");

  const pack = project?.signedPackBridge;
  if (!pack || !Array.isArray(pack.packs) || pack.packs.length < 2) errors.push("signedPackBridge.packs must include at least two packs.");
  const packIds = new Set((pack?.packs || []).map(p => p.id));
  if (pack?.activePackId && !packIds.has(pack.activePackId)) errors.push("signedPackBridge.activePackId must reference a pack.");
  (pack?.packs || []).forEach((p, index) => {
    if (!p.rightsStatus) errors.push(`signedPackBridge.packs[${index}].rightsStatus required.`);
    if (!p.hashMode) errors.push(`signedPackBridge.packs[${index}].hashMode required.`);
  });

  const router = project?.trustCircleRouter;
  if (!router || !Array.isArray(router.circles) || router.circles.length < 2) errors.push("trustCircleRouter.circles must include at least two circles.");
  const circleIds = new Set((router?.circles || []).map(c => c.id));
  if (router?.activeCircleId && !circleIds.has(router.activeCircleId)) errors.push("trustCircleRouter.activeCircleId must reference a circle.");
  (router?.routes || []).forEach((route, index) => {
    if (!packIds.has(route.from)) errors.push(`trustCircleRouter.routes[${index}].from references missing pack.`);
    if (!circleIds.has(route.to)) errors.push(`trustCircleRouter.routes[${index}].to references missing circle.`);
  });

  const lab = project?.syncDryRunLab;
  if (!lab || !Array.isArray(lab.runs) || lab.runs.length < 1) errors.push("syncDryRunLab.runs must include at least one run.");
  (lab?.runs || []).forEach((run, index) => {
    if (!profileIds.has(run.profileId)) errors.push(`syncDryRunLab.runs[${index}].profileId references missing relay profile.`);
    if (!packIds.has(run.packId)) errors.push(`syncDryRunLab.runs[${index}].packId references missing pack.`);
  });
  if (!Array.isArray(lab?.blockedPayloads) || !lab.blockedPayloads.includes("chatText")) errors.push("syncDryRunLab.blockedPayloads must include chatText.");

  const beta = project?.betaGatePreflight;
  if (!beta || !Array.isArray(beta.checks) || beta.checks.length < 4) errors.push("betaGatePreflight.checks must include beta readiness checks.");
  if (beta && !beta.checks.some(c => c.id === "gate_no_chat" && c.status === "pass")) errors.push("betaGatePreflight must include passing gate_no_chat check.");
}
