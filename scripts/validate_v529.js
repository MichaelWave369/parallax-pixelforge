#!/usr/bin/env node
import fs from 'node:fs';

const errors=[];
const required=[
  'docs/V5_29_UNREAL_EXPORT_EXECUTOR.md',
  'assets/external/unreal-export-job-v2.schema.json',
  'assets/external/unreal-export-receipt.schema.json',
  'scripts/lib/unreal_export_job.js',
  'scripts/lib/unreal_export_receipt.js',
  'scripts/bind_unreal_export_job.js',
  'scripts/verify_unreal_export_receipt.js',
  'scripts/run_unreal_export.py',
  'tools/unreal/export_pixelforge_asset.py',
  'tests/unreal-export-executor.test.js',
  'scripts/validate_v529.js',
];
for(const file of required) if(!fs.existsSync(file)) errors.push(`Missing v5.29 path: ${file}`);

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(pkg.version!=='5.29.0-alpha') errors.push('package.json version must be 5.29.0-alpha.');
for(const name of ['asset:unreal:bind','asset:unreal:run','asset:unreal:verify','test:unreal-export','validate:v5.29']){
  if(!pkg.scripts?.[name]) errors.push(`package.json missing script: ${name}`);
}
if(!pkg.scripts?.['github:preflight']?.includes('validate:v5.29')) errors.push('github:preflight must include v5.29 validation.');

const draft=fs.readFileSync('scripts/lib/external_asset_forge.js','utf8');
if(!draft.includes("'GLTFExporter'")) errors.push('v5.28 draft jobs must declare GLTFExporter for GLB/GLTF.');

const executor=fs.readFileSync('tools/unreal/export_pixelforge_asset.py','utf8');
for(const marker of ['PIXELFORGE_UNREAL_EXPORT_JOB','GLTFExporter.export_to_gltf','EXPORT_PASS_AWAITING_PIXELFORGE_VERIFICATION','Refusing to overwrite existing export']){
  if(!executor.includes(marker)) errors.push(`Unreal executor missing marker: ${marker}`);
}

const verifier=fs.readFileSync('scripts/lib/unreal_export_receipt.js','utf8');
if(!verifier.includes('EXPORT_VERIFIED_IMPORT_PENDING')) errors.push('Receipt verifier must retain import-pending boundary.');
if(!verifier.includes('does not grant source compatibility PASS')) errors.push('Receipt verifier must preserve compatibility boundary.');

if(errors.length){
  console.error('PixelForge v5.29 validation failed:');
  errors.forEach(error=>console.error('- '+error));
  process.exit(1);
}
console.log('PixelForge v5.29 Unreal Export Executor validation passed.');
