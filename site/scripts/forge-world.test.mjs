import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeedWorld,WIDTH,HEIGHT,paintTile,validateDemoWorld,movePlayer} from '../src/forge-world.js';
test('v6 demo scene is bounded and independently serializable',()=>{
  const scene=createSeedWorld();
  assert.equal(scene.tiles.length,WIDTH*HEIGHT);
  assert.deepEqual(validateDemoWorld(JSON.parse(JSON.stringify(scene))),scene);
  assert.equal(scene.format,'pixelforge.v6.demo-world.v1');
});
test('paint is immutable and rejects unknown tiles',()=>{
  const scene=createSeedWorld(),next=paintTile(scene,17,'water');
  assert.equal(next.tiles[17],'water');
  assert.notEqual(scene.tiles[17],'water');
  assert.throws(()=>paintTile(scene,17,'javascript:'),/Invalid/);
  assert.throws(()=>paintTile(scene,-1,'grass'),/Invalid/);
});
test('malformed exports never pass validation',()=>{
  assert.throws(()=>validateDemoWorld({...createSeedWorld(),tiles:['grass']}),/28/);
  assert.throws(()=>validateDemoWorld({...createSeedWorld(),format:'pixelforge.vr-world.v1'}),/Unsupported/);
});
test('player respects blockers and world bounds',()=>{
  const scene=createSeedWorld();
  assert.deepEqual(movePlayer(scene,{x:1,y:1},-1,0),{x:1,y:1});
  assert.deepEqual(movePlayer(scene,{x:2,y:2},1,0),{x:3,y:2});
});
