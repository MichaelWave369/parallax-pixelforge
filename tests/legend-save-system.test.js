import assert from 'node:assert/strict';
import { DEFAULT_QUEST, LEGEND_SAVE_SCHEMA, LEGEND_SAVE_VERSION, buildLegendSave, checkpointForQuest, deriveEquipment, deriveInventory, deriveQuestLog, normalizeLegendSave, safeResumeMode, deriveBossRecords } from '../games/the-legend-of-more-bounce/src/save-system.js';
const base={...DEFAULT_QUEST,appleNodes:[]};
assert.equal(LEGEND_SAVE_SCHEMA,'pixelforge.legend-save.v5.27'); assert.equal(LEGEND_SAVE_VERSION,4);
assert.equal(checkpointForQuest(base).id,'bouncehome-start');
assert.equal(checkpointForQuest({...base,stormglassCompass:true,chapterFourComplete:true}).id,'mirrorfall-basin');
assert.equal(checkpointForQuest({...base,stormglassCompass:true,chapterFourComplete:true,worldBeamAligned:true}).id,'splitlight-causeway');
assert.equal(checkpointForQuest({...base,stormglassCompass:true,pulseNodesPowered:true}).id,'triune-observatory');
assert.equal(checkpointForQuest({...base,stormglassCompass:true,viewSigil:true}).id,'blind-angle');
assert.equal(checkpointForQuest({...base,convergenceCrown:true,chapterFiveComplete:true}).id,'mirrorfall-complete');
assert.equal(safeResumeMode('blindAngleBoss',{...base,stormglassCompass:true,viewSigil:true}),'mirrorfall');
const advanced={...base,oldTempoMet:true,groveKey:true,rune:true,shards:3,crest:true,seal:true,miraMet:true,relaySparks:3,echoBoots:true,beaconLens:true,eastComplete:true,tessaMet:true,bramMet:true,resonanceBracer:true,heartRivet:true,orchardSigil:true,ironBlossom:true,chapterThreeComplete:true,sableMet:true,galeMantle:true,pressurePrism:true,tideEngineSolved:true,undertowBellDefeated:true,stormglassCompass:true,chapterFourComplete:true,perriMet:true,prismCyan:true,prismMagenta:true,prismGold:true,worldBeamAligned:true,pulseNodes:3,pulseNodesPowered:true,lensStep:3,viewSigil:true,blindAngleDefeated:true,convergenceCrown:true,chapterFiveComplete:true};
const save=buildLegendSave({slot:2,mode:'blindAngleBoss',quest:advanced,visitedModes:['overworld','tower','eastRoad','ironOrchard','stormglassCoast','mirrorfall','splitlight','observatory','blindAngleBoss'],playtimeSeconds:1600,kind:'manual'});
assert.equal(save.schema,LEGEND_SAVE_SCHEMA);assert.equal(save.schemaVersion,4);assert.equal(save.checkpoint.id,'mirrorfall-complete');assert.equal(save.resume.safeMode,'chapter5Ending');
assert.ok(save.inventory.some(x=>x.id==='convergence-crown'));assert.equal(save.questLog.length,5);assert.equal(save.bossRecords.filter(x=>x.defeated).length,4);assert.ok(save.travelNetwork.activatedLandmarks.includes('mirrorfall-observatory'));
for(const [schema,ver] of [['pixelforge.legend-save.v5.24',1],['pixelforge.legend-save.v5.25',2],['pixelforge.legend-save.v5.26',3]]){const migrated=normalizeLegendSave({schema,schemaVersion:ver,slot:'import',mode:'stormglassCoast',progress:{stormglassCompass:true,chapterFourComplete:true},discoveredLocations:['overworld','stormglassCoast'],playtimeSeconds:321});assert.equal(migrated.schema,LEGEND_SAVE_SCHEMA);assert.equal(migrated.progress.perriMet,false);assert.equal(migrated.resume.safeMode,'mirrorfall');assert.equal(migrated.playtimeSeconds,321);}
assert.ok(deriveEquipment(base).length>=4);assert.equal(deriveQuestLog(base).length,5);assert.equal(deriveBossRecords(base).length,4);assert.ok(Array.isArray(deriveInventory(base)));
assert.throws(()=>normalizeLegendSave({schema:'wrong.schema',schemaVersion:1}),/Unsupported save schema/);assert.throws(()=>normalizeLegendSave({schema:LEGEND_SAVE_SCHEMA,schemaVersion:99}),/newer Legend save schema/);
console.log('Legend v5.27 save-system tests passed: 5-chapter checkpoints, 4 boss records, convergence state, six-landmark travel persistence, and v5.24/v5.25/v5.26 migration are coherent.');
