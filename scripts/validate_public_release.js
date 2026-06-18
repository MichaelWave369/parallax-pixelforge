import fs from 'node:fs';

const required = [
  'README.md',
  'package.json',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'docs/MAKE_YOUR_FIRST_CARTRIDGE.md',
  'docs/CARTRIDGE_SUBMISSION_RULES.md',
  'docs/PUBLIC_ROADMAP.md',
  'games/starter/README.md',
  'games/starter/package.json',
  'games/starter/src/main.jsx',
  'pocketgames/templates/pocketgame_manifest.template.json'
];

const missing = required.filter((path) => !fs.existsSync(path));

if (missing.length) {
  console.error('Missing files:');
  for (const path of missing) console.error(`- ${path}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.private !== false) {
  console.error('package.json must set private false.');
  process.exit(1);
}

console.log('PixelForge public release check passed.');
