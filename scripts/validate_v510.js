import fs from 'node:fs';
const errors=[];
const required=['tile-studio.js','docs/TILE_STUDIO.md','docs/V5_10_TILE_STUDIO_MAP_COMPOSER.md','scripts/validate_tile_studio.js','docs/build-receipts/BUILD_RECEIPT_v5.10.md'];
for(const f of required) if(!fs.existsSync(f)) errors.push(`Missing v5.10 path: ${f}`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const [maj,min]=pkg.version.split('.').map(n=>parseInt(n,10)||0); if(maj<5||(maj===5&&min<10)) errors.push('package.json must retain v5.10+ Tile Studio capability.');
for(const n of ['tile:check','validate:v5.10']) if(!pkg.scripts?.[n]) errors.push(`package.json missing script: ${n}`);
const html=fs.readFileSync('index.html','utf8'); if(!html.includes('v5.10')||!html.includes('Tile Studio')) errors.push('Studio shell must visibly identify v5.10 Tile Studio.');
const app=fs.readFileSync('app.js','utf8'); for(const token of ['buildDemoTileStudio','normalizeTileStudio','initTileStudio']) if(!app.includes(token)) errors.push(`app.js lost v5.10 Tile Studio capability: ${token}`);
const tile=fs.readFileSync('tile-studio.js','utf8'); if(!tile.includes("studioType:'pixelforge.tile-studio.v5.10'")) errors.push('Tile Studio state contract missing.');
if(errors.length){console.error('PixelForge v5.10 validation failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log('PixelForge v5.10 Tile Studio + Map Composer capability-retention gate passed.');
