import fs from 'node:fs';
const errors=[];
const required=['runtime-composer.js','docs/RUNTIME_COMPOSER.md','docs/V5_11_RUNTIME_COMPOSER.md','scripts/validate_runtime_composer.js','scripts/build_runtime_preview.js','games/the-legend-of-more-bounce/runtime/bouncehome-grove.runtime-scene.v5.11.json','docs/build-receipts/BUILD_RECEIPT_v5.11.md'];
for(const f of required)if(!fs.existsSync(f))errors.push(`Missing v5.11 path: ${f}`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));const [maj,min]=String(pkg.version||'0.0').split('.').map(n=>parseInt(n,10)||0);if(maj<5||(maj===5&&min<11))errors.push('package.json must retain v5.11+ Runtime Composer capability.');
for(const n of ['runtime:check','validate:v5.11'])if(!pkg.scripts?.[n])errors.push(`package.json missing script: ${n}`);
const html=fs.readFileSync('index.html','utf8');if(!html.includes('Runtime Composer'))errors.push('Studio shell lost Runtime Composer UI.');
const app=fs.readFileSync('app.js','utf8');for(const token of ['initRuntimeComposer','normalizeRuntimeComposer','buildDemoRuntimeComposer'])if(!app.includes(token))errors.push(`app.js lost v5.11 Runtime Composer capability: ${token}`);
const runtime=fs.readFileSync('runtime-composer.js','utf8');if(!runtime.includes("composerType:'pixelforge.runtime-composer.v5.11'"))errors.push('Runtime Composer state contract missing.');
if(errors.length){console.error('PixelForge v5.11 capability-retention validation failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log('PixelForge v5.11 Runtime Composer capability-retention gate passed.');
