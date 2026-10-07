#!/usr/bin/env node
import fs from 'node:fs';

const errors = [];
const required = [
  'docs/V5_28_EXTERNAL_ASSET_FORGE.md',
  'assets/external/README.md',
  'assets/external/external-asset-passport.schema.json',
  'assets/external/unreal-export-job.schema.json',
  'assets/external/examples/unreal-export-job.example.json',
  'scripts/lib/external_asset_forge.js',
  'scripts/build_external_asset_registry.js',
  'tests/external-asset-forge.test.js',
  'scripts/validate_v528.js',
];

for (const file of required) if (!fs.existsSync(file)) errors.push(`Missing v5.28 path: ${file}`);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.version !== '5.28.0-alpha') errors.push('package.json version must be 5.28.0-alpha.');
for (const name of ['asset:external', 'test:external-assets', 'validate:v5.28']) {
  if (!pkg.scripts?.[name]) errors.push(`package.json missing script: ${name}`);
}
if (!pkg.scripts?.['github:preflight']?.includes('validate:v5.28')) {
  errors.push('github:preflight must include v5.28 validation.');
}

const gitignore = fs.readFileSync('.gitignore', 'utf8');
if (!gitignore.includes('local-assets/')) errors.push('.gitignore must exclude local-assets/.');

const readme = fs.readFileSync('README.md', 'utf8');
if (!readme.includes('v5.28 External Asset Forge')) errors.push('README missing v5.28 section.');

const forbiddenSourceExtensions = new Set(['.uasset', '.umap', '.fbx', '.glb', '.gltf', '.obj', '.usd', '.usdz']);
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = `${dir}/${entry.name}`;
    return entry.isDirectory() ? walk(file) : [file];
  });
}
for (const file of walk('assets/external')) {
  const lower = file.toLowerCase();
  for (const ext of forbiddenSourceExtensions) {
    if (lower.endsWith(ext)) errors.push(`Marketplace/source interchange asset must not be committed under assets/external: ${file}`);
  }
}

if (errors.length) {
  console.error('PixelForge v5.28 validation failed:');
  errors.forEach(error => console.error('- ' + error));
  process.exit(1);
}
console.log('PixelForge v5.28 External Asset Forge validation passed.');
