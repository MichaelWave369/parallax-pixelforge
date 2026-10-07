#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  buildExternalAssetRegistry,
  buildUnrealExportJob,
} from './lib/external_asset_forge.js';

function usage() {
  console.log('Usage: npm run asset:external -- /path/to/governed-records.json [--record ASSET-000001] [--mode NATIVE_3D] [--format GLB] [--out exports/external-assets]');
  process.exit(2);
}

const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) usage();

const sourcePath = path.resolve(args[0]);
let recordId = '';
let mode = '';
let format = '';
let outArg = 'exports/external-assets';

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  const next = () => args[++i] || '';
  if (arg === '--record') recordId = next();
  else if (arg.startsWith('--record=')) recordId = arg.slice(9);
  else if (arg === '--mode') mode = next();
  else if (arg.startsWith('--mode=')) mode = arg.slice(7);
  else if (arg === '--format') format = next();
  else if (arg.startsWith('--format=')) format = arg.slice(9);
  else if (arg === '--out') outArg = next();
  else if (arg.startsWith('--out=')) outArg = arg.slice(6);
  else usage();
}

if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
  console.error(`Governed record file not found: ${args[0]}`);
  process.exit(2);
}

let records;
try {
  records = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
} catch (error) {
  console.error(`Could not parse governed record JSON: ${error.message}`);
  process.exit(2);
}

const sourceBytes = fs.readFileSync(sourcePath);
const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const registry = buildExternalAssetRegistry(records, {
  sourceLabel: path.basename(sourcePath),
  sourceSha256,
});

const root = process.cwd();
const outDir = path.resolve(root, outArg);
fs.mkdirSync(outDir, { recursive: true });

const registryPath = path.join(outDir, 'registry.v5.28.json');
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');

const laneLines = Object.entries(registry.lane_counts)
  .map(([lane, count]) => `- **${lane}**: ${count}`)
  .join('\n');
const markdown = `# PixelForge External Asset Registry v5.28

- Records: **${registry.record_count}**
- Qualified for use: **${registry.qualified_count}**
- Source SHA-256: \`${sourceSha256}\`

## Routing lanes

${laneLines}

> ${registry.boundary}
`;
fs.writeFileSync(path.join(outDir, 'registry.v5.28.md'), markdown);

if (recordId) {
  const passport = registry.passports.find(item => item.record_id === recordId);
  if (!passport) {
    console.error(`Unknown record id: ${recordId}`);
    process.exit(3);
  }
  const job = buildUnrealExportJob(passport, {
    ...(mode ? { mode } : {}),
    ...(format ? { format } : {}),
  });
  const jobPath = path.join(outDir, `${recordId}.unreal-export-job.v1.json`);
  fs.writeFileSync(jobPath, JSON.stringify(job, null, 2) + '\n');
  console.log(`Export job: ${path.relative(root, jobPath)}`);
}

console.log(`External asset registry: ${registry.record_count} record(s)`);
console.log(`PORTABLE=${registry.lane_counts.PORTABLE} BAKEABLE=${registry.lane_counts.BAKEABLE} REIMPLEMENT=${registry.lane_counts.REIMPLEMENT}`);
console.log(`Registry: ${path.relative(root, registryPath)}`);
