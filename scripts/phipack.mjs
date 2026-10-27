#!/usr/bin/env node
import fs from 'node:fs';
import { makeRuntimeScenePack, loadRuntimeScenePack, decodePack } from '../phipack/core.js';

function help() {
  console.log('Usage:\n  node scripts/phipack.mjs build <runtime-scene.json> <output.phipack> [package-id]\n  node scripts/phipack.mjs inspect <file.phipack>\n  node scripts/phipack.mjs validate <file.phipack>');
}
function main() {
  const [command, input, output, id] = process.argv.slice(2);
  if (!command || !input) { help(); process.exitCode = 2; return; }
  if (command === 'build') {
    if (!output || !output.endsWith('.phipack')) throw new Error('Output must end with .phipack');
    const scene = JSON.parse(fs.readFileSync(input, 'utf8'));
    const bytes = makeRuntimeScenePack(scene, id ? { id } : {});
    fs.writeFileSync(output, bytes, { flag: 'wx' });
    console.log('Created ' + output + ' (' + bytes.length + ' bytes, private by default)');
  } else if (command === 'inspect' || command === 'validate') {
    const bytes = new Uint8Array(fs.readFileSync(input));
    const { manifest } = decodePack(bytes);
    if (command === 'validate') loadRuntimeScenePack(bytes);
    console.log(JSON.stringify({ valid: true, manifest }, null, 2));
  } else { help(); process.exitCode = 2; }
}
try { main(); } catch (error) {
  console.error('ΦPACK: ' + error.message);
  process.exitCode = 1;
}
