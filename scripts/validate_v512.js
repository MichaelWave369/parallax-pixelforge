#!/usr/bin/env node
import fs from 'node:fs';
const errors=[];
const required=['docs/V5_12_LEGEND_SNES_CONTENT_PASS.md','BUILD_RECEIPT_v5.12.md','scripts/build_legend_v512_preview.js','scripts/validate_legend_v512.js','games/the-legend-of-more-bounce/assets/snes-v512/more-bounce-hero.v0.1.png','games/the-legend-of-more-bounce/assets/snes-v512/bouncehome-grove-tiles.v0.1.png','games/the-legend-of-more-bounce/runtime/bouncehome-grove.runtime-scene.v5.12.json','games/the-legend-of-more-bounce/runtime/wobble-woods.runtime-scene.v5.12.json','exports/legend-v512/content-receipt.v5.12.json'];
for(const f of required)if(!fs.existsSync(f))errors.push(`Missing v5.12 path: ${f}`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));if(!pkg.version?.match(/^5\.(1[2-9]|[2-9]\d)\./))errors.push('package.json must retain v5.12+ capability lineage.');
for(const n of ['legend:content:preview','legend:content:check','validate:v5.12'])if(!pkg.scripts?.[n])errors.push(`package.json missing script: ${n}`);
const html=fs.readFileSync('index.html','utf8');if(!html.includes('Parallax PixelForge')||!html.includes('SNES'))errors.push('Studio shell must retain visible PixelForge SNES content identity.');
const app=fs.readFileSync('app.js','utf8');if(!app.includes('const ENGINE_VERSION'))errors.push('app.js must retain an ENGINE_VERSION declaration.');
const main=fs.readFileSync('games/the-legend-of-more-bounce/src/main.jsx','utf8');for(const token of ['more-bounce-hero.v0.1.png','bouncehome-grove.map-background.png'])if(!main.includes(token))errors.push(`Legend React source missing v5.12 content binding: ${token}`);
if(errors.length){console.error('PixelForge v5.12 validation failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log('PixelForge v5.12 Legend SNES Content Pass validation passed.');
