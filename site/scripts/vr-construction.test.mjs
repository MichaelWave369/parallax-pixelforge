import test from 'node:test';
import assert from 'node:assert/strict';
import {addObject} from '../../vr-studio/world.js';
import {sampleVrWorld,fingerprintVrWorld,newPhysicsProfile,validatePhysicsProfile,
  toPhysicsDescriptors,placeOnSurface,removePlacedObject,editPhysicsObject,
  MAX_PLACED_OBJECTS} from '../src/vr-physics-bridge.js';
import {applyGizmoTransform} from '../src/vr-gizmo-contract.js';

async function fixture(){
  const scene=sampleVrWorld(),hash=await fingerprintVrWorld(scene);
  return {scene,hash,profile:newPhysicsProfile(scene,hash)};
}
const floor={targetId:'obj-1',point:[.38,0,-3.63],normal:[0,1,0]};
test('place a snapped block on a real fixed top surface without editing original',async()=>{
  const {scene,hash,profile}=await fixture();
  const original=JSON.stringify(scene),sidecar=JSON.stringify(profile);
  const {id,profile:next}=placeOnSurface(profile,scene,hash,'block',floor,.25);
  assert.equal(id,'placed-1');
  assert.equal(next.placed.length,1);
  assert.deepEqual(next.placed[0].position,[.5,.5,-3.75]);
  assert.deepEqual(next.placed[0].scale,[1,1,1]);
  assert.equal(next.placed[0].body,'fixed');
  assert.equal(toPhysicsDescriptors(scene,next,hash).at(-1).id,id);
  assert.equal(JSON.stringify(scene),original);
  assert.equal(JSON.stringify(profile),sidecar);
  assert.deepEqual(validatePhysicsProfile(JSON.parse(JSON.stringify(next)),scene,hash),next);
});
test('placed objects can be stacked, transformed, removed, and undone by snapshot',async()=>{
  const {scene,hash,profile}=await fixture();
  const first=placeOnSurface(profile,scene,hash,'block',{targetId:'obj-1',point:[0,0,-4],normal:[0,1,0]});
  const second=placeOnSurface(first.profile,scene,hash,'platform',{
    targetId:first.id,point:[0,1,-4],normal:[0,1,0]});
  assert.equal(second.id,'placed-2');
  assert.equal(second.profile.placed[1].position[1],1.15);
  const edit=applyGizmoTransform(second.profile,scene,hash,'placed-2','translate',{position:[2,1.15,-3]},{translation:0,rotation:15,scale:.1});
  assert.deepEqual(edit.placed[1].position,[2,1.15,-3]);
  const changed=editPhysicsObject(edit,scene,hash,first.id,{friction:.25});
  assert.equal(changed.placed[0].friction,.25);
  const removed=removePlacedObject(changed,scene,hash,first.id);
  assert.equal(removed.placed.length,1);
  assert.equal(changed.placed.length,2);
  assert.equal(scene.objects.length,3);
});
test('old scene-bound profiles without placed arrays still import',async()=>{
  const {scene,hash,profile}=await fixture();
  const old={...profile};delete old.placed;
  const loaded=validatePhysicsProfile(old,scene,hash);
  assert.deepEqual(loaded.placed,[]);
  assert.deepEqual(loaded.objects,profile.objects);
});
test('reject fake hits, side faces, moving bodies, unapproved prefabs, and foreign hashes',async()=>{
  const {scene,hash,profile}=await fixture();
  assert.throws(()=>placeOnSurface(profile,scene,hash,'dragon',floor),/Unknown/);
  assert.throws(()=>placeOnSurface(profile,scene,hash,'block',{...floor,targetId:'obj-500'}),/fixed collider/);
  assert.throws(()=>placeOnSurface(profile,scene,hash,'block',{...floor,normal:[1,0,0]}),/upward/);
  assert.throws(()=>placeOnSurface(profile,scene,hash,'block',{...floor,point:[99,0,99]}),/top face/);
  assert.throws(()=>placeOnSurface(profile,scene,hash,'block',{...floor,point:[0,1,-4]}),/top face/);
  assert.throws(()=>placeOnSurface(profile,scene,'f'.repeat(64),'block',floor),/match/);
  const dynamic=editPhysicsObject(profile,scene,hash,'obj-1',{body:'dynamic'});
  assert.throws(()=>placeOnSurface(dynamic,scene,hash,'block',floor),/fixed collider/);
  assert.throws(()=>removePlacedObject(profile,scene,hash,'obj-1'),/Only sandbox/);
  assert.throws(()=>placeOnSurface(profile,scene,hash,'block',floor,99),/snap/);
});
test('private asset proxies remain unplaceable collision targets',async()=>{
  const asset={asset_id:'ASSET-000021',sha256:'a'.repeat(64),source_name:'Private.glb',byte_length:1024};
  const scene=addObject(sampleVrWorld(),'asset-proxy',asset);
  const hash=await fingerprintVrWorld(scene),profile=newPhysicsProfile(scene,hash);
  const id=scene.objects.at(-1).id;
  assert.throws(()=>placeOnSurface(profile,scene,hash,'pillar',{...floor,targetId:id}),/fixed collider/);
});
test('strict 32-object capacity and placed object validation',async()=>{
  const {scene,hash}=await fixture();
  let profile=newPhysicsProfile(scene,hash);
  for(let i=0;i<MAX_PLACED_OBJECTS;i++)profile=placeOnSurface(profile,scene,hash,'pillar',floor).profile;
  assert.equal(profile.placed.length,MAX_PLACED_OBJECTS);
  assert.throws(()=>placeOnSurface(profile,scene,hash,'block',floor),/limit/);
  const invalid=structuredClone(profile);invalid.placed[0].color='javascript:';
  assert.throws(()=>validatePhysicsProfile(invalid,scene,hash),/color/);
  const duplicate=structuredClone(profile);duplicate.placed[1].id=duplicate.placed[0].id;
  assert.throws(()=>validatePhysicsProfile(duplicate,scene,hash),/duplicate/);
  assert.throws(()=>validatePhysicsProfile({...profile,source_sha256:'f'.repeat(64)},scene,hash),/match/);
});
