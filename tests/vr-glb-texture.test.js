import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeGlbMesh} from '../vr-studio/glb-mesh.js';

// 1x1 PNG, stored solely inside an embedded GLB bufferView.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Xu0XhwAAAAASUVORK5CYII=','base64');
function texturedGlb(edit=()=>{}) {
  const padded=Buffer.alloc(Math.ceil(png.length/4)*4);
  png.copy(padded);
  const bin=Buffer.alloc(68+padded.length);
  [[0,0,0],[1,0,0],[0,1,0]].flat().forEach((v,i)=>bin.writeFloatLE(v,i*4));
  [0,1,2].forEach((v,i)=>bin.writeUInt16LE(v,36+i*2));
  [[0,0],[1,0],[0,1]].flat().forEach((v,i)=>bin.writeFloatLE(v,44+i*4));
  padded.copy(bin,68);
  const data={
    asset:{version:'2.0'},
    buffers:[{byteLength:bin.length}],
    bufferViews:[
      {buffer:0,byteOffset:0,byteLength:36},
      {buffer:0,byteOffset:36,byteLength:6},
      {buffer:0,byteOffset:44,byteLength:24},
      {buffer:0,byteOffset:68,byteLength:png.length}
    ],
    accessors:[
      {bufferView:0,componentType:5126,count:3,type:'VEC3'},
      {bufferView:1,componentType:5123,count:3,type:'SCALAR'},
      {bufferView:2,componentType:5126,count:3,type:'VEC2'}
    ],
    materials:[{pbrMetallicRoughness:{baseColorFactor:[0.5,0.8,0.7,1],baseColorTexture:{index:0}}}],
    images:[{bufferView:3,mimeType:'image/png'}],
    textures:[{source:0,sampler:0}],
    samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:33071}],
    meshes:[{primitives:[{attributes:{POSITION:0,TEXCOORD_0:2},indices:1,material:0}]}],
    nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0
  };
  edit(data,bin);
  const raw=Buffer.from(JSON.stringify(data));
  const jsonPad=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,0x20)]);
  const out=Buffer.alloc(12+8+jsonPad.length+8+bin.length);
  out.writeUInt32LE(0x46546c67,0);
  out.writeUInt32LE(2,4);
  out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(jsonPad.length,12);
  out.writeUInt32LE(0x4e4f534a,16);
  jsonPad.copy(out,20);
  const offset=20+jsonPad.length;
  out.writeUInt32LE(bin.length,offset);
  out.writeUInt32LE(0x004e4942,offset+4);
  bin.copy(out,offset+8);
  return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength);
}
test('GLB decoder yields bounded embedded image bytes, UVs and sampler state',()=>{
  const result=decodeGlbMesh(texturedGlb());
  assert.equal(result.meshCount,1);
  assert.equal(result.vertexCount,3);
  assert.equal(result.meshes[0].vertices.length,24);
  assert.deepEqual(Array.from(result.meshes[0].vertices.slice(6,8)),[0,0]);
  assert.deepEqual(Array.from(result.meshes[0].vertices.slice(14,16)),[1,0]);
  assert.deepEqual(Array.from(result.meshes[0].vertices.slice(22,24)),[0,1]);
  assert.deepEqual(result.meshes[0].color,[0.5,0.8,0.7]);
  assert.equal(result.meshes[0].textureIndex,0);
  assert.equal(result.textures.length,1);
  assert.equal(result.textures[0].mimeType,'image/png');
  assert.deepEqual(Buffer.from(result.textures[0].bytes),png);
  assert.deepEqual(result.textures[0].sampler,{wrapS:10497,wrapT:33071,magFilter:9729,minFilter:9987});
  assert.ok(!result.warnings.includes('TEXTURES_NOT_RENDERED_BASE_COLOR_ONLY'));
});
test('texture decoder rejects external URLs, unsafe image views and unsupported samplers',()=>{
  const mutations=[
    x=>{x.images[0].uri='https://invalid.example/image.png';},
    x=>{x.images[0].mimeType='image/svg+xml';},
    x=>{x.images[0].mimeType='image/webp';},
    x=>{x.bufferViews[3].byteLength=6_000_001;},
    x=>{x.bufferViews[3].byteOffset=10000000;},
    x=>{x.textures[0].source=999;},
    x=>{x.samplers[0].wrapS=13;},
    x=>{x.materials[0].pbrMetallicRoughness.baseColorTexture.texCoord=1;},
    x=>{x.materials[0].pbrMetallicRoughness.baseColorTexture.extensions={KHR_texture_transform:{offset:[1,0]}};},
    x=>{delete x.meshes[0].primitives[0].attributes.TEXCOORD_0;},
    x=>{x.accessors[2].count=2;},
  ];
  for(const mutate of mutations)assert.throws(()=>decodeGlbMesh(texturedGlb(mutate)));
});
test('extra material maps are warned about without licensing or parity claims',()=>{
  const report=decodeGlbMesh(texturedGlb(x=>{
    x.materials[0].normalTexture={index:0};
    x.materials[0].pbrMetallicRoughness.metallicFactor=0.25;
  }));
  assert.ok(report.warnings.includes('NON_BASE_COLOR_MAPS_NOT_RENDERED'));
  assert.ok(report.warnings.includes('PBR_METALLIC_ROUGHNESS_SIMPLIFIED'));
  assert.equal(report.status,'STATIC_GEOMETRY_PREVIEW_ONLY');
});
