#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
let ts=null;try{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}catch{};
const errors=[],game='games/the-legend-of-more-bounce';
const req=[
 `${game}/adventure/chapter-four-stormglass-coast.v5.26.json`,`${game}/save-profile.v5.26.json`,`${game}/travel-profile.v5.26.json`,
 `${game}/assets/snes-v526/sable-current-npc.v0.1.png`,`${game}/assets/snes-v526/stormglass-items.v0.1.png`,`${game}/assets/snes-v526/stormglass-coast.map.v0.1.png`,`${game}/assets/snes-v526/stormglass-cliffs.stage.v0.1.png`,`${game}/assets/snes-v526/tide-engine-room.v0.1.png`,`${game}/assets/snes-v526/undertow-bell.v0.1.png`,`${game}/assets/snes-v526/undertow-bell-arena.v0.1.png`,`${game}/assets/snes-v526/legend-world-map.v0.2.png`,`${game}/assets/snes-v526/stormglass-coast.art-receipt.v0.1.json`,
 `${game}/assets/audio-v526/stormglass-coast-audio.v0.1.json`,`${game}/assets/audio-v526/stormglass-coast-audio.rights-receipt.v0.1.json`,
 `${game}/runtime/stormglass-coast.runtime-scene.v5.26.json`,`${game}/runtime/stormglass-cliffs.runtime-scene.v5.26.json`,`${game}/runtime/tide-engine.runtime-scene.v5.26.json`,`${game}/runtime/undertow-bell.runtime-scene.v5.26.json`,
 'tools/generate_stormglass_coast_v526.py','scripts/build_legend_v526_chapter4.js','scripts/analyze_legend_v526.js','scripts/validate_legend_v526.js','exports/runtime/legend-v5.26-stormglass-coast-chapter-four.html','exports/playtests/legend-stormglass-coast-audit.v5.26.json'
];
for(const f of req)if(!fs.existsSync(f))errors.push(`Missing v5.26 path: ${f}`);
const pngDims=(p)=>{const b=fs.readFileSync(p);return [b.readUInt32BE(16),b.readUInt32BE(20)]};
const expectDims={
 'sable-current-npc.v0.1.png':[96,32],'stormglass-items.v0.1.png':[80,16],'stormglass-coast.map.v0.1.png':[640,360],'stormglass-cliffs.stage.v0.1.png':[672,180],'tide-engine-room.v0.1.png':[320,180],'undertow-bell.v0.1.png':[512,64],'undertow-bell-arena.v0.1.png':[672,180],'legend-world-map.v0.2.png':[320,180]
};
for(const [f,d] of Object.entries(expectDims)){const p=`${game}/assets/snes-v526/${f}`;if(fs.existsSync(p)){const got=pngDims(p);if(got[0]!==d[0]||got[1]!==d[1])errors.push(`${f} dimensions ${got.join('x')} != ${d.join('x')}`)}}
if(fs.existsSync(`${game}/assets/snes-v526/stormglass-coast.art-receipt.v0.1.json`)){
 const receipt=JSON.parse(fs.readFileSync(`${game}/assets/snes-v526/stormglass-coast.art-receipt.v0.1.json`,'utf8'));if(receipt.rightsStatus!=='original')errors.push('Chapter Four art rights must be original.');for(const a of receipt.assets||[]){const p=`${game}/assets/snes-v526/${a.file}`;if(!fs.existsSync(p)){errors.push(`Receipt asset missing: ${a.file}`);continue;}const h=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');if(h!==a.sha256)errors.push(`Art hash mismatch: ${a.file}`)}
}
if(fs.existsSync(`${game}/assets/audio-v526/stormglass-coast-audio.v0.1.json`)){
 const a=JSON.parse(fs.readFileSync(`${game}/assets/audio-v526/stormglass-coast-audio.v0.1.json`,'utf8'));if(a.cues?.length!==6)errors.push('v5.26 requires exactly six new Chapter Four audio cues.');for(const c of a.cues||[]){const p=`${game}/assets/audio-v526/${c.file}`;if(!fs.existsSync(p)){errors.push(`Audio missing: ${c.file}`);continue;}const h=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');if(h!==c.sha256)errors.push(`Audio hash mismatch: ${c.file}`)}
}
const chapter=JSON.parse(fs.readFileSync(`${game}/adventure/chapter-four-stormglass-coast.v5.26.json`,'utf8'));if(chapter.chapter!==4||chapter.collectible?.required!==3||chapter.upgrade?.id!=='galeMantle'||chapter.sideView?.dashGaps!==3||chapter.firstPersonPuzzle?.steps!==4||chapter.boss?.health!==5||chapter.boss?.reward!=='stormglassCompass')errors.push('Chapter Four progression contract invalid.');
const save=JSON.parse(fs.readFileSync(`${game}/save-profile.v5.26.json`,'utf8'));if(save.saveSchema!=='pixelforge.legend-save.v5.26'||save.schemaVersion!==3||!save.migrationPolicy.includes('v5.24-v5.25'))errors.push('v5.26 save/migration profile invalid.');
const travel=JSON.parse(fs.readFileSync(`${game}/travel-profile.v5.26.json`,'utf8'));if(travel.landmarks?.length!==5||!travel.landmarks.some(x=>x.id==='stormglass-lighthouse')||travel.networkSync!==false)errors.push('v5.26 travel network must contain five local-only landmarks including Stormglass Lighthouse.');
const main=fs.readFileSync(`${game}/src/main.jsx`,'utf8');for(const token of ['StormglassCoast','StormglassCliffs','TideEngine','UndertowBellBoss','Gale Mantle','Stormglass Compass'])if(!main.includes(token))errors.push(`React cartridge missing v5.26 token: ${token}`);
if(ts){const transpiled=ts.transpileModule(main,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true,fileName:'main.jsx'});for(const d of transpiled.diagnostics||[])if(d.category===ts.DiagnosticCategory.Error)errors.push('React JSX/TS syntax diagnostic: '+ts.flattenDiagnosticMessageText(d.messageText,' '));}
const html=fs.readFileSync('exports/runtime/legend-v5.26-stormglass-coast-chapter-four.html','utf8');for(const token of ['CHAPTER IV · STORMGLASS COAST','AIR DASH','TIDE · WIND · LIGHT · BELL','THE UNDERTOW BELL','pixelforge.legend-save.v5.26','pixelforge.legend-save.v5.25','stormglass-lighthouse'])if(!html.includes(token))errors.push(`Standalone v5.26 missing token: ${token}`);
const script=(html.match(/<script>([\s\S]*)<\/script>/)||[])[1];if(!script)errors.push('Standalone script block missing.');else{try{new vm.Script(script)}catch(e){errors.push('Standalone JavaScript syntax error: '+e.message)}}
const audit=JSON.parse(fs.readFileSync('exports/playtests/legend-stormglass-coast-audit.v5.26.json','utf8'));if(audit.status!=='machine-chapter-four-contract-pass-human-air-dash-cliff-readability-puzzle-boss-pacing-and-commercial-depth-review-pending')errors.push('v5.26 audit status invalid.');if(audit.machineEvidence?.minimumAuthoredInteractionBeats!==24||audit.machineEvidence?.travelLandmarks!==5||audit.machineEvidence?.audioCues!==6)errors.push('v5.26 audit machine evidence invalid.');
for(const id of ['human-air-dash-feel','human-cliff-readability','human-tide-puzzle-clarity','human-undertow-boss-fairness','human-chapter-four-pacing','commercial-content-depth','price-worthiness'])if(!audit.blockers.some(b=>b.id===id))errors.push(`v5.26 audit missing blocker ${id}`);
if(errors.length){console.error('Legend v5.26 Stormglass Coast validation failed:');errors.forEach(e=>console.error('- '+e));process.exit(1)}console.log('Legend v5.26 Stormglass Coast validation passed: assets, audio, save migration, five-point travel network, Gale Mantle traversal, Tide Engine puzzle, Undertow Bell boss, and human-review boundaries are coherent.');
