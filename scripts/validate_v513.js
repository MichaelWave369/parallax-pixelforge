#!/usr/bin/env node
import fs from 'node:fs';
const errors=[];
const required=[
 'docs/V5_13_WOBBLE_WOODS_ART_PASS.md','docs/build-receipts/BUILD_RECEIPT_v5.13.md','scripts/build_legend_v513_preview.js','scripts/validate_legend_v513.js','scripts/validate_v513.js',
 'games/the-legend-of-more-bounce/assets/snes-v513/wobble-woods-tiles.v0.1.png','games/the-legend-of-more-bounce/assets/snes-v513/wobble-woods-layer-far.v0.1.png','games/the-legend-of-more-bounce/assets/snes-v513/wobble-woods-layer-mist.v0.1.png','games/the-legend-of-more-bounce/assets/snes-v513/wobble-woods-layer-near.v0.1.png','games/the-legend-of-more-bounce/assets/snes-v513/wobble-woods-layer-foreground.v0.1.png',
 'games/the-legend-of-more-bounce/world/wobble-woods.tile-studio-seed.v5.13.json','games/the-legend-of-more-bounce/runtime/bouncehome-grove.runtime-scene.v5.13.json','games/the-legend-of-more-bounce/runtime/wobble-woods.runtime-scene.v5.13.json','exports/legend-v513/wobble-art-receipt.v5.13.json'
];
for(const f of required)if(!fs.existsSync(f))errors.push(`Missing v5.13 path: ${f}`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));if(!pkg.version?.match(/^5\.(1[3-9]|[2-9]\d)\./))errors.push('package.json must retain v5.13+ capability lineage.');
for(const n of ['legend:wobble:preview','legend:wobble:check','validate:v5.13'])if(!pkg.scripts?.[n])errors.push(`package.json missing script: ${n}`);
const html=fs.readFileSync('index.html','utf8');if(!html.includes('Parallax PixelForge')||!html.includes('SNES'))errors.push('Studio shell must retain PixelForge SNES identity.');
const app=fs.readFileSync('app.js','utf8');if(!app.includes('const ENGINE_VERSION'))errors.push('app.js must retain ENGINE_VERSION.');
const main=fs.readFileSync('games/the-legend-of-more-bounce/src/main.jsx','utf8');for(const token of ['wobble-woods.stage-base.png','wobble-woods-tiles.v0.1.png','wobble-art-credit'])if(!main.includes(token))errors.push(`Legend React source missing v5.13 Wobble binding: ${token}`);
const profile=JSON.parse(fs.readFileSync('games/the-legend-of-more-bounce/asset-profile.json','utf8')),ready=profile.slots.filter(s=>s.required&&['ready','approved'].includes(s.status));if(ready.length<3)errors.push(`v5.13 capability baseline requires at least 3/8 ready, got ${ready.length}/8.`);
if(errors.length){console.error('PixelForge v5.13 validation failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log('PixelForge v5.13 Wobble Woods Art Pass validation passed.');
