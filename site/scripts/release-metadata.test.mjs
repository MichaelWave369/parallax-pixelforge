import test from 'node:test';
import assert from 'node:assert/strict';
import {createSamplePlayableWorld,parsePlayableWorld} from '../src/playable-world.js';
import {
  RELEASE_FORMAT,RELEASE_TOKEN,defaultReleaseMetadata,validateReleaseMetadata,
  resolveReleaseMetadata,safeEmbeddedReleaseJson,RELEASE_MAX_BYTES
} from '../src/release-metadata.js';
import {buildOfflineHtml,OFFLINE_WORLD_TOKEN,offlineFilename} from '../src/offline-publisher.js';
import {makeOfflineTemplate} from './build-publisher.mjs';

const template=()=>makeOfflineTemplate('(()=>{document.getElementById("root").textContent="Offline";})()','body{background:#111}');
function extract(html,id){
  const expression=new RegExp('<script type="application/json" id="'+id+'">([\\s\\S]*?)<\\/script>');
  return expression.exec(html)?.[1];
}
test('release identity stays independent from original playable world contract',()=>{
  const world=createSamplePlayableWorld(),before=JSON.stringify(world);
  const release=defaultReleaseMetadata(world.title);
  assert.equal(release.format,RELEASE_FORMAT);
  assert.equal(release.title,world.title);
  const custom=validateReleaseMetadata({...release,title:'A Different Game',creator:'Phi369 Labs',
    version:'2.1.0-beta',accent:'#ABCDEF'});
  assert.equal(custom.accent,'#abcdef');
  const html=buildOfflineHtml(world,template(),custom);
  assert.equal(html.includes(OFFLINE_WORLD_TOKEN),false);
  assert.equal(html.includes(RELEASE_TOKEN),false);
  assert.deepEqual(JSON.parse(extract(html,'pixelforge-embedded-release')),custom);
  assert.deepEqual(parsePlayableWorld(extract(html,'pixelforge-embedded-world')),world);
  assert.equal(JSON.stringify(world),before);
  assert.equal(offlineFilename(custom.title),'a-different-game-offline.html');
});
test('title text with HTML markup, scripts and ampersands remains inert release JSON',()=>{
  const world=createSamplePlayableWorld(),release=defaultReleaseMetadata(world.title);
  const malicious='My </script><script>alert(1)</script> & <img src=x onerror=alert(1)>';
  release.title=malicious;release.creator='Creator <svg/onload=alert(1)>';
  const embedded=safeEmbeddedReleaseJson(release,world.title);
  assert.equal(embedded.includes('</script>'),false);
  assert.ok(embedded.includes('\\u003c/script\\u003e'));
  assert.equal(JSON.parse(embedded).title,malicious);
  const html=buildOfflineHtml(world,template(),release);
  assert.equal((html.match(/<script\b/g)||[]).length,5);
  assert.deepEqual(JSON.parse(extract(html,'pixelforge-embedded-release')),release);
});
test('defaults are safe for Rung 13 worlds and empty caller customization',()=>{
  const world=createSamplePlayableWorld();
  assert.deepEqual(resolveReleaseMetadata(null,world.title),defaultReleaseMetadata(world.title));
  assert.deepEqual(resolveReleaseMetadata(undefined,world.title),defaultReleaseMetadata(world.title));
  const html=buildOfflineHtml(world,template());
  assert.deepEqual(JSON.parse(extract(html,'pixelforge-embedded-release')),defaultReleaseMetadata(world.title));
});
test('strict release schema rejects executable fields, wrong version and unexpected privileges',()=>{
  const defaultRelease=defaultReleaseMetadata('Test');
  assert.throws(()=>validateReleaseMetadata({...defaultRelease,script:'alert(1)'}),/unsupported/);
  assert.throws(()=>validateReleaseMetadata({...defaultRelease,network:'enabled'}),/unsupported/);
  assert.throws(()=>validateReleaseMetadata({...defaultRelease,version:'latest'}),/semantic version/);
  assert.throws(()=>validateReleaseMetadata({...defaultRelease,version:'1.0.0+build'}),/semantic version/);
  assert.throws(()=>validateReleaseMetadata({...defaultRelease,format:'other'}),/Unsupported/);
  assert.throws(()=>validateReleaseMetadata({...defaultRelease,accent:'red'}),/hex color/);
  assert.throws(()=>validateReleaseMetadata({...defaultRelease,tagline:''}),/nonempty/);
  assert.throws(()=>validateReleaseMetadata({...defaultRelease,creator:' X\nY '}),/control/);
  assert.throws(()=>validateReleaseMetadata({...defaultRelease,title:'x'.repeat(101)}),/bounded/);
  assert.throws(()=>validateReleaseMetadata({...defaultRelease,tagline:'x'.repeat(161)}),/bounded/);
});
test('metadata and world size stay independently bounded',()=>{
  const defaultRelease=defaultReleaseMetadata('Course');
  assert.ok(new TextEncoder().encode(safeEmbeddedReleaseJson(defaultRelease)).length<RELEASE_MAX_BYTES);
  const long={...defaultRelease,creator:'x'.repeat(81)};
  assert.throws(()=>safeEmbeddedReleaseJson(long),/bounded/);
  const html=buildOfflineHtml(createSamplePlayableWorld(),template(),defaultRelease);
  assert.equal(html.includes('connect-src \'none\''),true);
  assert.equal(html.includes('<script type="module">'),true);
});
test('safe metadata does not grant game authority or allow a foreign world override',()=>{
  const world=createSamplePlayableWorld(),bad=structuredClone(world);
  bad.capabilities.scripts='ENABLED';
  assert.throws(()=>buildOfflineHtml(bad,template(),defaultReleaseMetadata('Valid')),
    /privileged capabilities/);
  const m=defaultReleaseMetadata(world.title);
  assert.throws(()=>buildOfflineHtml(world,template(),{...m,objects:[]}),/unsupported/);
});
