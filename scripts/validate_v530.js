#!/usr/bin/env node
import fs from 'node:fs';

const errors=[];
const required=[
  'docs/V5_30_UNREAL_DISCOVERY_GLB_QUALIFICATION.md',
  'assets/external/unreal-asset-discovery.schema.json',
  'assets/external/external-interchange-qualification.schema.json',
  'scripts/lib/glb_inspector.js',
  'scripts/inspect_external_glb.js',
  'scripts/qualify_external_glb.js',
  'scripts/run_unreal_discovery.py',
  'tools/unreal/discover_pixelforge_asset.py',
  'tests/external-glb-qualification.test.js',
  'scripts/validate_v530.js',
];
for(const file of required) if(!fs.existsSync(file)) errors.push(`Missing v5.30 path: ${file}`);

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const [pkgMajor,pkgMinor]=String(pkg.version||'0.0.0').split('.').map(Number);
if(pkgMajor!==5 || pkgMinor<30) errors.push('package.json must retain v5.30+ capabilities.');
for(const name of ['asset:unreal:discover','asset:glb:inspect','asset:external:qualify','test:external-glb','validate:v5.30']){
  if(!pkg.scripts?.[name]) errors.push(`package.json missing script: ${name}`);
}
if(!pkg.scripts?.['github:preflight']?.includes('validate:v5.30')) errors.push('github:preflight must include v5.30 validation.');

const discovery=fs.readFileSync('tools/unreal/discover_pixelforge_asset.py','utf8');
for(const marker of ["list_assets('/Game'","CANDIDATES_FOUND","human/operator must choose"]){
  if(!discovery.includes(marker)) errors.push(`Discovery tool missing marker: ${marker}`);
}

const inspector=fs.readFileSync('scripts/lib/glb_inspector.js','utf8');
for(const marker of ['GLB declared length','asset.version must be 2.0','primitives','extensions_required']){
  if(!inspector.includes(marker)) errors.push(`GLB inspector missing marker: ${marker}`);
}

const qualifier=fs.readFileSync('scripts/qualify_external_glb.js','utf8');
if(!qualifier.includes('INTERCHANGE_STRUCTURAL_PASS_RUNTIME_IMPORT_PENDING')) errors.push('Qualification status boundary missing.');
if(!qualifier.includes('does not prove rendering fidelity')) errors.push('Qualification truth boundary missing.');

if(errors.length){
  console.error('PixelForge v5.30 validation failed:');
  errors.forEach(error=>console.error('- '+error));
  process.exit(1);
}
console.log('PixelForge v5.30 Unreal Discovery + GLB Structural Qualification validation passed.');
