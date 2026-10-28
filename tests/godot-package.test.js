import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {newWorld,addObject} from '../vr-studio/world.js';
import {createGodotProjectPack,zipStore} from '../vr-studio/godot-package.js';
import {exportSceneForEngine} from '../vr-studio/engine-export.js';
const decode=new TextDecoder();
function fixture(){
  const bin=Buffer.alloc(44);
  [[0,0,0],[1,0,0],[0,1,0]].flat().forEach((v,i)=>bin.writeFloatLE(v,i*4));
  [0,1,2].forEach((v,i)=>bin.writeUInt16LE(v,36+i*2));
  const doc={asset:{version:'2.0'},buffers:[{byteLength:42}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},
               {bufferView:1,componentType:5123,count:3,type:'SCALAR'}],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
    nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
  const raw=Buffer.from(JSON.stringify(doc)),pad=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,0x20)]);
  const result=Buffer.alloc(12+8+pad.length+8+bin.length);
  result.writeUInt32LE(0x46546c67,0);result.writeUInt32LE(2,4);
  result.writeUInt32LE(result.length,8);result.writeUInt32LE(pad.length,12);
  result.writeUInt32LE(0x4e4f534a,16);pad.copy(result,20);
  const pos=20+pad.length;
  result.writeUInt32LE(bin.length,pos);result.writeUInt32LE(0x004e4942,pos+4);bin.copy(result,pos+8);
  return result;
}
function contents(bytes){
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),files=new Map();
  let off=0;
  while(dv.getUint32(off,true)===0x04034b50){
    const length=dv.getUint32(off+18,true),nameLength=dv.getUint16(off+26,true);
    const name=decode.decode(bytes.slice(off+30,off+30+nameLength));
    const start=off+30+nameLength;
    files.set(name,bytes.slice(start,start+length));off=start+length;
  }
  assert.equal(dv.getUint32(off,true),0x02014b50);
  return files;
}
test('Godot scene with hash-bound GLBs packages the actual selected bytes',async()=>{
  const bytes=fixture(),sha=createHash('sha256').update(bytes).digest('hex');
  const asset={asset_id:'ASSET-000021',source_name:'private.glb',byte_length:bytes.length,sha256:sha};
  const world=addObject(newWorld(),'asset-proxy',asset),snapshot=JSON.stringify(world);
  const bound=new Map([[sha,bytes]]);
  const pack=await createGodotProjectPack(world,bound,webcrypto.subtle);
  const files=contents(pack.bytes);
  assert.deepEqual([...files.keys()],['project.godot','scene.tscn','manifest.json','assets/'+sha+'.glb']);
  assert.deepEqual(Buffer.from(files.get('assets/'+sha+'.glb')),bytes);
  const scene=decode.decode(files.get('scene.tscn'));
  assert.ok(scene.includes('res://assets/'+sha+'.glb'));
  assert.ok(scene.includes('instance=ExtResource("GLB_1")'));
  assert.doesNotMatch(scene,/pixelforge_placeholder_only/);
  assert.deepEqual(pack.bytes,(await createGodotProjectPack(world,bound,webcrypto.subtle)).bytes);
  assert.equal(JSON.stringify(world),snapshot);
  assert.equal(pack.report.uniqueGlbs,1);
});
test('multiple instances of same GLB share one bundled file',async()=>{
  const bytes=fixture(),sha=createHash('sha256').update(bytes).digest('hex');
  const asset={asset_id:'ASSET-000021',source_name:'private.glb',byte_length:bytes.length,sha256:sha};
  const world=addObject(addObject(newWorld(),'asset-proxy',asset),'asset-proxy',asset);
  const files=contents((await createGodotProjectPack(world,new Map([[sha,bytes]]),webcrypto.subtle)).bytes);
  assert.equal(files.size,4);
  assert.equal((decode.decode(files.get('scene.tscn')).match(/instance=ExtResource/g)||[]).length,2);
});
test('missing, altered and invalid source assets refuse to package',async()=>{
  const bytes=fixture(),sha=createHash('sha256').update(bytes).digest('hex');
  const asset={asset_id:'ASSET-000021',source_name:'private.glb',byte_length:bytes.length,sha256:sha};
  const world=addObject(newWorld(),'asset-proxy',asset);
  await assert.rejects(createGodotProjectPack(world,new Map(),webcrypto.subtle),/rebound/);
  const altered=Buffer.from(bytes);altered[altered.length-1]^=1;
  await assert.rejects(createGodotProjectPack(world,new Map([[sha,altered]]),webcrypto.subtle),/hash mismatch/);
  assert.throws(()=>exportSceneForEngine(world),/approve placeholder/);
  assert.equal(exportSceneForEngine(world,'godot4',{allowPlaceholders:true}).report.proxyCount,1);
});
test('pack without assets contains a valid static text scene',async()=>{
  const pack=await createGodotProjectPack(newWorld(),new Map(),webcrypto.subtle);
  const files=contents(pack.bytes);
  assert.equal(files.size,3);
  assert.ok(decode.decode(files.get('scene.tscn')).includes('type="BoxMesh"'));
});
test('ZIP writer refuses traversal, duplicates and invalid buffers',()=>{
  assert.throws(()=>zipStore([{path:'../evil',bytes:new Uint8Array()}]),/Invalid archive/);
  assert.throws(()=>zipStore([{path:'ok',bytes:new Uint8Array()},{path:'ok',bytes:new Uint8Array()}]),/Invalid archive/);
  assert.throws(()=>zipStore([{path:'ok',bytes:'not bytes'}]),/Invalid archive/);
});
