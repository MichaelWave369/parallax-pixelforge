import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {preflightFramefieldGlb} from '../scripts/lib/framefield_glb_preflight.js';

const triangle=[0,0,0,1,0,0,0,1,0];
function fixture({positions=triangle,indices=[0,1,2],material=true,more={}}={}){
  const positionBytes=Buffer.alloc(positions.length*4);
  positions.forEach((v,i)=>positionBytes.writeFloatLE(v,i*4));
  const indexBytes=Buffer.alloc(indices.length*2);
  indices.forEach((v,i)=>indexBytes.writeUInt16LE(v,i*2));
  const bin=Buffer.concat([positionBytes,indexBytes]);
  const doc={
    asset:{version:'2.0',generator:'Synthetic PixelForge compatibility fixture'},
    buffers:[{byteLength:bin.length}],
    bufferViews:[
      {buffer:0,byteOffset:0,byteLength:positionBytes.length},
      {buffer:0,byteOffset:positionBytes.length,byteLength:indexBytes.length}
    ],
    accessors:[
      {bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3'},
      {bufferView:1,componentType:5123,count:indices.length,type:'SCALAR'}
    ],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1,...(material?{material:0}:{})}]}],
    ...(material?{
      materials:[{pbrMetallicRoughness:{baseColorFactor:[1,.5,0,1],baseColorTexture:{index:0}}}],
      textures:[{source:0}],images:[{uri:'https://example.invalid/do-not-fetch'}]
    }:{}),
    ...more
  };
  const jsonData=Buffer.from(JSON.stringify(doc),'utf8');
  const json=Buffer.alloc(Math.ceil(jsonData.length/4)*4,0x20);
  jsonData.copy(json);
  const binPad=Buffer.alloc(Math.ceil(bin.length/4)*4);
  bin.copy(binPad);
  const out=Buffer.alloc(12+8+json.length+8+binPad.length);
  out.writeUInt32LE(0x46546c67,0);
  out.writeUInt32LE(2,4);
  out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(json.length,12);
  out.writeUInt32LE(0x4e4f534a,16);
  json.copy(out,20);
  const off=20+json.length;
  out.writeUInt32LE(binPad.length,off);
  out.writeUInt32LE(0x004e4942,off+4);
  binPad.copy(out,off+8);
  return out;
}
const codes=items=>items.map(x=>x.code);

test('accepted single static material GLB is a candidate, not a claim of runtime or rights approval',()=>{
  const file=fixture();
  const r=preflightFramefieldGlb(file);
  assert.equal(r.status,'FRAMEFIELD_STATIC_IMPORT_CANDIDATE');
  assert.equal(r.framefield_candidate,true);
  assert.equal(r.bpc_xr_candidate,true);
  assert.deepEqual(r.blockers,[]);
  assert.equal(r.source.sha256,createHash('sha256').update(file).digest('hex'));
  assert.equal(r.rights,'NOT_EVALUATED');
  assert.equal(r.physical_windows_export,'NOT_TESTED');
  assert.ok(codes(r.warnings).includes('TEXTURES_NOT_PRESERVED'));
});
test('valid PixelForge multi-mesh layout is NOT a Framefield candidate',()=>{
  const r=preflightFramefieldGlb(fixture({more:{meshes:[
    {primitives:[{attributes:{POSITION:0}}]},
    {primitives:[{attributes:{POSITION:0}}]}
  ]}}));
  assert.equal(r.framefield_candidate,false);
  assert.ok(codes(r.blockers).includes('MESH_COUNT'));
});
test('node translations are blocked until baked',()=>{
  const r=preflightFramefieldGlb(fixture({more:{nodes:[{mesh:0,translation:[1,0,0]}]}}));
  assert.ok(codes(r.blockers).includes('NODE_TRANSFORMS'));
});
test('more than 800 vertices fails bounded accessor gate without reading the whole mesh',()=>{
  const r=preflightFramefieldGlb(fixture({positions:Array(801*3).fill(0),
    indices:[0,1,2],material:false}));
  assert.ok(codes(r.blockers).includes('POSITION_BUDGET'));
});
test('BPC XR coordinate range is tracked separately from Framefield import compatibility',()=>{
  const r=preflightFramefieldGlb(fixture({positions:[31,0,0,32,0,0,31,1,0],material:false}));
  assert.equal(r.framefield_candidate,true);
  assert.equal(r.bpc_xr_candidate,false);
  assert.ok(codes(r.bpc_blockers).includes('BPC_COORD_LIMIT'));
});
test('rejects invalid material color and material reference',()=>{
  const bad=factor=>fixture({more:{materials:[{pbrMetallicRoughness:{baseColorFactor:factor}}]}});
  assert.ok(codes(preflightFramefieldGlb(bad([1,2,0,1])).blockers).includes('MATERIAL_COLOR'));
  const badRef=fixture({more:{meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:9}]}]}});
  assert.ok(codes(preflightFramefieldGlb(badRef).blockers).includes('MATERIAL_REFERENCE'));
});
test('non-interleaved accessor requirement blocks byteStride metadata',()=>{
  const r=preflightFramefieldGlb(fixture({more:{bufferViews:[
    {buffer:0,byteOffset:0,byteLength:36,byteStride:12},
    {buffer:0,byteOffset:36,byteLength:6}
  ]}}));
  assert.ok(codes(r.blockers).includes('POSITION_VIEW'));
});
test('degenerate source triangles are rejected instead of declared animation-ready',()=>{
  const r=preflightFramefieldGlb(fixture({positions:[0,0,0,1,0,0,2,0,0],material:false}));
  assert.ok(codes(r.blockers).includes('DEGENERATE_TRIANGLE'));
});
test('corrupt GLB returns a blocked report rather than a false success',()=>{
  const input=fixture();
  input.writeUInt32LE(17,8);
  const r=preflightFramefieldGlb(input);
  assert.equal(r.status,'FRAMEFIELD_IMPORT_BLOCKED');
  assert.ok(codes(r.blockers).includes('INVALID_GLB'));
});
test('malformed nodes cannot crash the preflight',()=>{
  const r=preflightFramefieldGlb(fixture({more:{nodes:{garbage:true}}}));
  assert.ok(codes(r.blockers).includes('NODE_LAYOUT'));
});
test('read-only CLI emits SHA-256 and changes no project files without --out',()=>{
  const folder=mkdtempSync(path.join(tmpdir(),'pixelforge-ff-'));
  try{
    const input=path.join(folder,'local-triangle.glb');
    writeFileSync(input,fixture());
    const script=fileURLToPath(new URL('../scripts/framefield_glb_preflight.js',import.meta.url));
    const p=spawnSync(process.execPath,[script,input],{cwd:folder,encoding:'utf8'});
    assert.equal(p.status,0,p.stderr);
    assert.match(p.stdout,/FRAMEFIELD_STATIC_IMPORT_CANDIDATE/);
    assert.match(p.stdout,/rights|license|rights clearance/i);
    assert.deepEqual(readdirSync(folder),['local-triangle.glb']);
    const invalid=path.join(folder,'garbage.glb');
    writeFileSync(invalid,Buffer.alloc(40));
    const bad=spawnSync(process.execPath,[script,invalid],{cwd:folder,encoding:'utf8'});
    assert.equal(bad.status,1);
    assert.match(bad.stdout,/FRAMEFIELD_IMPORT_BLOCKED/);
  }finally{rmSync(folder,{recursive:true,force:true});}
});
