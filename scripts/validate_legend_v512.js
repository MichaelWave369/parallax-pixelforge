#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const errors=[];
const game='games/the-legend-of-more-bounce';
const hero=`${game}/assets/snes-v512/more-bounce-hero.v0.1.png`;
const tiles=`${game}/assets/snes-v512/bouncehome-grove-tiles.v0.1.png`;
const required=[hero,tiles,`${game}/assets/snes-v512/more-bounce-hero.anim.v0.1.json`,`${game}/art/more-bounce.sprite-studio.v5.12.json`,`${game}/world/bouncehome-grove.tile-studio-seed.v5.12.json`,`${game}/runtime/bouncehome-grove.runtime-scene.v5.12.json`,`${game}/runtime/wobble-woods.runtime-scene.v5.12.json`,'exports/runtime/legend-v5.12-snes-content-preview.html'];
for(const f of required)if(!fs.existsSync(f))errors.push(`Missing Legend v5.12 content path: ${f}`);
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){errors.push(`Invalid JSON ${p}: ${e.message}`);return {}}};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function pngSize(p){const b=fs.readFileSync(p);if(b.toString('ascii',1,4)!=='PNG')return [0,0];return [b.readUInt32BE(16),b.readUInt32BE(20)];}
if(fs.existsSync(hero)){const [w,h]=pngSize(hero);if(w!==736||h!==48)errors.push(`More Bounce sheet must be 736x48, got ${w}x${h}.`)}
if(fs.existsSync(tiles)){const [w,h]=pngSize(tiles);if(w!==128||h!==16)errors.push(`Bouncehome tileset must be 128x16, got ${w}x${h}.`)}
const profile=readJson(`${game}/asset-profile.json`), heroSlot=profile.slots?.find(s=>s.id==='more-bounce-hero'), tileSlot=profile.slots?.find(s=>s.id==='bouncehome-overworld');
for(const [name,slot,file] of [['hero',heroSlot,hero],['tiles',tileSlot,tiles]]){
 if(slot?.status!=='ready')errors.push(`${name} asset slot must be ready.`);
 if(slot?.rightsStatus!=='original')errors.push(`${name} asset slot rights must be original.`);
 if(slot?.file!==file.replace(`${game}/`,''))errors.push(`${name} asset slot file binding mismatch.`);
 if(fs.existsSync(file)&&slot?.sha256!==hash(file))errors.push(`${name} asset slot SHA-256 mismatch.`);
}
const requiredSlots=(profile.slots||[]).filter(s=>s.required===true),readyRequired=requiredSlots.filter(s=>['ready','approved'].includes(s.status));
if(requiredSlots.length!==8)errors.push(`Legend must retain 8 required final-art slots, got ${requiredSlots.length}.`);
if(readyRequired.length<2)errors.push(`Legend must retain at least the v5.12 baseline of 2/8 required final-art slots ready, got ${readyRequired.length}.`);
const anim=readJson(`${game}/assets/snes-v512/more-bounce-hero.anim.v0.1.json`);if(anim.frameCount!==23||anim.frameWidth!==32||anim.frameHeight!==48)errors.push('Hero animation map must declare 23 frames at 32x48.');
for(const id of ['idle','walk','run','bounce','interact','damage','victory'])if(!anim.animations?.[id]?.frames?.length)errors.push(`Hero animation missing ${id}.`);
const tileSeed=readJson(`${game}/world/bouncehome-grove.tile-studio-seed.v5.12.json`);if(tileSeed.tiles?.length!==8)errors.push('Bouncehome v5.12 Tile Studio seed must contain 8 tiles.');if(!tileSeed.tiles?.every(t=>Array.isArray(t.pixels)&&t.pixels.some(Boolean)))errors.push('Every Bouncehome v5.12 tile must contain real pixel content.');
const grove=readJson(`${game}/runtime/bouncehome-grove.runtime-scene.v5.12.json`),woods=readJson(`${game}/runtime/wobble-woods.runtime-scene.v5.12.json`);
if(grove.runtime?.mode!=='top-down'||grove.spriteBinding?.status!=='ready'||grove.tilesetBinding?.status!=='ready')errors.push('Bouncehome v5.12 runtime must bind top-down real hero + real tiles.');
if(!grove.runtime?.transitions?.some(t=>t.toSceneId==='wobble-woods'&&t.enabled===true))errors.push('Bouncehome runtime must contain enabled Wobble Woods transition.');
if(woods.runtime?.mode!=='side-view'||!Array.isArray(woods.world?.platforms)||!woods.world.platforms.length)errors.push('Wobble Woods v5.12 must define side-view platform geometry.');
if(!['awaiting-art','ready'].includes(woods.environmentBinding?.status))errors.push('Wobble Woods environment binding must retain a valid pending-or-ready state.');
if(woods.spriteBinding?.status!=='ready')errors.push('Wobble Woods must reuse the ready More Bounce hero sheet.');
if(fs.existsSync('exports/runtime/legend-v5.12-snes-content-preview.html')){
 const html=fs.readFileSync('exports/runtime/legend-v5.12-snes-content-preview.html','utf8');
 for(const token of ['HERO READY','BOUNCEHOME TILES READY','WOBBLE ART PENDING','WOBBLE WOODS'])if(!html.includes(token))errors.push(`v5.12 standalone preview missing marker: ${token}`);
 const m=html.match(/<script>([\s\S]*?)<\/script>/);if(!m)errors.push('v5.12 preview missing inline runtime script.');else{try{new Function(m[1]);}catch(e){errors.push(`v5.12 preview JavaScript syntax error: ${e.message}`)}}
}
if(errors.length){console.error('Legend v5.12 content validation failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
const receipt={schema:'pixelforge.legend-content-receipt.v5.12',generatedAt:new Date().toISOString(),cartridge:'the-legend-of-more-bounce',status:'snes-content-pass',requiredFinalArt:{ready:readyRequired.length,total:8,pending:8-readyRequired.length},assets:{hero:{path:hero,sha256:hash(hero),dimensions:'736x48',frames:23,frameSize:'32x48',rights:'original'},bouncehomeTiles:{path:tiles,sha256:hash(tiles),dimensions:'128x16',tileCount:8,tileSize:'16x16',rights:'original'}},runtime:{bouncehome:'top-down-real-art',wobbleWoods:'side-view-layout-art-pending',transition:'bouncehome-grove -> wobble-woods',standalonePreview:'exports/runtime/legend-v5.12-snes-content-preview.html'},boundary:'The v5.12 baseline assets remain present. Later versions may legitimately promote additional art slots; human visual-gold-standard approval remains separate.'};
fs.mkdirSync('exports/legend-v512',{recursive:true});fs.writeFileSync('exports/legend-v512/content-receipt.v5.12.json',JSON.stringify(receipt,null,2)+'\n');
console.log('Legend v5.12 SNES content validation passed.');
console.log(`Required final art ready: ${readyRequired.length} / 8 (v5.12 baseline retained)`);
console.log('Top-down Bouncehome → side-view Wobble transition packet: PASS');
console.log('Receipt: exports/legend-v512/content-receipt.v5.12.json');
