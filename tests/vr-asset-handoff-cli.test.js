import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {HANDOFF_SCHEMA} from '../vr-studio/asset-handoff.js';

const cli=fileURLToPath(new URL('../scripts/create_vr_asset_handoff.js',import.meta.url));
function glb(){
 const json=Buffer.from(JSON.stringify({asset:{version:'2.0'},
  buffers:[{byteLength:12}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],
  scenes:[{nodes:[0]}],nodes:[{mesh:0}],accessors:[{count:3,type:'VEC3',componentType:5126}]
 }));
 const padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
 const binary=Buffer.alloc(12);
 const out=Buffer.alloc(12+8+padded.length+8+binary.length);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);
 out.writeUInt32LE(out.length,8);
 out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);
 padded.copy(out,20);
 const p=20+padded.length;
 out.writeUInt32LE(binary.length,p);out.writeUInt32LE(0x004e4942,p+4);
 binary.copy(out,p+8);
 return out;
}
test('local CLI checks source GLB and creates metadata-only handoff without overwriting',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pixelforge-vr-handoff-'));
 try{
  const model=glb();
  const assetPath=path.join(dir,'ASSET-000021.glb');
  fs.writeFileSync(assetPath,model);
  const srcHash='a'.repeat(64);
  const job={
    schema:'pixelforge.unreal-export-job.v2',
    record_id:'ASSET-000021',source_record_sha256:srcHash,
    state:'READY_FOR_UNREAL_EXECUTION',requested_interchange_format:'GLB'
  };
  const receipt={
    schema:'pixelforge.unreal-export-receipt.v1',status:'PASS',
    record_id:'ASSET-000021',source_record_sha256:srcHash,
    requested_interchange_format:'GLB',
    output:{file_path:assetPath,bytes:model.length,
      sha256:crypto.createHash('sha256').update(model).digest('hex')}
  };
  const jobPath=path.join(dir,'job.json'),receiptPath=path.join(dir,'receipt.json');
  fs.writeFileSync(jobPath,JSON.stringify(job));fs.writeFileSync(receiptPath,JSON.stringify(receipt));
  const launch=()=>spawnSync(process.execPath,[cli,jobPath,receiptPath],
    {cwd:dir,encoding:'utf8'});
  const first=launch();
  assert.equal(first.status,0,first.stderr);
  const outputPath=path.join(dir,'local-assets','handoffs','ASSET-000021.vr-asset-handoff.v1.json');
  const payload=fs.readFileSync(outputPath,'utf8'),handoff=JSON.parse(payload);
  assert.equal(handoff.schema,HANDOFF_SCHEMA);
  assert.equal(handoff.file_sha256,receipt.output.sha256);
  assert.equal(handoff.file_bytes,model.length);
  assert.ok(!payload.includes(assetPath));
  assert.equal(fs.readdirSync(path.dirname(outputPath)).length,1);
  const again=launch();
  assert.equal(again.status,1);
  assert.match(again.stderr,/HANDOFF BLOCKED/);
  // Source changed after Unreal created the receipt: reject before generating any new handoff.
  fs.unlinkSync(outputPath);fs.appendFileSync(assetPath,Buffer.from([0]));
  const bad=launch();
  assert.equal(bad.status,1);
  assert.match(bad.stderr,/hash_match|bytes_match/);
  assert.equal(fs.existsSync(outputPath),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
