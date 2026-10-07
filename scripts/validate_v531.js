#!/usr/bin/env node
import fs from 'node:fs';

const errors=[];
const required=[
  'docs/V5_31_NATIVE_WEBGL2_GLB_PREVIEW.md',
  'external-preview/index.html',
  'external-preview/preview.css',
  'external-preview/preview.js',
  'assets/external/native-3d-preview-receipt.schema.json',
  'scripts/lib/glb_preview_plan.js',
  'tests/glb-native-preview.test.js',
  'scripts/validate_v531.js',
];
for(const file of required) if(!fs.existsSync(file)) errors.push(`Missing v5.31 path: ${file}`);

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(pkg.version!=='5.31.0-alpha') errors.push('package.json version must be 5.31.0-alpha.');
for(const name of ['test:glb-preview','check:glb-preview-js','validate:v5.31']){
  if(!pkg.scripts?.[name]) errors.push(`package.json missing script: ${name}`);
}
if(!pkg.scripts?.['github:preflight']?.includes('validate:v5.31')) errors.push('github:preflight must include v5.31 validation.');

const html=fs.readFileSync('external-preview/index.html','utf8');
for(const marker of ['Native 3D Preview','id="gl"','preview.js','Download Preview Receipt']){
  if(!html.includes(marker)) errors.push(`Preview HTML missing marker: ${marker}`);
}

const preview=fs.readFileSync('external-preview/preview.js','utf8');
for(const marker of ['webgl2','PREVIEW_RENDERED_VISUAL_REVIEW_PENDING','gl.drawElements','gl.drawArrays','createImageBitmap','local-assets/staging/ASSET-000021']){
  if(!preview.includes(marker)) errors.push(`Preview renderer missing marker: ${marker}`);
}

const plan=fs.readFileSync('scripts/lib/glb_preview_plan.js','utf8');
if(!plan.includes('NATIVE_WEBGL2_STATIC_GLTF2')) errors.push('Preview plan renderer identity missing.');
if(!plan.includes('does not grant source compatibility PASS')) errors.push('Preview receipt compatibility boundary missing.');

const studio=fs.readFileSync('index.html','utf8');
if(!studio.includes('external-preview/')) errors.push('Studio shell must link to the External 3D Preview.');

if(errors.length){
  console.error('PixelForge v5.31 validation failed:');
  errors.forEach(error=>console.error('- '+error));
  process.exit(1);
}
console.log('PixelForge v5.31 Native WebGL2 GLB Preview validation passed.');
