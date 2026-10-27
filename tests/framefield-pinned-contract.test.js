// Actual cross-repository contract test using a pinned Framefield checkout.
// No purchased assets, model downloads, network calls, or physical hardware.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {preflightFramefieldGlb,FRAMEFIELD_PROFILE} from '../scripts/lib/framefield_glb_preflight.js';
import {prepareGlbImport} from '../_framefield_partner/src/glbImport.js';
import {demoScene,pose,putKey,validateProject} from '../_framefield_partner/src/scene.js';
import {makeBpcXrPacket} from '../_framefield_partner/src/bpcExport.js';

function makeGlb(override={}){
  const positions=Buffer.alloc(36);
  [0,0,0,1,0,0,0,1,0].forEach((n,i)=>positions.writeFloatLE(n,i*4));
  const indices=Buffer.alloc(6);
  [0,1,2].forEach((n,i)=>indices.writeUInt16LE(n,i*2));
  const bin=Buffer.concat([positions,indices,Buffer.alloc(2)]);
  const json={
    asset:{version:'2.0',generator:'PixelForge cross-repo synthetic fixture'},
    scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],
    buffers:[{byteLength:42}],
    bufferViews:[
      {buffer:0,byteOffset:0,byteLength:36},
      {buffer:0,byteOffset:36,byteLength:6}
    ],
    accessors:[
      {bufferView:0,componentType:5126,count:3,type:'VEC3'},
      {bufferView:1,componentType:5123,count:3,type:'SCALAR'}
    ],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]}],
    materials:[{pbrMetallicRoughness:{
      baseColorFactor:[1,.5,0,1],baseColorTexture:{index:0}}}],
    textures:[{source:0}],images:[{uri:'https://example.invalid/not-fetched.png'}],
    ...override
  };
  const raw=Buffer.from(JSON.stringify(json),'utf8');
  const jsonChunk=Buffer.alloc(Math.ceil(raw.length/4)*4,32);
  raw.copy(jsonChunk);
  const bytes=Buffer.alloc(12+8+jsonChunk.length+8+bin.length);
  bytes.writeUInt32LE(0x46546c67,0);
  bytes.writeUInt32LE(2,4);
  bytes.writeUInt32LE(bytes.length,8);
  bytes.writeUInt32LE(jsonChunk.length,12);
  bytes.writeUInt32LE(0x4e4f534a,16);
  jsonChunk.copy(bytes,20);
  const at=20+jsonChunk.length;
  bytes.writeUInt32LE(bin.length,at);
  bytes.writeUInt32LE(0x004e4942,at+4);
  bin.copy(bytes,at+8);
  return bytes;
}
const asArrayBuffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);

test('pinned real Framefield importer accepts PixelForge synthetic GLB and BPC packet exports it',()=>{
  assert.equal(FRAMEFIELD_PROFILE.reviewed_commit,
    '54be5e82019fc4943021899dcc2e611d0b7b6682');
  const bytes=makeGlb();
  const scan=preflightFramefieldGlb(bytes);
  assert.equal(scan.status,'FRAMEFIELD_STATIC_IMPORT_CANDIDATE');
  assert.equal(scan.framefield_candidate,true);
  const hash=createHash('sha256').update(bytes).digest('hex');
  assert.equal(scan.source.sha256,hash);
  const {object,warnings}=prepareGlbImport(asArrayBuffer(bytes),
    {fileName:'pixel-to-framefield.glb',sha256:hash,index:0,frame:0});
  assert.equal(object.color,'#ffbc00');
  assert.deepEqual(object.geometry.faces,[[0,1,2]]);
  assert.match(warnings.join(' '),/Texture maps were not loaded/i);
  const moving=putKey(object,24,pose([.2,.3,0],[0,90,0],[1,1,1]));
  const scene=validateProject({...demoScene(),objects:[moving]});
  assert.equal(scene.objects[0].glbSource.sha256,hash);
  const packet=makeBpcXrPacket(scene);
  assert.equal(packet.schema,'bpc.spatial-preview.v1');
  assert.equal(packet.assets[0].color,'#ffbc00');
  assert.equal(packet.assets[0].keyframes[1].frame,24);
  assert.ok(Math.abs(packet.assets[0].keyframes[1].rotationRadians[1]-Math.PI/2)<1e-9);
  assert.deepEqual(packet.assets[0].mesh.faces,[[0,1,2]]);
  assert.equal(packet.permissions.publish,false);
});
test('pinned importer and preflight both block transformed nodes',()=>{
  const bytes=makeGlb({nodes:[{mesh:0,translation:[1,0,0]}]});
  const report=preflightFramefieldGlb(bytes);
  assert.equal(report.framefield_candidate,false);
  assert.ok(report.blockers.some(b=>b.code==='NODE_TRANSFORMS'));
  const hash=createHash('sha256').update(bytes).digest('hex');
  assert.throws(()=>prepareGlbImport(asArrayBuffer(bytes),
    {fileName:'transformed.glb',sha256:hash,index:0,frame:0}),/node transforms/);
});
test('pinned importer and preflight both reject multi-mesh assets',()=>{
  const bytes=makeGlb({meshes:[{primitives:[{attributes:{POSITION:0}}]},
    {primitives:[{attributes:{POSITION:0}}]}]});
  const report=preflightFramefieldGlb(bytes);
  assert.equal(report.framefield_candidate,false);
  assert.ok(report.blockers.some(b=>b.code==='MESH_COUNT'));
  const hash=createHash('sha256').update(bytes).digest('hex');
  assert.throws(()=>prepareGlbImport(asArrayBuffer(bytes),
    {fileName:'multiple.glb',sha256:hash,index:0,frame:0}),/one mesh primitive/);
});
