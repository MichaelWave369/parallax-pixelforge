#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const errors=[]; const game='games/the-legend-of-more-bounce';
const files={
  sheet:`${game}/assets/snes-v517/bounce-effects.v0.1.png`,
  map:`${game}/assets/snes-v517/bounce-effects.anim.v0.1.json`,
  previewImage:`${game}/assets/snes-v517/bounce-effects.preview.png`,
  receipt:`${game}/assets/snes-v517/bounce-effects.art-receipt.v0.1.json`,
  seed:`${game}/art/bounce-effects.sprite-studio.v5.17.json`,
  woods:`${game}/runtime/wobble-woods.runtime-scene.v5.17.json`,
  tower:`${game}/runtime/larrina-tower.runtime-scene.v5.17.json`,
  preview:'exports/runtime/legend-v5.17-bounce-effects-preview.html'
};
for(const f of Object.values(files)) if(!fs.existsSync(f)) errors.push(`Missing v5.17 effects path: ${f}`);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')); const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function pngSize(p){const b=fs.readFileSync(p);if(b.toString('ascii',1,4)!=='PNG')return[0,0];return[b.readUInt32BE(16),b.readUInt32BE(20)]}
if(fs.existsSync(files.sheet)){const[w,h]=pngSize(files.sheet);if(w!==640||h!==32)errors.push(`Effects sheet must be 640x32 (20 × 32x32), got ${w}x${h}.`)}
const map=read(files.map);if(map.frameWidth!==32||map.frameHeight!==32||map.frameCount!==20)errors.push('Effects animation map must declare 20 native 32x32 frames.');
const expected={"bounce-impact":4,"rune-pickup":4,"gate-open":5,"sparkle":4,"hit":3};
for(const [name,count] of Object.entries(expected)){const a=map.animations?.[name];if(!a)errors.push(`Missing effect animation: ${name}`);else if(a.frames?.length!==count)errors.push(`${name} must contain ${count} frames.`)}
const profile=read(`${game}/asset-profile.json`),slot=profile.slots?.find(s=>s.id==='bounce-effects');
if(slot?.status!=='ready'||slot?.rightsStatus!=='original')errors.push('Bounce effects slot must be ready with original rights.');
if(slot?.file!=='assets/snes-v517/bounce-effects.v0.1.png')errors.push('Bounce effects file binding mismatch.');
if(fs.existsSync(files.sheet)&&slot?.sha256!==hash(files.sheet))errors.push('Bounce effects SHA mismatch.');
if(slot?.frameCount!==20||slot?.frameSize!=='32x32')errors.push('Bounce effects slot must declare 20 × 32x32 frames.');
const required=(profile.slots||[]).filter(s=>s.required===true),ready=required.filter(s=>['ready','approved'].includes(s.status));
if(required.length!==8)errors.push(`Legend must retain 8 required final-art roles, got ${required.length}.`);if(ready.length!==8)errors.push(`Legend v5.17 must have all 8/8 required final-art roles ready, got ${ready.length}/8.`);
for(const runtimePath of [files.woods,files.tower]){const r=read(runtimePath);if(r.effectsBinding?.status!=='ready'||r.effectsBinding?.countsAsFinalArt!==true)errors.push(`${runtimePath} must bind effects as ready final art.`);if(fs.existsSync(files.sheet)&&r.effectsBinding?.sha256!==hash(files.sheet))errors.push(`${runtimePath} effects SHA mismatch.`)}
const woods=read(files.woods);for(const trigger of ['bounce-impact','rune-pickup','gate-open','sparkle','hit'])if(!woods.effectsBinding?.triggers?.[trigger])errors.push(`Wobble runtime missing effect trigger: ${trigger}`);
const receipt=read(files.receipt);if(receipt.status!=='ready'||receipt.rightsStatus!=='original'||receipt.countsAsFinalArt!==true)errors.push('Effects art receipt must declare ready + original + final art.');if(fs.existsSync(files.sheet)&&receipt.sha256!==hash(files.sheet))errors.push('Effects receipt sheet SHA mismatch.');if(fs.existsSync(files.map)&&receipt.animationMapSha256!==hash(files.map))errors.push('Effects receipt animation-map SHA mismatch.');
const seed=read(files.seed);if(seed.frameCount!==20||seed.assetSlotId!=='bounce-effects'||seed.artStatus!=='ready')errors.push('Sprite Studio effects seed must bind 20 ready frames to bounce-effects.');
if(fs.existsSync(files.preview)){const html=fs.readFileSync(files.preview,'utf8');for(const token of ['EFFECTS READY','FINAL ART 8/8','HUMAN REVIEW PENDING','ORIGINAL ART + EFFECTS'])if(!html.includes(token))errors.push(`v5.17 preview missing marker: ${token}`);const m=html.match(/<script>([\s\S]*?)<\/script>/);if(!m)errors.push('v5.17 preview missing inline runtime script.');else{try{new Function(m[1])}catch(e){errors.push(`v5.17 preview JavaScript syntax error: ${e.message}`)}}}
const main=fs.readFileSync(`${game}/src/main.jsx`,'utf8');for(const token of ['bounce-effects.v0.1.png','EffectSprite','ORIGINAL WOBBLE WOODS + EFFECTS'])if(!main.includes(token))errors.push(`Legend React source lost v5.17 effects capability: ${token}`);
if(errors.length){console.error('Legend v5.17 Bounce Effects validation failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
const out={schema:'pixelforge.legend-content-receipt.v5.17',generatedAt:new Date().toISOString(),cartridge:'the-legend-of-more-bounce',status:'all-required-machine-art-ready',requiredFinalArt:{ready:8,total:8,pending:0},assets:{effects:{path:files.sheet,sha256:hash(files.sheet),dimensions:'640x32',frameSize:'32x32',frames:20,states:expected,rights:'original'}},runtime:{wobble:'all-five-effects-trigger-bound',tower:'sparkle-and-transition-effects-bound',standalonePreview:files.preview},boundary:'All eight required final-art roles are machine-ready. Human visual-gold-standard approval, fun/value playtest, store-art signoff, and physical-device QA remain separate gates.'};fs.mkdirSync('exports/legend-v517',{recursive:true});fs.writeFileSync('exports/legend-v517/effects-art-receipt.v5.17.json',JSON.stringify(out,null,2)+'\n');
console.log('Legend v5.17 Bounce Effects validation passed.');console.log('Required final art ready: 8 / 8');console.log('Effects sheet: 20 × 32x32 · PASS');console.log('Runtime effect triggers: 5 / 5 · PASS');console.log('Human visual review: PENDING');
