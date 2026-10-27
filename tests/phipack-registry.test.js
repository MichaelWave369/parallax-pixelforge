import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeRuntimeScenePack, decodePack } from '../phipack/core.js';
import { createAdapterRegistry, createPixelForgeRegistry } from '../phipack/registry.js';

const scene = JSON.parse(fs.readFileSync(
  'games/the-legend-of-more-bounce/runtime/bouncehome-grove.runtime-scene.v5.11.json', 'utf8'
));
test('universal adapter registry rejects unsupported engines instead of silently coercing content', () => {
  const pack = makeRuntimeScenePack(scene);
  const manifest = decodePack(pack).manifest;
  const registry = createPixelForgeRegistry();
  assert.equal(registry.support('pixelforge-runtime-composer', manifest).supported, true);
  assert.equal(registry.support('doom-raycaster', manifest).supported, false);
  assert.throws(() => registry.load('doom-raycaster', pack), /No adapter/);
  assert.deepEqual(registry.load('pixelforge-runtime-composer', pack).scene.map, scene.map);
});
test('each game engine registers a unique, explicit capability contract', () => {
  const registry = createAdapterRegistry();
  assert.throws(() => registry.register({ engineId: 'invalid' }));
  registry.register({ engineId: 'test-engine', profiles: ['phipack.custom.future'], load: () => ({}) });
  assert.throws(() => registry.register({ engineId: 'test-engine', profiles: ['phipack.custom.future'], load: () => ({}) }), /Duplicate/);
  assert.equal(registry.list().length, 1);
  const manifest = decodePack(makeRuntimeScenePack(scene)).manifest;
  assert.equal(registry.support('test-engine', manifest).supported, false);
});
