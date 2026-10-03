import fs from 'node:fs';
const errors=[];
for(const f of ['runtime-composer.js','index.html','styles.css','app.js','pixelforge.project.schema.json']) if(!fs.existsSync(f)) errors.push(`Missing Runtime Composer path: ${f}`);
const runtime=fs.readFileSync('runtime-composer.js','utf8');
for(const token of ["composerType:'pixelforge.runtime-composer.v5.11'",'collision','camera','Export Runtime Scene','WASD']) if(!runtime.includes(token)) errors.push(`Runtime Composer missing capability marker: ${token}`);
const html=fs.readFileSync('index.html','utf8'); for(const token of ['id="runtimeComposerPanel"','id="runtimeComposerDialog"','id="openRuntimeComposerBtn"']) if(!html.includes(token)) errors.push(`index.html missing Runtime Composer mount marker: ${token}`);
const app=fs.readFileSync('app.js','utf8'); for(const token of ['buildDemoRuntimeComposer','normalizeRuntimeComposer','initRuntimeComposer','validateRuntimeComposer']) if(!app.includes(token)) errors.push(`app.js missing Runtime Composer integration: ${token}`);
const schema=JSON.parse(fs.readFileSync('pixelforge.project.schema.json','utf8')); if(schema.properties?.runtimeComposer?.properties?.composerType?.const!=='pixelforge.runtime-composer.v5.11') errors.push('Project schema missing Runtime Composer contract.');
if(errors.length){console.error('PixelForge Runtime Composer validation failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log('PixelForge v5.11 Runtime Composer validation passed.');
