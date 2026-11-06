import test from 'node:test';
import assert from 'node:assert/strict';
import {addObject} from '../../vr-studio/world.js';
import {sampleVrWorld,fingerprintVrWorld,newPhysicsProfile,placeOnSurface,
  editPhysicsObject} from '../src/vr-physics-bridge.js';
import {PLAYABLE_FORMAT,PLAYABLE_MAX_OBJECTS,PLAYABLE_MAX_BYTES,
  buildPlayableWorld,parsePlayableWorld,validatePlayableWorld,createSamplePlayableWorld} from '../src/playable-world.js';

const fixture=async()=>{
  const scene=sampleVrWorld(),hash=await fingerprintVrWorld(scene);
  return {scene,hash,profile:newPhysicsProfile(scene,hash)};
};
test('starter World Player scene is a strict playable document with a floor',()=>{
  const sample=createSamplePlayableWorld();
  assert.equal(sample.format,PLAYABLE_FORMAT);
  assert.equal(sample.capabilities.network,'NONE');
  assert.equal(sample.capabilities.scripts,'NONE');
  assert.ok(sample.objects.some(o=>o.kind==='floor'&&o.body==='fixed'));
  assert.deepEqual(parsePlayableWorld(JSON.stringify(sample)),sample);
});
test('export a constructed world into data-only reusable geometry with spawn and gravity',async()=>{
  const {scene,hash,profile}=await fixture();
  const source=JSON.stringify(scene),initial=JSON.stringify(profile);
  const placed=placeOnSurface(profile,scene,hash,'block',
    {targetId:'obj-1',point:[.2,0,-4],normal:[0,1,0]}).profile;
  const playable=buildPlayableWorld(scene,placed,hash,-9.5);
  assert.equal(playable.source.sha256,hash);
  assert.equal(playable.gravity,-9.5);
  assert.deepEqual(playable.spawn,[0,2.2,-4]);
  assert.equal(playable.objects.at(-1).id,'placed-1');
  assert.equal(playable.objects.length,scene.objects.length+1);
  assert.equal(JSON.stringify(scene),source);
  assert.equal(JSON.stringify(profile),initial);
  assert.deepEqual(parsePlayableWorld(JSON.stringify(playable)),playable);
});
test('private GLB asset metadata and binary references are excluded from the playable world',async()=>{
  const asset={asset_id:'ASSET-000021',sha256:'a'.repeat(64),source_name:'Private-Protected.glb',byte_length:4299};
  const scene=addObject(sampleVrWorld(),'asset-proxy',asset);
  const hash=await fingerprintVrWorld(scene),profile=newPhysicsProfile(scene,hash);
  const playable=buildPlayableWorld(scene,profile,hash);
  const json=JSON.stringify(playable);
  assert.equal(json.includes('Private-Protected.glb'),false);
  assert.equal(json.includes('ASSET-000021'),false);
  assert.equal(json.includes(asset.sha256),false);
  assert.equal(playable.objects.length,scene.objects.length-1);
  assert.equal(json.includes('asset-proxy'),false);
});
test('strict reader rejects unknown fields, scripts, network claims and malformed geometry',()=>{
  const w=createSamplePlayableWorld();
  assert.throws(()=>validatePlayableWorld({...w,script:'alert(1)'}),/unsafe/);
  assert.throws(()=>validatePlayableWorld({...w,capabilities:{...w.capabilities,network:'ONLINE'}}),/privileged/);
  assert.throws(()=>validatePlayableWorld({...w,objects:[{...w.objects[0],url:'https://evil.test/'}]}),/unsafe/);
  assert.throws(()=>validatePlayableWorld({...w,objects:[{...w.objects[0],kind:'asset-proxy'}]}),/geometry/);
  assert.throws(()=>validatePlayableWorld({...w,objects:[{...w.objects[0],position:[1,2,Infinity]}]}),/transform/);
  assert.throws(()=>validatePlayableWorld({...w,objects:[w.objects[0],w.objects[0]]}),/duplicate/);
  assert.throws(()=>validatePlayableWorld({...w,spawn:[0,Infinity,0]}),/spawn/);
  assert.throws(()=>validatePlayableWorld({...w,gravity:-40}),/Gravity/);
  assert.throws(()=>validatePlayableWorld({...w,objects:w.objects.filter(o=>o.kind!=='floor')}),/fixed floor/);
  assert.throws(()=>validatePlayableWorld({...w,objects:Array.from({length:PLAYABLE_MAX_OBJECTS+1},(_,i)=>({...w.objects[0],id:'placed-'+(i+1)}))}),/count/);
});
test('bounded parser rejects unsupported versions and oversized files',()=>{
  const w=createSamplePlayableWorld();
  assert.throws(()=>parsePlayableWorld(JSON.stringify({...w,format:'pixelforge.playable-world.v2'})),/version/);
  assert.throws(()=>parsePlayableWorld('z'.repeat(PLAYABLE_MAX_BYTES+1)),/160 KB/);
  assert.throws(()=>parsePlayableWorld('null'),/unsafe/);
  assert.throws(()=>parsePlayableWorld('{"broken":'),SyntaxError);
});
test('build refuses a missing fixed floor and a foreign physics profile hash',async()=>{
  const {scene,hash,profile}=await fixture();
  const noFloor=editPhysicsObject(profile,scene,hash,'obj-1',{body:'dynamic'});
  assert.throws(()=>buildPlayableWorld(scene,noFloor,hash),/fixed floor/);
  assert.throws(()=>buildPlayableWorld(scene,profile,'f'.repeat(64)),/match/);
});
