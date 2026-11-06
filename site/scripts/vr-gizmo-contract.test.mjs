import test from 'node:test';
import assert from 'node:assert/strict';
import {addObject} from '../../vr-studio/world.js';
import {sampleVrWorld,fingerprintVrWorld,newPhysicsProfile,validatePhysicsProfile} from '../src/vr-physics-bridge.js';
import {applyGizmoTransform,normalizeYaw,snappedValue,validateGizmoSnap,DEFAULT_GIZMO_SNAP} from '../src/vr-gizmo-contract.js';

async function fixture(){
  const scene=sampleVrWorld();
  const hash=await fingerprintVrWorld(scene);
  return {scene,hash,profile:newPhysicsProfile(scene,hash)};
}
test('one move gizmo interaction commits a snapped transform only to sandbox profile',async()=>{
  const {scene,hash,profile}=await fixture();
  const before=JSON.stringify(scene),prior=JSON.stringify(profile);
  const next=applyGizmoTransform(profile,scene,hash,'obj-2','translate',
    {position:[2.38,1.13,-3.74]});
  assert.deepEqual(next.objects.find(x=>x.id==='obj-2').position,[2.5,1.25,-3.75]);
  assert.equal(JSON.stringify(scene),before);
  assert.equal(JSON.stringify(profile),prior);
  assert.equal(scene.runtime.physics,'UNSUPPORTED');
  assert.deepEqual(validatePhysicsProfile(next,scene,hash),next);
});
test('rotation is strictly yaw-only, normalized, and angle-snapped',async()=>{
  const {scene,hash,profile}=await fixture();
  const rotated=applyGizmoTransform(profile,scene,hash,'obj-2','rotate',{yaw:382});
  assert.equal(rotated.objects.find(x=>x.id==='obj-2').yaw,15);
  assert.equal(normalizeYaw(-181),179);
  assert.equal(snappedValue(-.26,.25),-.25);
  assert.equal(snappedValue(-0,.25),0);
});
test('scale limits, snap off, and no collider geometry forgery',async()=>{
  const {scene,hash,profile}=await fixture();
  const next=applyGizmoTransform(profile,scene,hash,'obj-2','scale',
    {scale:[1.12,2.35,.86]},{translation:0,rotation:0,scale:0});
  assert.deepEqual(next.objects.find(x=>x.id==='obj-2').scale,[1.12,2.35,.86]);
  assert.throws(()=>applyGizmoTransform(profile,scene,hash,'obj-2','scale',{scale:[0,1,1]}),/Scale exceeds/);
  assert.throws(()=>applyGizmoTransform(profile,scene,hash,'obj-2','scale',{scale:[51,1,1]}),/Scale exceeds/);
  assert.throws(()=>applyGizmoTransform(profile,scene,hash,'obj-2','scale',{scale:[.05,1,1]},{translation:.25,rotation:15,scale:.5}),/collapse/);
});
test('reject invalid modes, inputs, foreign hashes and unauthorized fields',async()=>{
  const {scene,hash,profile}=await fixture();
  assert.throws(()=>applyGizmoTransform(profile,scene,hash,'obj-2','inspect',{position:[1,2,3]}),/mode/);
  assert.throws(()=>applyGizmoTransform(profile,scene,hash,'obj-2','translate',{position:[1,Infinity,3]}),/finite/);
  assert.throws(()=>applyGizmoTransform(profile,scene,hash,'obj-2','translate',{position:[101,1,3]}),/limits/);
  assert.throws(()=>applyGizmoTransform(profile,scene,'a'.repeat(64),'obj-2','rotate',{yaw:10}),/match/);
  assert.throws(()=>applyGizmoTransform(profile,scene,hash,'obj-2','rotate',{yaw:NaN}),/yaw/);
  assert.throws(()=>validateGizmoSnap({translation:7,rotation:15,scale:.1}),/snap/);
  assert.throws(()=>applyGizmoTransform(profile,scene,hash,'obj-2','rotate',{yaw:9,asset:'stolen'} ,{translation:7,rotation:15,scale:.1}),/snap/);
  assert.deepEqual(validateGizmoSnap(DEFAULT_GIZMO_SNAP),DEFAULT_GIZMO_SNAP);
});
test('asset proxies cannot be manipulated into colliders',async()=>{
  const asset={asset_id:'ASSET-000021',sha256:'a'.repeat(64),source_name:'Private.glb',byte_length:1024};
  const scene=addObject(sampleVrWorld(),'asset-proxy',asset);
  const hash=await fingerprintVrWorld(scene),profile=newPhysicsProfile(scene,hash);
  const id=scene.objects.at(-1).id;
  assert.throws(()=>applyGizmoTransform(profile,scene,hash,id,'translate',{position:[1,2,3]}),/no editable collision profile/);
});
