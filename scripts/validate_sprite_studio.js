import fs from 'node:fs';
import { buildDemoSpriteStudio, normalizeSpriteStudio, validateSpriteStudio } from '../sprite-studio.js';
const errors=[];
const s=normalizeSpriteStudio(buildDemoSpriteStudio());
validateSpriteStudio(s,errors);
if(s.canvas.width!==32||s.canvas.height!==48) errors.push('Default Sprite Studio canvas must be 32x48 SNES hero profile.');
if(s.frames.length!==1||s.frames[0].pixels.length!==32*48) errors.push('Default frame pixel matrix mismatch.');
const code=fs.readFileSync('sprite-studio.js','utf8');
for(const token of ['pencil','eraser','fill','eyedropper','line','rect','Onion','Export Sprite Sheet PNG','Attach to Asset Forge Slot','SHA-256','animationMap']) if(!code.includes(token)) errors.push(`sprite-studio.js missing feature marker: ${token}`);
const html=fs.readFileSync('index.html','utf8');
if(!html.includes('id="spriteStudioPanel"')) errors.push('index.html missing Sprite Studio mount.');
const app=fs.readFileSync('app.js','utf8');
for(const token of ['buildDemoSpriteStudio','normalizeSpriteStudio','validateSpriteStudio','initSpriteStudio','renderSpriteStudio']) if(!app.includes(token)) errors.push(`app.js missing Sprite Studio integration: ${token}`);
const schema=JSON.parse(fs.readFileSync('pixelforge.project.schema.json','utf8'));
if(!schema.properties?.spriteStudio) errors.push('Project schema missing optional spriteStudio contract.');
if(errors.length){console.error('Sprite Studio validation failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log('PixelForge v5.9 Sprite Studio validation passed: editor contract, SNES default, persistence schema, export and Asset Forge markers present.');
