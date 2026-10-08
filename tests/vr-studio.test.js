import test from 'node:test';
import assert from 'node:assert/strict';
import {FORMAT,MAX_OBJECTS,newWorld,validateWorld,parseWorld,addObject,editObject,removeObject,renameWorld} from '../vr-studio/world.js';

test('VR starter world has a strictly versioned and deterministic operator-only scene',()=>{
  const a=newWorld(),b=newWorld();
  assert.deepEqual(a,b);
  assert.equal(a.format,FORMAT);
  assert.equal(a.objects.length,3);
  assert.equal(validateWorld(a),a);
});
test('creator can add, move, name and remove an object without mutating the input',()=>{
  const start=newWorld();
  const withBlock=addObject(start,'block');
  const id=withBlock.objects.at(-1).id;
  const moved=editObject(withBlock,id,{name:'Bounce House',position:[2,1,-6],scale:[2,2,2],yaw:45});
  const trimmed=removeObject(moved,id);
  assert.equal(start.objects.length,3);
  assert.equal(withBlock.objects.length,4);
  assert.equal(moved.objects.at(-1).name,'Bounce House');
  assert.equal(trimmed.objects.length,3);
  assert.equal(renameWorld(trimmed,'More Bounce VR').title,'More Bounce VR');
});
test('portable scene JSON roundtrips cleanly',()=>{
  const a=newWorld();
  assert.deepEqual(parseWorld(JSON.stringify(a)),a);
});
test('invalid scene payloads fail closed',()=>{
  const base=newWorld();
  const patch=(f)=>{const copy=structuredClone(base);f(copy);return copy;};
  const bad=[
    patch(x=>x.format='world.v0'),
    patch(x=>x.runtime.authority='AGENT_ADMIN'),
    patch(x=>x.runtime.physics='QUALIFIED'),
    patch(x=>x.objects[1].position[0]=Infinity),
    patch(x=>x.objects[1].scale[2]=0),
    patch(x=>x.objects[1].yaw=999),
    patch(x=>x.objects[1].color='url(https://example.com)'),
    patch(x=>x.objects[2].id='obj-2'),
    patch(x=>x.next_id=2),
    patch(x=>x.objects.push({...x.objects[0],id:'obj-4',kind:'asset-proxy'}))
  ];
  for(const value of bad)assert.throws(()=>validateWorld(value));
  assert.throws(()=>parseWorld('{"format":"bad"}'));
  assert.throws(()=>parseWorld('x'.repeat(200001)));
  assert.throws(()=>editObject(base,'obj-1',{authority:'superuser'}));
  assert.throws(()=>addObject(base,'nuke'));
});
test('asset staging binds local GLB identity only; it never approves source content',()=>{
  const src={asset_id:'ASSET-000021',source_name:'fantasy-room.glb',byte_length:4096,sha256:'a'.repeat(64)};
  const scene=addObject(newWorld(),'asset-proxy',src);
  const proxy=scene.objects.at(-1);
  assert.equal(proxy.kind,'asset-proxy');
  assert.deepEqual(proxy.asset,src);
  assert.equal(scene.runtime.authority,'OPERATOR_ONLY');
  assert.throws(()=>addObject(newWorld(),'asset-proxy',{...src,sha256:'fake'}));
  assert.throws(()=>editObject(scene,proxy.id,{asset:{...src,asset_id:'ASSET-999999'}}));
});
test('world enforces the bounded object budget',()=>{
  let world=newWorld();
  while(world.objects.length<MAX_OBJECTS) world=addObject(world,'block');
  assert.equal(world.objects.length,MAX_OBJECTS);
  assert.throws(()=>addObject(world,'block'),/128-object/);
});
