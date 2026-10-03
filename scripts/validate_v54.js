#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const errors = [];
const required = [
  'docs/V5_4_CREATOR_ONBOARDING_POLISH.md',
  'scripts/create_cartridge.js',
  'scripts/check_mobile_readability.js',
  'scripts/capture_screenshot.js',
  'assets/starter-pack/README.md',
  'assets/starter-pack/RIGHTS.md',
  'assets/starter-pack/cartridge.svg',
  'assets/starter-pack/spark.svg',
  'games/_template/src/main.jsx',
  'games/_template/src/styles.css'
];
for (const p of required) if (!fs.existsSync(p)) errors.push(`Missing v5.4 path: ${p}`);

let pkg = {};
try { pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); }
catch (error) { errors.push(`package.json invalid: ${error.message}`); }
if (pkg.version !== '5.4.0-alpha') errors.push('package.json version must be 5.4.0-alpha.');
for (const name of ['new:cartridge', 'check:mobile', 'screenshot', 'validate:v5.4']) {
  if (!pkg.scripts?.[name]) errors.push(`package.json missing script: ${name}`);
}

const html = fs.readFileSync('index.html', 'utf8');
if (!html.includes('v5.4')) errors.push('Studio shell must visibly identify v5.4.');
const app = fs.readFileSync('app.js', 'utf8');
if (!app.includes('5.4.0-creator-onboarding')) errors.push('app.js ENGINE_VERSION is not v5.4.');

if (errors.length) {
  console.error('PixelForge v5.4 validation failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('PixelForge v5.4 creator-onboarding validation passed.');
