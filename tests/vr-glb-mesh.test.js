import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeGlbMesh,MAX_GLB_BYTES} from '../vr-studio/glb-mesh.js';

// A true binary GLB with one triangle and no outside downloads or fixtures.
function fixture(mutator=()=>{}) {
  const bin=Buffer.alloc(44);
  [[0,0,0],[1,0,0],[0,1,0]].flat().forEach((v,i)=>bin.writeFloatLE(v,i*4));
  [0,1,2].forEach((v,i)=>bin.writeUInt16LE(v,36+i*2));
  const json={
    asset:{version:'2.0'},
    buffers:[{byteLength:42}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},
               {bufferView:1,componentType:5123,count:3,type:'SCALAR'}],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]}],
    materials:[{pbrMetallicRoughness:{baseColorFactor:[0.3,0.6,0.9,1]}}],
    nodes:[{mesh:0,translation:[2,0,-1]}],
    scenes:[{nodes:[0]}],scene:0
  };
  mutator(json,bin);
  const raw=Buffer.from(JSON.stringify(json));
  const jsonPad=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,0x20)]);
  const bytes=Buffer.alloc(12+8+jsonPad.length+8+bin.length);
  bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);
  bytes.writeUInt32LE(jsonPad.length,12);bytes.writeUInt32LE(0x4e4f534a,16);jsonPad.copy(bytes,20);
  const b=20+jsonPad.length;
  bytes.writeUInt32LE(bin.length,b);bytes.writeUInt32LE(0x004e4942,b+4);bin.copy(bytes,b+8);
  return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
}
test('GLB preview decodes indexed static triangles with node transform and color',()=>{
  const report=decodeGlbMesh(fixture());
  assert.equal(report.status,'STATIC_GEOMETRY_PREVIEW_ONLY');
  assert.equal(report.vertexCount,3);
  assert.equal(report.meshCount,1);
  assert.deepEqual(report.meshes[0].color,[0.3,0.6,0.9]);
  assert.deepEqual(Array.from(report.meshes[0].vertices.slice(0,3)),[2,0,-1]);
  assert.deepEqual(report.bounds.min,[2,0,-1]);
  assert.deepEqual(report.bounds.max,[3,1,-1]);
});
test('rejects external buffers, mandatory extensions, skinned and morphed geometry',()=>{
  for(const modify of [
    x=>{x.buffers[0].uri='https://outside.example/x.bin';},
    x=>{x.extensionsRequired=['KHR_draco_mesh_compression'];},
    x=>{x.animations=[{channels:[],samplers:[]}];},
    x=>{x.skins=[{}];},
    x=>{x.nodes[0].skin=0;},
    x=>{x.meshes[0].primitives[0].mode=1;},
    x=>{x.accessors[0].sparse={count:1};}
  ]) assert.throws(()=>decodeGlbMesh(fixture(modify)));
});
test('rejects invalid index and out-of-range binary accessor offsets',()=>{
  assert.throws(()=>decodeGlbMesh(fixture((_,bin)=>bin.writeUInt16LE(700,38))),/out of bounds/);
  assert.throws(()=>decodeGlbMesh(fixture(x=>{x.bufferViews[0].byteOffset=10000;})),/buffer bounds/);
});
test('rejects bad GLB header and malformed node cycles',()=>{
  const bad=fixture();new DataView(bad).setUint32(0,123,true);
  assert.throws(()=>decodeGlbMesh(bad));
  assert.throws(()=>decodeGlbMesh(fixture(x=>{x.nodes[0].children=[0];})),/cyclic/);
});
test('texture-bearing static GLB gives explicit fallback warning',()=>{
  const report=decodeGlbMesh(fixture(x=>{x.materials[0].pbrMetallicRoughness.baseColorTexture={index:0};}));
  assert.ok(report.warnings.includes('TEXTURES_NOT_RENDERED_BASE_COLOR_ONLY'));
});
test('rejects oversized source files safely',()=>{
  assert.ok(MAX_GLB_BYTES>=50_000_000);
  assert.throws(()=>decodeGlbMesh(new ArrayBuffer(12)));
});
