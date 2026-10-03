#!/usr/bin/env node
import fs from 'node:fs';
const errors=[],game='games/the-legend-of-more-bounce';
const req=[`${game}/save-profile.v5.24.json`,`${game}/src/save-system.js`,'tests/legend-save-system.test.js','scripts/build_legend_v524_save_inventory.js','scripts/analyze_legend_v524.js','scripts/validate_legend_v524.js','exports/runtime/legend-v5.24-save-inventory-equipment.html','exports/playtests/legend-save-inventory-audit.v5.24.json','exports/playtests/legend-save-inventory-audit.v5.24.md'];
for(const f of req)if(!fs.existsSync(f))errors.push(`Missing v5.24 path: ${f}`);
const profile=JSON.parse(fs.readFileSync(`${game}/save-profile.v5.24.json`,'utf8'));
if(profile.saveSchema!=='pixelforge.legend-save.v5.24'||profile.schemaVersion!==1)errors.push('Save schema contract drifted.');
if(profile.manualSlots!==3||profile.autosave!==true||profile.networkSync!==false||profile.portableJson!==true)errors.push('Save slot/autosave/local-first contract invalid.');
if((profile.checkpoints||[]).length<12)errors.push('v5.24 requires at least 12 named safe checkpoints.');
const saveSrc=fs.readFileSync(`${game}/src/save-system.js`,'utf8');for(const token of ['LEGEND_SAVE_SCHEMA','checkpointForQuest','safeResumeMode','deriveInventory','deriveEquipment','deriveQuestLog','deriveBossRecords','normalizeLegendSave','writeAutosave','exportSaveFile'])if(!saveSrc.includes(token))errors.push(`Save system missing token: ${token}`);
const main=fs.readFileSync(`${game}/src/main.jsx`,'utf8');for(const token of ['SaveMenu','JournalModal','CONTINUE AUTOSAVE','SAVE SLOTS','Inventory · Equipment · Quests','3 manual slots + autosave'])if(!main.includes(token))errors.push(`React cartridge missing v5.24 token: ${token}`);
const html=fs.readFileSync('exports/runtime/legend-v5.24-save-inventory-equipment.html','utf8');for(const token of ['pixelforge.legend-save.v5.24','ADVENTURE SAVE SLOTS','INVENTORY · EQUIPMENT · QUESTS','CONTINUE','EXPORT CURRENT','IMPORT JSON','AUTOSAVE','safe checkpoint'])if(!html.includes(token))errors.push(`Standalone v5.24 missing token: ${token}`);
const audit=JSON.parse(fs.readFileSync('exports/playtests/legend-save-inventory-audit.v5.24.json','utf8'));
if(audit.status!=='machine-save-contract-pass-human-save-menu-inventory-questlog-and-checkpoint-feel-review-pending')errors.push('v5.24 audit status invalid.');
if(audit.machineEvidence?.manualSlots!==3||audit.machineEvidence?.checkpointDefinitions<12||audit.machineEvidence?.equipmentSlots<3||audit.machineEvidence?.questChapters<3||audit.machineEvidence?.bossRecords<2)errors.push('v5.24 machine evidence retention invalid.');
for(const id of ['human-save-menu-usability','human-checkpoint-placement-feel','human-inventory-readability','human-quest-log-clarity','commercial-content-depth','price-worthiness'])if(!audit.blockers.some(b=>b.id===id))errors.push(`v5.24 audit missing blocker ${id}`);
if(errors.length){console.error('Legend v5.24 Save / Inventory validation failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}console.log('Legend v5.24 Save / Inventory validation passed: persistence, safe checkpointing, inventory/equipment/journal and privacy contracts are machine-valid; human UX/value review remains pending.');
