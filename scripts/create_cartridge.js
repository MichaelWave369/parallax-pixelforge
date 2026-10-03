#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const templateDir = path.join(repoRoot, 'games', '_template');

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function usage(exitCode = 0) {
  console.log(`\nPixelForge cartridge generator\n\nUsage:\n  npm run new:cartridge -- "My Tiny Game"\n  npm run new:cartridge -- "My Tiny Game" --slug my-tiny-game\n\nThe generator never overwrites an existing game folder.\n`);
  process.exit(exitCode);
}

const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) usage(0);

let titleParts = [];
let explicitSlug = '';
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--slug') {
    explicitSlug = args[i + 1] || '';
    i += 1;
    continue;
  }
  if (arg.startsWith('--slug=')) {
    explicitSlug = arg.slice('--slug='.length);
    continue;
  }
  if (arg.startsWith('--')) {
    console.error(`Unknown option: ${arg}`);
    usage(1);
  }
  titleParts.push(arg);
}

const title = titleParts.join(' ').trim();
if (!title) {
  console.error('A cartridge title is required.');
  usage(1);
}

const slug = slugify(explicitSlug || title);
if (!slug) {
  console.error('Could not create a safe slug from that title.');
  process.exit(1);
}

const targetDir = path.join(repoRoot, 'games', slug);
if (fs.existsSync(targetDir)) {
  console.error(`Refusing to overwrite existing cartridge: games/${slug}`);
  process.exit(2);
}
if (!fs.existsSync(templateDir)) {
  console.error(`Starter template missing: ${templateDir}`);
  process.exit(3);
}

fs.cpSync(templateDir, targetDir, { recursive: true, errorOnExist: true });

function replaceIn(relativePath, replacements) {
  const filePath = path.join(targetDir, relativePath);
  if (!fs.existsSync(filePath)) return;
  let body = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of replacements) body = body.replaceAll(from, to);
  fs.writeFileSync(filePath, body);
}

const packagePath = path.join(targetDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.name = `pixelforge-${slug}`;
pkg.description = `${title} — a PixelForge cartridge.`;
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

replaceIn('index.html', [['PixelForge Starter Cartridge', title]]);
replaceIn('README.md', [['# PixelForge Starter Cartridge', `# ${title}`]]);
replaceIn('src/main.jsx', [["const CARTRIDGE_TITLE = 'PixelForge Starter Cartridge';", `const CARTRIDGE_TITLE = ${JSON.stringify(title)};`]]);
replaceIn('RIGHTS.md', [['# Rights Notes — Starter Cartridge', `# Rights Notes — ${title}`]]);

const meta = {
  schema: 'pixelforge.cartridge-meta.v0.1',
  slug,
  title,
  status: 'draft',
  created_at: new Date().toISOString(),
  local_first: true,
  network_required: false,
  rights_reviewed: false,
  mobile_checked: false,
  notes: 'Generated from games/_template by PixelForge v5.8.',
  visualEra: '16-bit',
  styleProfile: 'snes-adventure',
  presentationTier: 'expressive-pixel',
  environmentDensity: 'layered',
  uiProfile: 'framed-16bit',
  audioProfile: 'snes-inspired',
  defaultTileSize: 16,
  heroSpriteTarget: '32x48',
  artDirectionStatus: 'house-default',
  assetProfile: 'asset-profile.json',
  assetPackIds: ['pf-snes-house-foundation-v1'],
  assetForgeStatus: 'asset-contract-ready-content-pending'
};
fs.writeFileSync(path.join(targetDir, 'cartridge.meta.json'), `${JSON.stringify(meta, null, 2)}\n`);


const assetProfileTemplate = path.join(repoRoot, 'assets', 'snes-house', 'profiles', 'snes-adventure.asset-profile.template.json');
if (fs.existsSync(assetProfileTemplate)) {
  const assetProfile = JSON.parse(fs.readFileSync(assetProfileTemplate, 'utf8'));
  assetProfile.cartridgeSlug = slug;
  assetProfile.cartridgeTitle = title;
  fs.writeFileSync(path.join(targetDir, 'asset-profile.json'), `${JSON.stringify(assetProfile, null, 2)}
`);
}

console.log(`Created games/${slug}`);
console.log('');
console.log('Next:');
console.log(`  cd games/${slug}`);
console.log('  npm install');
console.log('  npm run dev');
console.log('');
console.log('Then, from the repo root:');
console.log(`  npm run check:mobile -- games/${slug}`);
console.log(`  npm run asset:check -- games/${slug}`);
console.log(`  npm run asset:briefs -- games/${slug}`);
