import fs from 'node:fs';
const errors=[];
const required=['sprite-studio.js','docs/SPRITE_STUDIO.md','scripts/validate_sprite_studio.js','BUILD_RECEIPT_v5.9.md'];
for(const f of required) if(!fs.existsSync(f)) errors.push(`Missing v5.9 path: ${f}`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const [maj,min]=pkg.version.split('.').map(n=>parseInt(n,10)||0); if(maj<5||(maj===5&&min<9)) errors.push('package.json must retain v5.9+ Sprite Studio capability.');
for(const n of ['sprite:check','validate:v5.9']) if(!pkg.scripts?.[n]) errors.push(`package.json missing script: ${n}`);
const html=fs.readFileSync('index.html','utf8'); if(!html.includes('v5.9')||!html.includes('Sprite Studio')) errors.push('Studio shell must visibly identify v5.9 Sprite Studio.');
const app=fs.readFileSync('app.js','utf8'); for(const token of ['buildDemoSpriteStudio','normalizeSpriteStudio','initSpriteStudio']) if(!app.includes(token)) errors.push(`app.js lost v5.9 Sprite Studio capability: ${token}`);
const sprite=fs.readFileSync('sprite-studio.js','utf8');
if(!sprite.includes("studioType:'pixelforge.sprite-studio.v5.9'")) errors.push('Sprite Studio state contract missing.');
if(!sprite.includes('32×48 SNES Hero')) errors.push('SNES hero preset missing.');
if(errors.length){console.error('PixelForge v5.9 validation failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log('PixelForge v5.9 Sprite Studio capability-retention gate passed.');
