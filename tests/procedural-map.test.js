import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  PROCEDURAL_MODES, generateProceduralMap, pathExists, buildProceduralStarterTiles
} from '../procedural-map.js';

const tiles = buildProceduralStarterTiles();
const sizes = [[8, 8], [16, 12], [24, 16], [32, 18], [40, 24], [64, 48]];

test('placeholder art is bounded, usable and follows Tile Studio v5.10 contracts', () => {
  assert.equal(tiles.length, 6);
  assert.deepEqual(tiles.map(tile => tile.tag), ['ground', 'path', 'wall', 'water', 'foliage', 'decor']);
  for (const tile of tiles) {
    assert.equal(tile.pixels.length, 256);
    assert.equal(tile.pixels.every(pixel => pixel === null || /^#[0-9a-f]{6}$/i.test(pixel)), true);
    assert.equal(typeof tile.walkable, 'boolean');
  }
  assert.ok(tiles[0].pixels.some(Boolean), 'starter map should visibly render');
});

for (const mode of PROCEDURAL_MODES) {
  test(mode + ': deterministic layouts are repeatable and seed-sensitive', () => {
    const args = {width: 32, height: 18, mode, seed: 'same-world', tiles};
    const first = generateProceduralMap(args);
    assert.deepEqual(generateProceduralMap(args), first);
    const other = generateProceduralMap({...args, seed: 'different-world'});
    assert.notDeepEqual(other.layers, first.layers);
    assert.equal(first.metadata.seed, 'same-world');
    assert.equal(first.metadata.mode, mode);
    assert.equal(first.metadata.schema, 'pixelforge.procedural-map.v1');
  });

  test(mode + ': every supported size has reachable entrances, valid layers and blocked borders', () => {
    for (const [width, height] of sizes) {
      const result = generateProceduralMap({width, height, seed: 'PIXELFORGE-369', mode, tiles});
      const {layers, metadata} = result;
      for (const key of ['ground', 'decor', 'collision']) assert.equal(layers[key].length, width * height);
      assert.equal(layers.ground.every(i => Number.isInteger(i) && i >= 0 && i < tiles.length), true);
      assert.equal(layers.decor.every(i => i === null || Number.isInteger(i) && i >= 0 && i < tiles.length), true);
      assert.equal(layers.collision.every(flag => typeof flag === 'boolean'), true);
      assert.equal(metadata.reachable, true);
      assert.equal(pathExists(layers, width, height, metadata.entrance, metadata.exit), true);
      assert.equal(metadata.walkableCells + metadata.blockedCells, width * height);
      for (let x = 0; x < width; x++) {
        assert.equal(layers.collision[x], true);
        assert.equal(layers.collision[(height - 1) * width + x], true);
      }
      for (let y = 0; y < height; y++) {
        assert.equal(layers.collision[y * width], true);
        assert.equal(layers.collision[y * width + width - 1], true);
      }
    }
  });
}

test('seed input is validated and safely bounded', () => {
  const args = {width: 24, height: 16, seed: 'abc', mode: 'dungeon', tiles};
  assert.throws(() => generateProceduralMap({...args, width: 7}), RangeError);
  assert.throws(() => generateProceduralMap({...args, height: 49}), RangeError);
  assert.throws(() => generateProceduralMap({...args, mode: 'unknown'}), RangeError);
  assert.throws(() => generateProceduralMap({...args, seed: '  '}), TypeError);
  assert.throws(() => generateProceduralMap({...args, tiles: []}), TypeError);
  const result = generateProceduralMap({...args, seed: '  hello  '});
  assert.equal(result.metadata.seed, 'hello');
  assert.equal(generateProceduralMap({...args, seed: 'x'.repeat(100)}).metadata.seed.length, 80);
});

test('reachability validator rejects invalid, obstructed and disconnected maps', () => {
  const width = 8, height = 8, collision = Array(width * height).fill(true);
  collision[width + 1] = false;
  collision[width * 6 + 6] = false;
  const args = [{collision}, width, height, {x: 1, y: 1}, {x: 6, y: 6}];
  assert.equal(pathExists(...args), false);
  assert.equal(pathExists({collision}, width, height, {x: 0, y: 0}, {x: 6, y: 6}), false);
  assert.equal(pathExists({collision: []}, width, height, args[3], args[4]), false);
});

test('generator never mutates an authored tileset and supports a single blank tile', () => {
  const original = JSON.stringify(tiles);
  const result = generateProceduralMap({width: 16, height: 12, seed: 'preserve art', mode: 'cavern', tiles});
  assert.equal(JSON.stringify(tiles), original);
  assert.equal(result.layers.ground.some(tileId => tileId === 2), true);
  const blank = [{id: 'tile_001', name: 'Blank', tag: 'ground', walkable: true, pixels: Array(256).fill(null)}];
  const one = generateProceduralMap({width: 16, height: 12, seed: 'blank', mode: 'forest', tiles: blank});
  assert.equal(one.layers.ground.every(i => i === 0), true);
  assert.equal(one.metadata.reachable, true);
});

test('Tile Studio exposes generator controls and invalidates verification on editing', () => {
  const code = readFileSync(new URL('../tile-studio.js', import.meta.url), 'utf8');
  for (const marker of ['tileProcMode', 'tileProcSeed', 'tileProcGenerate', 'generateProceduralMap', 'buildProceduralStarterTiles', 'lastGeneration=null', 'generation:s.lastGeneration']) {
    assert.ok(code.includes(marker), 'missing Tile Studio integration: ' + marker);
  }
});
