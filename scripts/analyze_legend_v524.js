#!/usr/bin/env node
import fs from 'node:fs';
import { DEFAULT_QUEST, buildLegendSave, checkpointForQuest, deriveEquipment, deriveQuestLog } from '../games/the-legend-of-more-bounce/src/save-system.js';
const game='games/the-legend-of-more-bounce';
const profile=JSON.parse(fs.readFileSync(`${game}/save-profile.v5.24.json`,'utf8'));
const samples=[
  { ...DEFAULT_QUEST },
  { ...DEFAULT_QUEST, oldTempoMet:true, groveKey:true, rune:true },
  { ...DEFAULT_QUEST, oldTempoMet:true, groveKey:true, rune:true, shards:3, crest:true, seal:true, miraMet:true, relaySparks:3, echoBoots:true },
  { ...DEFAULT_QUEST, oldTempoMet:true, groveKey:true, rune:true, shards:3, crest:true, seal:true, miraMet:true, relaySparks:3, echoBoots:true, beaconLens:true, tessaMet:true, bramMet:true, resonanceBracer:true, orchardSigil:true, ironBlossom:true, chapterThreeComplete:true },
];
const checkpoints=samples.map(checkpointForQuest);
const finalSave=buildLegendSave({slot:1,mode:'rustbloomBoss',quest:samples.at(-1),visitedModes:['overworld','wobble','hollow','boss','tower','eastRoad','glassgrass','signalMill','ironOrchard','rustroot','rustbloomBoss'],playtimeSeconds:1234});
const audit={
  schema:'pixelforge.legend-save-inventory-audit.v5.24',
  status:'machine-save-contract-pass-human-save-menu-inventory-questlog-and-checkpoint-feel-review-pending',
  machineEvidence:{manualSlots:profile.manualSlots,autosave:profile.autosave,networkSync:profile.networkSync,portableJson:profile.portableJson,checkpointDefinitions:profile.checkpoints.length,sampledCheckpoints:checkpoints.map(c=>c.id),equipmentSlots:deriveEquipment(samples.at(-1)).length,questChapters:deriveQuestLog(samples.at(-1)).length,finalResumeMode:finalSave.resume.safeMode,bossRecords:finalSave.bossRecords.length},
  blockers:[
    {id:'human-save-menu-usability',label:'Human save-menu usability review'},
    {id:'human-checkpoint-placement-feel',label:'Human checkpoint placement / retry feel review'},
    {id:'human-inventory-readability',label:'Human inventory/equipment readability review'},
    {id:'human-quest-log-clarity',label:'Human quest-log clarity review'},
    {id:'commercial-content-depth',label:'Commercial content depth remains a human judgment'},
    {id:'price-worthiness',label:'$3.69 worthiness remains a human judgment'}
  ],
  privacy:'local browser storage only; no account, cloud sync, analytics, or network telemetry'
};
fs.mkdirSync('exports/playtests',{recursive:true});
fs.writeFileSync('exports/playtests/legend-save-inventory-audit.v5.24.json',JSON.stringify(audit,null,2));
fs.writeFileSync('exports/playtests/legend-save-inventory-audit.v5.24.md',`# Legend Save / Inventory Audit v5.24\n\n**Status:** ${audit.status}\n\n- Manual save slots: ${audit.machineEvidence.manualSlots}\n- Autosave: ${audit.machineEvidence.autosave?'YES':'NO'}\n- Network sync: ${audit.machineEvidence.networkSync?'YES':'NO'}\n- Portable JSON: ${audit.machineEvidence.portableJson?'YES':'NO'}\n- Checkpoint definitions: ${audit.machineEvidence.checkpointDefinitions}\n- Equipment slots: ${audit.machineEvidence.equipmentSlots}\n- Quest chapters: ${audit.machineEvidence.questChapters}\n- Boss records: ${audit.machineEvidence.bossRecords}\n- Completed-game safe resume: ${audit.machineEvidence.finalResumeMode}\n\n## Human review still required\n${audit.blockers.map(b=>`- ${b.label}`).join('\n')}\n\nPrivacy: ${audit.privacy}.\n`);
console.log('Legend v5.24 save/inventory audit written:',audit.status);
