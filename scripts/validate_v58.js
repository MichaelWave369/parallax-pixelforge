#!/usr/bin/env node
import fs from 'node:fs';
const errors=[];
const required=[
  'docs/ASSET_FORGE_CONTRACT_v1.0.md','docs/V5_8_SNES_ASSET_FORGE.md','assets/snes-house/asset-pack.json','assets/snes-house/RIGHTS.md',
  'assets/snes-house/palettes/pf-overworld-grove-v1.json','assets/snes-house/palettes/pf-wobble-woods-v1.json','assets/snes-house/palettes/pf-tower-interior-v1.json','assets/snes-house/palettes/pf-ui-frame-v1.json',
  'scripts/validate_asset_profile.js','scripts/build_asset_catalog.js','scripts/generate_asset_briefs.js','scripts/attach_asset.js','games/the-legend-of-more-bounce/asset-profile.json',
  'exports/asset-reviews/the-legend-of-more-bounce.asset-profile.v5.8.json','exports/assets/catalog.v5.8.json','exports/assets/the-legend-of-more-bounce/asset-briefs.v5.8.json'
];
for(const p of required) if(!fs.existsSync(p)) errors.push(`Missing v5.8 path: ${p}`);
let pkg={}; try{pkg=JSON.parse(fs.readFileSync('package.json','utf8'))}catch(e){errors.push(`package.json invalid: ${e.message}`)}
const [maj,min]=String(pkg.version||'0.0').split('.').map(Number); if(maj<5 || (maj===5&&min<8)) errors.push('package.json must retain v5.8+ capabilities.');
for(const n of ['asset:check','asset:legend','asset:briefs','asset:legend:briefs','asset:attach','asset:catalog','validate:v5.8']) if(!pkg.scripts?.[n]) errors.push(`package.json missing script: ${n}`);
const html=fs.readFileSync('index.html','utf8'); if(!html.includes('PixelForge')) errors.push('Studio shell must still identify PixelForge.');
const app=fs.readFileSync('app.js','utf8'); if(!app.includes('asset')) errors.push('app.js no longer appears to retain asset-system integration.');
let receipt={}; try{receipt=JSON.parse(fs.readFileSync('exports/asset-reviews/the-legend-of-more-bounce.asset-profile.v5.8.json','utf8'))}catch(e){errors.push(`Legend asset receipt invalid: ${e.message}`)}
if(receipt.contract_passed!==true) errors.push('Legend asset contract must pass.');
if(typeof receipt.content_ready!=='boolean') errors.push('Legend asset receipt must preserve explicit content_ready boundary.');
if(!['asset-contract-pass-content-pending','asset-content-ready-human-visual-review-pending'].includes(receipt.status)) errors.push('Legend v5.8 asset status must preserve a valid contract/content boundary.');
let profile={}; try{profile=JSON.parse(fs.readFileSync('games/the-legend-of-more-bounce/asset-profile.json','utf8'))}catch(e){errors.push(`Legend asset profile invalid: ${e.message}`)}
for(const id of ['more-bounce-hero','larrina-character','bouncehome-overworld','wobble-woods-stage','larrina-tower-interior','shared-ui-frames','bounce-effects']) if(!profile.slots?.some(s=>s.id===id&&s.required===true)) errors.push(`Legend asset profile missing required slot ${id}.`);
if(errors.length){console.error('PixelForge v5.8 validation failed:'); for(const e of errors) console.error(`- ${e}`); process.exit(1)}
console.log('PixelForge v5.8 SNES Asset Forge capability-retention validation passed.');
