import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectGlbBuffer, inspectGlbFile } from '../scripts/lib/glb_inspector.js';
import { sha256File, verifyUnrealExportReceipt } from '../scripts/lib/unreal_export_receipt.js';

function makeGlb(json, bin=Buffer.alloc(0)){
  let jsonBytes=Buffer.from(JSON.stringify(json),'utf8');
  const jsonPad=(4-(jsonBytes.length%4))%4;
  jsonBytes=Buffer.concat([jsonBytes,Buffer.alloc(jsonPad,0x20)]);
  const chunks=[];
  const jsonHeader=Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBytes.length,0);
  jsonHeader.writeUInt32LE(0x4e4f534a,4);
  chunks.push(jsonHeader,jsonBytes);
  if(bin.length){
    const binPad=(4-(bin.length%4))%4;
    const binBytes=Buffer.concat([bin,Buffer.alloc(binPad)]);
    const binHeader=Buffer.alloc(8);
    binHeader.writeUInt32LE(binBytes.length,0);
    binHeader.writeUInt32LE(0x004e4942,4);
    chunks.push(binHeader,binBytes);
  }
  const body=Buffer.concat(chunks);
  const header=Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67,0);
  header.writeUInt32LE(2,4);
  header.writeUInt32LE(header.length+body.length,8);
  return Buffer.concat([header,body]);
}

test('inspector accepts a valid glTF 2.0 GLB and reports useful counts',()=>{
  const glb=makeGlb({
    asset:{version:'2.0',generator:'PixelForge fixture'},
    scene:0,
    scenes:[{nodes:[0]}],
    nodes:[{mesh:0}],
    meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],
    materials:[{}],
    textures:[{source:0}],
    images:[{bufferView:1,mimeType:'image/png'}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:4}],
    buffers:[{byteLength:40}],
  },Buffer.alloc(40));
  const result=inspectGlbBuffer(glb);
  assert.equal(result.valid,true);
  assert.equal(result.container.version,2);
  assert.equal(result.container.has_binary_chunk,true);
  assert.equal(result.summary.meshes,1);
  assert.equal(result.summary.primitives,1);
  assert.equal(result.summary.materials,1);
  assert.equal(result.summary.textures,1);
});

test('inspector rejects a corrupt GLB length',()=>{
  const glb=makeGlb({asset:{version:'2.0'}});
  glb.writeUInt32LE(glb.length+4,8);
  assert.throws(()=>inspectGlbBuffer(glb),/declared length/);
});

test('inspector rejects glTF 1.x metadata inside a GLB v2 container',()=>{
  const glb=makeGlb({asset:{version:'1.0'}});
  assert.throws(()=>inspectGlbBuffer(glb),/asset.version must be 2.0/);
});

test('verified Unreal export can be structurally inspected without becoming compatibility PASS',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pf-glb-'));
  const file=path.join(dir,'ASSET-900030.glb');
  fs.writeFileSync(file,makeGlb({asset:{version:'2.0'},meshes:[{primitives:[{}]}]}));
  const job={
    schema:'pixelforge.unreal-export-job.v2',
    record_id:'ASSET-900030',
    source_record_sha256:'3'.repeat(64),
  };
  const receipt={
    schema:'pixelforge.unreal-export-receipt.v1',
    status:'PASS',
    record_id:job.record_id,
    source_record_sha256:job.source_record_sha256,
    output:{file_path:file,bytes:fs.statSync(file).size,sha256:sha256File(file)},
  };
  const verification=verifyUnrealExportReceipt(job,receipt);
  assert.equal(verification.status,'EXPORT_VERIFIED_IMPORT_PENDING');
  const inspection=inspectGlbFile(file);
  assert.equal(inspection.valid,true);
  assert.equal(inspection.summary.meshes,1);
  assert.match(verification.boundary,/does not grant source compatibility PASS/);
});
