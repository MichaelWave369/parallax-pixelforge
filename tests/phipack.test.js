import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeRuntimeScenePack, decodePack, encodePack, validateManifest, loadRuntimeScenePack, MAX_PACK_BYTES } from '../phipack/core.js';

const scene = JSON.parse(fs.readFileSync(
  'games/the-legend-of-more-bounce/runtime/bouncehome-grove.runtime-scene.v5.11.json', 'utf8'
));

test('real v5.11 Runtime Composer scene roundtrips through portable ZIP pack', () => {
  const bytes = makeRuntimeScenePack(scene);
  assert.equal(Buffer.from(bytes.subarray(0, 4)).toString('hex'), '504b0304');
  const result = loadRuntimeScenePack(bytes);
  assert.equal(result.manifest.formatVersion, '0.1.0');
  assert.equal(result.manifest.rights.redistributionAllowed, false);
  assert.equal(result.scene.sceneId, scene.sceneId);
  assert.deepEqual(result.scene.map, scene.map);
  assert.deepEqual(bytes, makeRuntimeScenePack(scene), 'deterministic output');
});

test('rights metadata, safe paths, checksums and declared assets are mandatory', () => {
  const { manifest, files } = decodePack(makeRuntimeScenePack(scene));
  assert.equal(validateManifest(manifest).ok, true);
  assert.throws(() => encodePack({ ...manifest, assets: [{ ...manifest.assets[0], path: '../escape' }] }, files));
  assert.throws(() => encodePack({ ...manifest, rights: { license: '' } }, files));
  assert.throws(() => encodePack(manifest, { ...files, 'scripts/run.js': new Uint8Array() }), /Undeclared/);
  assert.throws(() => encodePack({ ...manifest, assets: [{ ...manifest.assets[0], crc32: 'ffffffff' }] }, files));
});

test('tampering and appended data are rejected', () => {
  const bytes = makeRuntimeScenePack(scene);
  const changed = bytes.slice();
  const index = changed.findIndex((b, i) => i > 40 && b === 0x7b);
  assert.ok(index > 0);
  changed[index] ^= 1;
  assert.throws(() => decodePack(changed));
  const appended = new Uint8Array(bytes.length + 2);
  appended.set(bytes);
  assert.throws(() => decodePack(appended));
});

test('malformed packages and invalid scene layouts fail closed', () => {
  assert.throws(() => decodePack(new Uint8Array(MAX_PACK_BYTES + 1)));
  assert.throws(() => decodePack(new Uint8Array([1, 2, 3])));
  assert.throws(() => makeRuntimeScenePack({ schema: scene.schema }));
  const bytes = makeRuntimeScenePack(scene);
  const damaged = bytes.slice();
  damaged[damaged.length - 12] = 255;
  assert.throws(() => decodePack(damaged));
});

test('creator-supplied license metadata is preserved, not certified', () => {
  const bytes = makeRuntimeScenePack(scene, { id: 'phi369.example', license: 'MIT', redistributionAllowed: true });
  const { manifest } = decodePack(bytes);
  assert.equal(manifest.id, 'phi369.example');
  assert.equal(manifest.rights.license, 'MIT');
  assert.equal(manifest.rights.redistributionAllowed, true);
});
