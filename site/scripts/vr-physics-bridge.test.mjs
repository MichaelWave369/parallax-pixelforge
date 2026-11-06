import test from 'node:test';
import assert from 'node:assert/strict';
import {addObject,validateWorld} from '../../vr-studio/world.js';
import {sampleVrWorld,parseVrScene,fingerprintVrWorld,newPhysicsProfile,
  validatePhysicsProfile,editPhysicsObject,toPhysicsDescriptors,PHYSICS_PROFILE_FORMAT} from '../src/vr-physics-bridge.js';

test('canonical VR World v1 is imported read-only and sandboxed',async()=>{
  const source=sampleVrWorld();
  const before=JSON.stringify(source),hash=await fingerprintVrWorld(source);
  const profile=newPhysicsProfile(source,hash);
  assert.equal(profile.format,PHYSICS_PROFILE_FORMAT);
  assert.equal(profile.objects.length,source.objects.length);
  assert.equal(source.runtime.physics,'UNSUPPORTED');
  assert.equal(JSON.stringify(source),before);
  assert.deepEqual(parseVrScene(before),source);
  assert.deepEqual(validatePhysicsProfile(profile,source,hash),profile);
});
test('sandbox overrides affect descriptors, not the canonical scene',async()=>{
  const world=sampleVrWorld(),sha=await fingerprintVrWorld(world);
  const original=JSON.stringify(world),profile=newPhysicsProfile(world,sha);
  const next=editPhysicsObject(profile,world,sha,'obj-2',
    {body:'dynamic',friction:.45,restitution:.75,position:[0,4,-4],scale:[1.5,2,1.5],yaw:30});
  const view=toPhysicsDescriptors(world,next,sha);
  assert.equal(view.find(o=>o.id==='obj-2').body,'dynamic');
  assert.deepEqual(view.find(o=>o.id==='obj-2').position,[0,4,-4]);
  assert.equal(JSON.stringify(world),original);
  assert.equal(profile.objects.find(o=>o.id==='obj-2').body,'fixed');
});
test('foreign scene fingerprint and invalid capabilities are rejected',async()=>{
  const world=sampleVrWorld(),sha=await fingerprintVrWorld(world),profile=newPhysicsProfile(world,sha);
  assert.throws(()=>validatePhysicsProfile(profile,world,'f'.repeat(64)),/match/);
  assert.throws(()=>parseVrScene(JSON.stringify({...world,runtime:{...world.runtime,physics:'SUPPORTED'}})),/runtime capability/);
  assert.throws(()=>editPhysicsObject(profile,world,sha,'obj-2',{__proto__:null,body:'magic'}),/mode/);
  assert.throws(()=>editPhysicsObject(profile,world,sha,'obj-2',{position:[0,0,Infinity]}),/transform/);
  assert.throws(()=>editPhysicsObject(profile,world,sha,'obj-2',{friction:2}),/material/);
  assert.throws(()=>editPhysicsObject(profile,world,sha,'obj-999',{body:'fixed'}),/not found/);
  assert.throws(()=>editPhysicsObject(profile,world,sha,'obj-2',{asset:{source:'secret'}}),/unapproved/);
});
test('private asset proxies are visual placeholders and cannot receive colliders',async()=>{
  const asset={asset_id:'ASSET-000021',sha256:'a'.repeat(64),source_name:'Asset.glb',byte_length:1024};
  const world=addObject(sampleVrWorld(),'asset-proxy',asset);
  validateWorld(world);
  const sha=await fingerprintVrWorld(world),profile=newPhysicsProfile(world,sha);
  const proxy=world.objects.find(o=>o.kind==='asset-proxy');
  assert.ok(proxy);
  assert.ok(!profile.objects.some(o=>o.id===proxy.id));
  const desc=toPhysicsDescriptors(world,profile,sha).find(o=>o.id===proxy.id);
  assert.equal(desc.body,'none');
  assert.equal(desc.proxy,true);
  assert.equal(JSON.stringify(desc).includes('Asset.glb'),false);
  assert.throws(()=>validatePhysicsProfile({...profile,objects:[...profile.objects,{id:proxy.id,body:'fixed',position:proxy.position,scale:proxy.scale,yaw:proxy.yaw,friction:0,restitution:0}]},world,sha),/count mismatch/);
});
test('duplicate object config rejected and bounded transforms required',async()=>{
  const scene=sampleVrWorld(),sha=await fingerprintVrWorld(scene),profile=newPhysicsProfile(scene,sha);
  assert.throws(()=>validatePhysicsProfile({...profile,objects:[profile.objects[0],profile.objects[0],profile.objects[2]]},scene,sha),/duplicate/);
  assert.throws(()=>editPhysicsObject(profile,scene,sha,'obj-1',{scale:[0,1,1]}),/transform/);
  assert.throws(()=>editPhysicsObject(profile,scene,sha,'obj-1',{yaw:361}),/transform/);
});
