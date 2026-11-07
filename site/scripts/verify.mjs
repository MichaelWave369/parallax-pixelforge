import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const out=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../dist');
async function mustExist(relative) {
  const f=path.join(out,relative);
  assert.ok((await stat(f)).isFile(),'Missing published file '+relative);
  return readFile(f,'utf8');
}
const index=await mustExist('index.html');
assert.match(index,/\/parallax-pixelforge\/assets\/index-[^" ]+\.js/,'Vite subpath bundle URL missing');
assert.match(index,/<div id="root"><\/div>/,'React mount point missing');
const legacy=await mustExist('studio/index.html');
assert.match(legacy,/<base href="\.\.\/"\s*\/>/,'Legacy Studio base reference missing');
assert.match(legacy,/app\.js/);
await mustExist('app.js');
await mustExist('styles.css');
await mustExist('sprite-studio.js');
await mustExist('tile-studio.js');
await mustExist('runtime-composer.js');
await mustExist('layer-studio/index.html');
await mustExist('layer-studio/engine.js');
await mustExist('layer-studio/studio.js');
await mustExist('layer-studio/studio.css');
await mustExist('vr-studio/index.html');
await mustExist('vr-studio/studio.js');
await mustExist('vr-studio/renderer.js');
await mustExist('external-preview/index.html');
await mustExist('external-preview/preview.js');
await mustExist('scripts/lib/glb_preview_plan.js');
await mustExist('.nojekyll');
const publisher=await mustExist('publisher-template.html');
assert.match(publisher,/<!doctype html>/i,'Missing offline HTML shell');
assert.match(publisher,/<script type="application\/json" id="pixelforge-embedded-world">__PIXELFORGE_WORLD_JSON__<\/script>/,
  'Missing inert world-data publishing slot');
assert.match(publisher,/connect-src 'none'/,'Offline player must disable network access');
assert.match(publisher,/script-src 'unsafe-inline' 'wasm-unsafe-eval'/,
  'Offline player should allow local WASM but not arbitrary remote scripts');
assert.match(publisher,/<script type="module">/,'Offline player module runtime not inlined');
assert.ok(Buffer.byteLength(publisher,'utf8')<=12_000_000,'Offline HTML template exceeds 12 MB cap');
assert.doesNotMatch(publisher,/<script[^>]+src=/i,'Offline player may not import external scripts');
assert.doesNotMatch(publisher,/<link[^>]+stylesheet/i,'Offline player may not import external CSS');
for(const banned of ['local-assets','node_modules','.github','.env','site']) {
  try {await stat(path.join(out,banned));throw new Error('Private/developer path in published artifact: '+banned);}
  catch(error){if(error.code!=='ENOENT')throw error;}
}
console.log('PASS PixelForge Pages: React at root, legacy Studio, VR/GLB routes, correct base, no local vault.');
