#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const errors=[];
const game='games/the-legend-of-more-bounce';
const files={
 tiles:`${game}/assets/snes-v513/wobble-woods-tiles.v0.1.png`,
 far:`${game}/assets/snes-v513/wobble-woods-layer-far.v0.1.png`,
 mist:`${game}/assets/snes-v513/wobble-woods-layer-mist.v0.1.png`,
 near:`${game}/assets/snes-v513/wobble-woods-layer-near.v0.1.png`,
 foreground:`${game}/assets/snes-v513/wobble-woods-layer-foreground.v0.1.png`,
 stage:`${game}/assets/snes-v513/wobble-woods.stage-preview.png`,
 seed:`${game}/world/wobble-woods.tile-studio-seed.v5.13.json`,
 woods:`${game}/runtime/wobble-woods.runtime-scene.v5.13.json`,
 grove:`${game}/runtime/bouncehome-grove.runtime-scene.v5.13.json`,
 receipt:`${game}/assets/snes-v513/wobble-woods.art-receipt.v0.1.json`,
 preview:'exports/runtime/legend-v5.13-wobble-woods-art-preview.html'
};
for(const p of Object.values(files)) if(!fs.existsSync(p)) errors.push(`Missing v5.13 Wobble path: ${p}`);
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){errors.push(`Invalid JSON ${p}: ${e.message}`);return {}}};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function pngSize(p){const b=fs.readFileSync(p);if(b.toString('ascii',1,4)!=='PNG')return [0,0];return [b.readUInt32BE(16),b.readUInt32BE(20)];}
if(fs.existsSync(files.tiles)){const [w,h]=pngSize(files.tiles);if(w!==256||h!==16)errors.push(`Wobble tileset must be 256x16 (16 native 16x16 tiles), got ${w}x${h}.`)}
for(const key of ['far','mist','near','foreground']) if(fs.existsSync(files[key])){const [w,h]=pngSize(files[key]);if(w!==672||h!==180)errors.push(`${key} parallax layer must be 672x180, got ${w}x${h}.`)}
const profile=readJson(`${game}/asset-profile.json`),slot=profile.slots?.find(s=>s.id==='wobble-woods-stage');
if(slot?.status!=='ready')errors.push('wobble-woods-stage asset slot must be ready.');
if(slot?.rightsStatus!=='original')errors.push('wobble-woods-stage rights must be original.');
if(slot?.file!=='assets/snes-v513/wobble-woods-tiles.v0.1.png')errors.push('Wobble asset file binding mismatch.');
if(fs.existsSync(files.tiles)&&slot?.sha256!==hash(files.tiles))errors.push('Wobble asset SHA-256 mismatch.');
if(!Array.isArray(slot?.layerFiles)||slot.layerFiles.length!==4)errors.push('Wobble asset slot must bind exactly four parallax layer files.');
const required=(profile.slots||[]).filter(s=>s.required===true),ready=required.filter(s=>['ready','approved'].includes(s.status));
if(required.length!==8)errors.push(`Legend must retain 8 required final-art roles, got ${required.length}.`);
if(ready.length<3)errors.push(`Legend must retain at least the v5.13 baseline of 3/8 required final-art roles ready, got ${ready.length}.`);
const seed=readJson(files.seed);if(seed.tiles?.length!==16)errors.push(`Wobble Tile Studio seed must contain 16 tiles, got ${seed.tiles?.length||0}.`);
if(!seed.tiles?.every(t=>Array.isArray(t.pixels)&&t.pixels.some(Boolean)))errors.push('All 16 Wobble tiles must contain real pixel content.');
if(seed.artStatus!=='ready'||seed.rightsStatus!=='original')errors.push('Wobble Tile Studio seed must declare ready + original.');
const woods=readJson(files.woods),grove=readJson(files.grove);
if(woods.runtime?.mode!=='side-view')errors.push('Wobble v5.13 runtime must remain side-view.');
if(woods.environmentBinding?.status!=='ready')errors.push('Wobble v5.13 environment binding must be ready.');
if(woods.spriteBinding?.status!=='ready')errors.push('Wobble v5.13 must reuse the ready More Bounce hero sheet.');
if(!Array.isArray(woods.world?.platforms)||woods.world.platforms.length<8)errors.push('Wobble runtime must retain authored platform geometry.');
if(!Array.isArray(woods.world?.bouncePads)||woods.world.bouncePads.length<3)errors.push('Wobble runtime must retain bounce pads.');
if(!grove.runtime?.transitions?.some(t=>t.toSceneId==='wobble-woods'&&t.enabled===true))errors.push('Bouncehome v5.13 must retain enabled transition into Wobble Woods.');
const artReceipt=readJson(files.receipt);if(artReceipt.status!=='original-art-generated'||artReceipt.rightsStatus!=='original')errors.push('Wobble art receipt must declare original-art-generated + original rights.');
if(fs.existsSync(files.preview)){
 const html=fs.readFileSync(files.preview,'utf8');
 for(const token of ['WOBBLE ART READY','WOBBLE WOODS · ORIGINAL v5.13 ART']) if(!html.includes(token)) errors.push(`v5.13 preview missing marker: ${token}`);
 const m=html.match(/<script>([\s\S]*?)<\/script>/); if(!m)errors.push('v5.13 preview missing inline runtime script.'); else {try{new Function(m[1]);}catch(e){errors.push(`v5.13 preview JavaScript syntax error: ${e.message}`)}}
}
if(errors.length){console.error('Legend v5.13 Wobble Woods validation failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
const receipt={schema:'pixelforge.legend-content-receipt.v5.13',generatedAt:new Date().toISOString(),cartridge:'the-legend-of-more-bounce',status:'wobble-woods-original-art-pass',requiredFinalArt:{ready:ready.length,total:8,pending:8-ready.length},assets:{wobbleTiles:{path:files.tiles,sha256:hash(files.tiles),dimensions:'256x16',tileCount:16,tileSize:'16x16',rights:'original'},parallaxLayers:['far','mist','near','foreground'].map(k=>({role:k,path:files[k],sha256:hash(files[k]),dimensions:'672x180'}))},runtime:{bouncehome:'top-down-original-art',wobbleWoods:'side-view-original-art',transition:'bouncehome-grove -> wobble-woods',standalonePreview:files.preview},boundary:'The v5.13 Wobble baseline remains present. Later versions may promote Larrina and other roles; human visual-gold-standard approval remains separate.'};
fs.mkdirSync('exports/legend-v513',{recursive:true});fs.writeFileSync('exports/legend-v513/wobble-art-receipt.v5.13.json',JSON.stringify(receipt,null,2)+'\n');
console.log('Legend v5.13 Wobble Woods art validation passed.');
console.log(`Required final art ready: ${ready.length} / 8 (v5.13 baseline retained)`);
console.log('Wobble tiles: 16 native 16x16 tiles · PASS');
console.log('Parallax layers: far + mist + near + foreground · PASS');
console.log('Receipt: exports/legend-v513/wobble-art-receipt.v5.13.json');
