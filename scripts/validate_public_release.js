import fs from 'node:fs';

const required = [
  'README.md',
  'LICENSE',
  'LICENSE-CONTENT-NOTICE.md',
  'package.json',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'docs/MAKE_YOUR_FIRST_CARTRIDGE.md',
  'docs/CARTRIDGE_SUBMISSION_RULES.md',
  'docs/PUBLIC_ROADMAP.md',
  'games/starter/README.md',
  'games/starter/package.json',
  'games/starter/src/main.jsx',
  'pocketgames/templates/pocketgame_manifest.template.json',
  'docs/RUNTIME_BRIDGE_V1.md',
  'runtime/core-v1.js',
  'runtime/bridge-v1.js',
  'runtime/conformance-v1.js',
  'runtime/host-v1.js',
  'runtime/async-host-v1.js',
  'runtime/model-policy-v1.js',
  'runtime/providers/ollama-v1.js',
  'runtime/sdk-v1.js',
  'runtime/reference-counter.js',
  'tests/runtime-core-v1.test.js',
  'tests/runtime-bridge-v1.test.js',
  'tests/runtime-host-v1.test.js',
  'tests/runtime-async-host-v1.test.js',
  'tests/runtime-model-policy-v1.test.js',
  'tests/runtime-ollama-provider-v1.test.js',
  'scripts/qualify_ollama_provider.mjs',
  'docs/RUNTIME_SHARED_CORE_V1.md',
  'docs/RUNTIME_HOST_V1.md',
  'docs/RUNTIME_ASYNC_HOST_V1.md',
  'docs/MODEL_POLICY_V1.md',
  'docs/OLLAMA_PROVIDER_V1.md'
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
