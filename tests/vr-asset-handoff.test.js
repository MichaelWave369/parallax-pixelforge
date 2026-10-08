import test from 'node:test';
import assert from 'node:assert/strict';
import {HANDOFF_SCHEMA,HANDOFF_MAX_BYTES,parseHandoff,validateHandoff,
  assertHandoffForSelection,assertHandoffHash,createHandoffFromVerifiedExport
} from '../vr-studio/asset-handoff.js';

const hash='a'.repeat(64);
const filehash='b'.repeat(64);
const job={
 schema:'pixelforge.unreal-export-job.v2',record_id:'ASSET-000021',
 source_record_sha256:hash,requested_interchange_format:'GLB',
 state:'READY_FOR_UNREAL_EXECUTION'
};
const receipt={
 schema:'pixelforge.unreal-export-receipt.v1',record_id:'ASSET-000021',
 source_record_sha256:hash,requested_interchange_format:'GLB',status:'PASS',
 output:{file_path:'C:\\local-assets\\staging\\ASSET-000021\\ASSET-000021.glb',
  bytes:16400,sha256:filehash}
};
const verification={verified:true,checks:{job_schema:true,receipt_schema:true,
 receipt_pass:true,record_matches:true,source_hash_matches:true,
 output_declared:true,output_exists:true,bytes_match:true,hash_match:true}};
const inspection={valid:true};
const create=()=>createHandoffFromVerifiedExport({job,receipt,verification,inspection});
test('binds a verified export to selected asset and file hash',()=>{
 const handoff=create();
 assert.equal(handoff.schema,HANDOFF_SCHEMA);
 assert.equal(handoff.record_id,job.record_id);
 assert.equal(handoff.file_sha256,filehash);
 assert.equal(handoff.file_name,'ASSET-000021.glb');
 assert.deepEqual(parseHandoff(JSON.stringify(handoff)),handoff);
 assert.doesNotThrow(()=>assertHandoffForSelection(handoff,'ASSET-000021',
   {name:'ASSET-000021.glb',size:16400}));
 assert.equal(assertHandoffHash(handoff,filehash),true);
 assert.equal('file_path' in handoff,false);
 assert.equal('source_path' in handoff,false);
 assert.equal('output' in handoff,false);
});
test('fails closed on mismatched record, modified bytes, filename or hash',()=>{
 const h=create();
 assert.throws(()=>assertHandoffForSelection(h,'ASSET-000022',
   {name:h.file_name,size:h.file_bytes}),/record ID/);
 assert.throws(()=>assertHandoffForSelection(h,'ASSET-000021',
   {name:'another.glb',size:h.file_bytes}),/filename or byte count/);
 assert.throws(()=>assertHandoffForSelection(h,'ASSET-000021',
   {name:h.file_name,size:h.file_bytes+1}),/filename or byte count/);
 assert.throws(()=>assertHandoffHash(h,'c'.repeat(64)),/SHA-256/);
});
test('rejects spoofed approval, URLs, bad producer or missing evidence keys',()=>{
 const h=create();
 const changes=[
  {...h,producer:'FAKE_EXPORTER'},
  {...h,evidence_status:'APPROVED_FOR_PRODUCTION'},
  {...h,file_name:'https://external.example/model.glb'},
  {...h,file_name:'../../other.glb'},
  {...h,file_sha256:'z'.repeat(64)},
  {...h,file_bytes:50000001},
  {...h,source_record_sha256:null},
  {...h,qualified_for_use:true},
  {...h,boundary:'x'}
 ];
 for(const item of changes)assert.throws(()=>validateHandoff(item));
 assert.throws(()=>parseHandoff(' '.repeat(HANDOFF_MAX_BYTES+1)));
 assert.throws(()=>parseHandoff('{"schema":'));
});
test('handoff generation requires independently passed export and structure',()=>{
 for(const bad of [
  {verification:{...verification,verified:false}},
  {verification:{...verification,checks:{...verification.checks,hash_match:false}}},
  {inspection:{valid:false}},
  {job:{...job,record_id:'ASSET-000099'}},
  {receipt:{...receipt,source_record_sha256:'c'.repeat(64)}},
  {job:{...job,requested_interchange_format:'GLTF'}},
  {receipt:{...receipt,status:'FAIL'}},
  {receipt:{...receipt,output:{...receipt.output,file_path:'C:\\secret\\model.zip'}}}
 ])assert.throws(()=>createHandoffFromVerifiedExport({
  job,receipt,verification,inspection,...bad
 }));
});
