import test from 'node:test';
import assert from 'node:assert/strict';
import {createSamplePlayableWorld,parsePlayableWorld,validatePlayableWorld} from '../src/playable-world.js';
import {safeEmbeddedWorldJson,buildOfflineHtml,offlineFilename,OFFLINE_WORLD_TOKEN,
  OFFLINE_TEMPLATE_MAX_BYTES} from '../src/offline-publisher.js';
import {makeOfflineTemplate} from './build-publisher.mjs';

const template=()=>makeOfflineTemplate('(()=>{document.getElementById("root").textContent="Ready";})()',
  '.offline{color:#fff;background:#000}');
const embedded=html=>html.match(/<script type="application\/json" id="pixelforge-embedded-world">([\s\S]*?)<\/script>/)?.[1];

test('published HTML embeds exact validated world and trusted runtime in one file',()=>{
  const world=createSamplePlayableWorld(),html=buildOfflineHtml(world,template());
  assert.ok(html.startsWith('<!doctype html>'));
  assert.equal(html.includes(OFFLINE_WORLD_TOKEN),false);
  assert.equal(html.includes('connect-src \'none\''),true);
  assert.equal(html.includes('script type="module"'),true);
  assert.deepEqual(parsePlayableWorld(embedded(html)),validatePlayableWorld(world));
});
test('untrusted world names and messages never terminate inert JSON script or open executable elements',()=>{
  const world=createSamplePlayableWorld();
  const payload='This <script>alert(1)</script> & </script><img src=x onerror=alert(1)>';
  world.title=payload;
  world.gameplay.triggers[0].message=payload;
  const html=buildOfflineHtml(world,template());
  assert.equal(html.includes(payload),false);
  assert.ok(html.includes('\\u003cscript\\u003e'));
  assert.ok(html.includes('\\u003c/script\\u003e'));
  assert.equal((html.match(/<script\b/g)||[]).length,2);
  assert.deepEqual(parsePlayableWorld(embedded(html)),validatePlayableWorld(world));
});
test('standalone filename ignores path traversal, markup and unsafe characters',()=>{
  assert.equal(offlineFilename('../My Evil <script> World?.html'),
    'my-evil-script-world-html-offline.html');
  assert.equal(offlineFilename(' '),'pixelforge-world-offline.html');
  assert.ok(offlineFilename('a'.repeat(200)).length<75);
});
test('strict data contract rejects foreign scripts, invalid privilege declarations and mismatched source rules',()=>{
  const world=createSamplePlayableWorld();
  assert.throws(()=>buildOfflineHtml({...world,script:'alert(1)'},template()),/unsafe data field/);
  const forged=structuredClone(world);
  forged.capabilities.network='ALL';
  assert.throws(()=>buildOfflineHtml(forged,template()),/privileged capabilities/);
  const mismatched=structuredClone(world);
  mismatched.gameplay.source_sha256='a'.repeat(64);
  assert.throws(()=>buildOfflineHtml(mismatched,template()),/source scene/);
});
test('template must be single slot, offline CSP and trusted entry',()=>{
  const world=createSamplePlayableWorld();
  assert.throws(()=>buildOfflineHtml(world,'missing'),/template/);
  assert.throws(()=>buildOfflineHtml(world,template().replace('connect-src \'none\'','connect-src *')),/template/);
  assert.throws(()=>buildOfflineHtml(world,template().replace(OFFLINE_WORLD_TOKEN,'')),/template/);
  assert.throws(()=>buildOfflineHtml(world,template()+OFFLINE_WORLD_TOKEN),/template/);
  assert.throws(()=>buildOfflineHtml(world,'x'.repeat(OFFLINE_TEMPLATE_MAX_BYTES+1)),/12 MB/);
});
test('builder refuses unsafe styles and blank runtime while ESM parse is handled during packaging',()=>{
  assert.throws(()=>makeOfflineTemplate('','body{}'),/empty/);
  assert.throws(()=>makeOfflineTemplate('console.log(1)','body{background:url(https://evil.test/image)}'),/external or local assets/);
  assert.throws(()=>makeOfflineTemplate('console.log(1)','body{background:url(/private/img.png)}'),/external or local assets/);
  const html=makeOfflineTemplate('const text="</script>";console.log(text)','body{color:red}');
  assert.ok(html.includes('<\\/script'));
  assert.equal((html.match(/<\/script>/g)||[]).length,2);
});
test('publishing and validation do not mutate creator world content',()=>{
  const world=createSamplePlayableWorld(),before=JSON.stringify(world);
  const html=buildOfflineHtml(world,template());
  assert.deepEqual(JSON.parse(embedded(html)),world);
  assert.equal(JSON.stringify(world),before);
});
