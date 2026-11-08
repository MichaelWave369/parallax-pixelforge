import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, addObject, renameWorld } from '../vr-studio/world.js';
import {
  PHIOS_WORLD_IDENTITY_SCHEMA,
  PHIOS_WORLD_IDENTITY_MAX_BYTES,
  buildPhiOSWorldIdentityManifest,
  decodePhiOSWorldIdentityManifest,
  encodePhiOSWorldIdentityManifest,
  projectIdentityProjection,
  validateOperatorWorldProjectId,
  validatePhiOSWorldIdentityManifest,
} from '../vr-studio/phios-world-identity.js';

const world = newWorld();

test('a real validated PixelForge VR world creates only four identity metadata fields', () => {
  const manifest = buildPhiOSWorldIdentityManifest(world, 'my-vr-world-01');
  assert.deepEqual(manifest, {
    schema: PHIOS_WORLD_IDENTITY_SCHEMA,
    projectId: 'my-vr-world-01',
    title: 'Untitled VR World',
    worldFormat: 'pixelforge.vr-world.v1',
  });
  const json = encodePhiOSWorldIdentityManifest(manifest);
  assert.deepEqual(decodePhiOSWorldIdentityManifest(json), manifest);
  assert.deepEqual(Object.keys(JSON.parse(json)), ['schema', 'projectId', 'title', 'worldFormat']);
  assert.deepEqual(projectIdentityProjection(manifest), {
    projectRef: 'project:my-vr-world-01',
    title: 'Untitled VR World',
    source: PHIOS_WORLD_IDENTITY_SCHEMA,
  });
  assert.ok(Object.isFrozen(manifest));
});

test('a stable operator-chosen identity survives title and world revisions', () => {
  const original = buildPhiOSWorldIdentityManifest(world, 'stable-world-01');
  const renamed = buildPhiOSWorldIdentityManifest(
    addObject(renameWorld(world, 'Another World Title'), 'block'), 'stable-world-01');
  assert.equal(original.projectId, renamed.projectId);
  assert.notEqual(original.title, renamed.title);
  assert.equal(projectIdentityProjection(original).projectRef, projectIdentityProjection(renamed).projectRef);
  assert.equal(world.objects.length, 3, 'build and projection must never mutate the source world');
  assert.equal(world.title, 'Untitled VR World');
});

test('similarly titled different worlds must not invent a shared identity', () => {
  const a = buildPhiOSWorldIdentityManifest(world, 'world-a');
  const b = buildPhiOSWorldIdentityManifest(world, 'world-b');
  assert.notEqual(a.projectId, b.projectId);
  assert.notEqual(projectIdentityProjection(a).projectRef, projectIdentityProjection(b).projectRef);
  assert.equal(a.title, b.title);
});

test('operator project IDs are bounded ASCII and cannot be paths or forged wire refs', () => {
  for (const id of ['', ' ', 'project:world', '../secrets', 'abc..def', 'abc.',
    'id space', 'sträße', '/etc/passwd', 'a/b', 'a\\b', 'x'.repeat(65), '_bad']) {
    assert.throws(() => validateOperatorWorldProjectId(id));
    assert.throws(() => buildPhiOSWorldIdentityManifest(world, id));
  }
  for (const id of ['a', 'WORLD_1', 'world-alpha.2', 'a'.repeat(64)]) {
    assert.equal(validateOperatorWorldProjectId(id), id);
  }
});

test('no contents, GLB proxies, Unreal IDs, licensing claims or executable rights cross identity sidecar', () => {
  const asset = { asset_id: 'ASSET-000021', sha256: 'f'.repeat(64),
    source_name: 'private-file.glb', byte_length: 700 };
  const privateWorld = addObject(world, 'asset-proxy', asset);
  privateWorld.objects[0].name = 'secret world note';
  const manifest = buildPhiOSWorldIdentityManifest(privateWorld, 'private-world');
  const exported = encodePhiOSWorldIdentityManifest(manifest);
  for (const hidden of ['ASSET-000021', 'private-file.glb', 'f'.repeat(64),
    'secret world note', 'authority', 'licensing', 'token', 'path', 'objects',
    'files', 'grant', 'physics', 'UNSUPPORTED', 'permission', 'scene']) {
    assert.ok(!exported.includes(hidden), 'sidecar leaked private data/authority: ' + hidden);
  }
});

test('strict reader refuses additional fields, other schemas and corrupted identity values', () => {
  const good = buildPhiOSWorldIdentityManifest(world, 'world');
  for (const bad of [
    { ...good, token: 'secret' },
    { ...good, granted: true },
    { ...good, worldFile: '/private/scene.json' },
    { ...good, schema: 'phioffice369.project_manifest.v0.1' },
    { ...good, worldFormat: 'pixelforge.vr-world.v2' },
    { ...good, projectId: '../oops' },
    { ...good, title: '\u202Espoof' },
    { ...good, title: ' title ' },
    { ...good, title: '' },
  ]) {
    assert.throws(() => validatePhiOSWorldIdentityManifest(bad));
    assert.throws(() => decodePhiOSWorldIdentityManifest(JSON.stringify(bad)));
  }
});

test('decode refuses malformed JSON and oversize input without exposing source', () => {
  assert.throws(() => decodePhiOSWorldIdentityManifest('{'), /not valid JSON/);
  assert.throws(() => decodePhiOSWorldIdentityManifest(' '.repeat(PHIOS_WORLD_IDENTITY_MAX_BYTES + 1)), /4 KiB/);
  assert.throws(() => decodePhiOSWorldIdentityManifest(JSON.stringify([])));
  assert.throws(() => decodePhiOSWorldIdentityManifest(JSON.stringify({})));
});

test('world format itself must validate; no manifest from invalid or unreviewed worlds', () => {
  for (const bad of [
    { ...world, format: 'other.world' },
    { ...world, runtime: { ...world.runtime, authority: 'SHELL_EXEC' } },
    { ...world, objects: new Array(129).fill(world.objects[0]) },
  ]) assert.throws(() => buildPhiOSWorldIdentityManifest(bad, 'world'));
});
