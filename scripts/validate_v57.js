#!/usr/bin/env node
import fs from 'node:fs';
const errors=[];
const req=[
 'docs/PIXELFORGE_VISUAL_DOCTRINE_v1.0.md','docs/SNES_STYLE_REVIEW_GATE.md','docs/V5_7_SNES_STYLE_LOCK.md',
 'scripts/validate_visual_style.js','exports/style-reviews/the-legend-of-more-bounce.visual-style.v5.7.json'
];
for(const p of req) if(!fs.existsSync(p)) errors.push(`Missing v5.7 path: ${p}`);
let pkg={}; try{pkg=JSON.parse(fs.readFileSync('package.json','utf8'))}catch(e){errors.push(`package.json invalid: ${e.message}`)}
if(pkg.version!=='5.7.0-alpha') errors.push('package.json version must be 5.7.0-alpha.');
for(const n of ['style:check','style:legend','validate:v5.7']) if(!pkg.scripts?.[n]) errors.push(`package.json missing script: ${n}`);
const html=fs.readFileSync('index.html','utf8'); if(!html.includes('v5.7')) errors.push('Studio shell must visibly identify v5.7.');
const app=fs.readFileSync('app.js','utf8'); if(!app.includes('5.7.0-snes-style-lock')) errors.push('app.js ENGINE_VERSION is not v5.7 style lock.');
let meta={}; try{meta=JSON.parse(fs.readFileSync('games/the-legend-of-more-bounce/cartridge.meta.json','utf8'))}catch(e){errors.push(`Legend metadata invalid: ${e.message}`)}
for(const [k,v] of Object.entries({visualEra:'16-bit',styleProfile:'snes-adventure',presentationTier:'expressive-pixel',environmentDensity:'layered',uiProfile:'framed-16bit',goldStandardId:'PF_GOLD_STANDARD_001'})) if(meta[k]!==v) errors.push(`Legend metadata ${k} must be ${v}.`);
if(meta.visualReview?.humanGoldStandardSignedOff!==false) errors.push('Human visual gold-standard signoff must remain pending until a named human approves it.');
let style={}; try{style=JSON.parse(fs.readFileSync('exports/style-reviews/the-legend-of-more-bounce.visual-style.v5.7.json','utf8'))}catch(e){errors.push(`Style receipt invalid: ${e.message}`)}
if(style.passed!==true) errors.push('Legend deterministic SNES source audit must pass.');
if(style.status!=='source-contract-pass-human-visual-review-pending') errors.push('Legend style status must preserve pending human visual review.');
if(errors.length){console.error('PixelForge v5.7 validation failed:'); for(const e of errors)console.error(`- ${e}`); process.exit(1)}
console.log('PixelForge v5.7 SNES Style Lock validation passed.');
