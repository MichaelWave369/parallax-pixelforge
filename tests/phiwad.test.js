import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { convertRuntimeSceneToRaycaster, validateRaycasterLevel, buildPhiWad, loadPhiWad, PHIWAD_PROFILE } from '../phiwad/level.js';
import { loadRuntimeScenePack, makeRuntimeScenePack } from '../phipack/core.js';
import { createPixelForgeRegistry, createReferenceRaycasterRegistry } from '../phipack/registry.js';

const scene = JSON.parse(fs.readFileSync(
  'games/the-legend-of-more-bounce/runtime/bouncehome-grove.runtime-scene.v5.11.json', 'utf8'));
test('ΦWAD converts actual authored collision map with sealed boundary, spawn and exit', () => {
  const level = convertRuntimeSceneToRaycaster(scene);
  assert.equal(level.width, scene.map.width+2);
  assert.equal(level.height, scene.map.height+2);
  assert.equal(level.format, PHIWAD_PROFILE);
  assert.equal(level.walls[0], 1);
  assert.equal(level.walls[1+level.width], 1);
  assert.equal(level.spawn.x, scene.runtime.player.x+1);
  assert.equal(level.spawn.y, scene.runtime.player.y+1);
  assert.equal(level.exits[0].toSceneId, 'wobble-woods');
  assert.ok(validateRaycasterLevel(level).ok);
});
test('ΦWAD ZIP v0.1 deterministic roundtrip and explicit privacy default', () => {
  const pack = buildPhiWad(scene);
  assert.equal(Buffer.from(pack.subarray(0,4)).toString('hex'),'504b0304');
  const { manifest, level } = loadPhiWad(pack);
  assert.equal(manifest.kind, 'level');
  assert.equal(manifest.profile, PHIWAD_PROFILE);
  assert.equal(manifest.rights.redistributionAllowed,false);
  assert.equal(level.walls.length, level.width*level.height);
  assert.deepEqual(pack, buildPhiWad(scene));
  assert.throws(() => loadRuntimeScenePack(pack), /invalid|Invalid|Unsupported/);
});
test('ΦWAD rejects invalid scene geometry and spawn on a wall', () => {
  const bad = structuredClone(scene);
  bad.map.layers.collision.length--;
  assert.throws(() => convertRuntimeSceneToRaycaster(bad), /collision/);
  const blocked = structuredClone(scene);
  blocked.map.layers.collision[Math.floor(blocked.runtime.player.y)*blocked.map.width+Math.floor(blocked.runtime.player.x)] = 1;
  assert.throws(() => convertRuntimeSceneToRaycaster(blocked), /spawn/);
});
test('ΦWAD validates corrupt and unsealed levels without invoking any game logic', () => {
  const level = convertRuntimeSceneToRaycaster(scene);
  assert.equal(validateRaycasterLevel({ ...level, walls: level.walls.slice(1) }).ok,false);
  const cut = structuredClone(level);
  cut.walls[0] = 0;
  assert.equal(validateRaycasterLevel(cut).ok,false);
  const pack = buildPhiWad(scene);
  const changed = pack.slice(); changed[changed.length-25] ^= 1;
  assert.throws(() => loadPhiWad(changed));
});
test('runtime scene adapter remains independent and raycaster adapter is not implicitly installed', () => {
  const registry=createPixelForgeRegistry();
  const scenePack=makeRuntimeScenePack(scene);
  assert.equal(registry.load('pixelforge-runtime-composer',scenePack).scene.sceneId,scene.sceneId);
  assert.throws(() => registry.load('phi369-raycaster',buildPhiWad(scene)),/No adapter/);
});

test('reference raycaster opt-in adapter loads only its declared level profile', () => {
  const registry = createReferenceRaycasterRegistry();
  const bytes = buildPhiWad(scene);
  assert.equal(registry.load('phiwad-reference-raycaster', bytes).level.format, PHIWAD_PROFILE);
  assert.throws(() => registry.load('phiwad-reference-raycaster', makeRuntimeScenePack(scene)), /does not support/);
});
