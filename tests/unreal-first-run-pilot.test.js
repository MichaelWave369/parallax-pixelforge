import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {bindUnrealExportJob} from '../scripts/lib/unreal_export_job.js';
import {createExecutionReview,readBoundJob,reviewPath} from '../scripts/lib/guarded_unreal_runner.js';
import {inspectPilot,PILOT_SCHEMA} from '../scripts/lib/unreal_first_run_pilot.js';
import {HANDOFF_SCHEMA} from '../vr-studio/asset-handoff.js';

function setup(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pf-ue-pilot-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const root=path.join(dir,'repo');
  const project=path.join(dir,'Sample.uproject');
  fs.writeFileSync(project,'{"FileVersion":3}');
  const engine=path.join(dir,'UE_5_TEST');
  const editor=path.join(engine,'Engine','Binaries','Win64','UnrealEditor-Cmd.exe');
  fs.mkdirSync(path.dirname(editor),{recursive:true});
  fs.writeFileSync(editor,'fake executable for path discovery, never invoked');
  fs.mkdirSync(path.join(root,'local-assets','jobs'),{recursive:true});
  const draft={
    schema:'pixelforge.unreal-export-job.v1',
    job_id:'PF-UE-ASSET-000021-NATIVE_3D',
    state:'DRAFT_OPERATOR_BINDING_REQUIRED',record_id:'ASSET-000021',
    source_record_sha256:'1'.repeat(64),
    requested_forge_target:'NATIVE_3D',requested_interchange_format:'GLB',
    source:{unreal_asset_path:null,requires_operator_binding:true,
      storage_policy:'LOCAL_ONLY_DO_NOT_COMMIT'},
    output:{staging_root:'local-assets/staging/ASSET-000021',
      overwrite:false,manifest_required:true,hash_outputs:true},
    unreal_editor_requirements:['PythonScriptPlugin','GLTFExporter']
  };
  const bound=bindUnrealExportJob(draft,{repoRoot:root,projectPath:project,
    assetPath:'/Game/Test/SM_Cube'});
  const file=path.join(root,'local-assets','jobs',
    'ASSET-000021.unreal-export-job.v2.json');
  fs.writeFileSync(file,JSON.stringify(bound,null,2));
  const run=()=>inspectPilot({repoRoot:root,engineRoot:engine,jobPath:file,platform:'win32'});
  return {root,dir,engine,editor,project,file,bound,run};
}
function makeGlb(){
  const payload=Buffer.from(JSON.stringify({
    asset:{version:'2.0'},scenes:[{nodes:[0]}],nodes:[{mesh:0}],
    meshes:[{primitives:[{attributes:{POSITION:0}}]}],
    buffers:[{byteLength:12}],
    accessors:[{bufferView:0,componentType:5126,count:1,type:'VEC3'}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:12}]
  }));
  const json=Buffer.concat([payload,Buffer.alloc((4-payload.length%4)%4,0x20)]);
  const binary=Buffer.alloc(12);
  const buffer=Buffer.alloc(12+8+json.length+8+binary.length);
  buffer.writeUInt32LE(0x46546c67,0);
  buffer.writeUInt32LE(2,4);
  buffer.writeUInt32LE(buffer.length,8);
  buffer.writeUInt32LE(json.length,12);
  buffer.writeUInt32LE(0x4e4f534a,16);
  json.copy(buffer,20);
  const offset=20+json.length;
  buffer.writeUInt32LE(binary.length,offset);
  buffer.writeUInt32LE(0x004e4942,offset+4);
  binary.copy(buffer,offset+8);
  return buffer;
}
function writeExport(x){
  const bound=readBoundJob(x.file,x.root);
  const preview=createExecutionReview(bound,x.engine,x.root,'win32');
  const review=reviewPath(x.root,'ASSET-000021');
  fs.mkdirSync(path.dirname(review),{recursive:true});
  fs.writeFileSync(review,JSON.stringify(preview));
  fs.mkdirSync(path.dirname(bound.model),{recursive:true});
  fs.mkdirSync(path.dirname(bound.receipt),{recursive:true});
  const bytes=makeGlb();
  fs.writeFileSync(bound.model,bytes);
  const sha=crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(bound.receipt,JSON.stringify({
    schema:'pixelforge.unreal-export-receipt.v1',
    status:'PASS',record_id:'ASSET-000021',
    source_record_sha256:x.bound.source_record_sha256,
    requested_interchange_format:'GLB',
    output:{file_path:bound.model,bytes:bytes.length,sha256:sha}
  }));
  return {bound,sha};
}
const find=(report,id)=>report.checks.find(x=>x.id===id);
test('no flags: safe diagnostic displays setup needs without executing',t=>{
  const x=setup(t);
  const report=inspectPilot({repoRoot:x.root,platform:'win32'});
  assert.equal(report.schema,PILOT_SCHEMA);
  assert.equal(report.stage,'SETUP_OR_EXPORT_EVIDENCE_PENDING');
  assert.equal(find(report,'bound_job').status,'NEEDS_INPUT');
  assert.equal(find(report,'editor_binary').status,'NEEDS_INPUT');
  assert.equal(report.diagnostic_executed_unreal,false);
  assert.equal(report.browser_renderer_tested,false);
});
test('valid installed engine and bound job: safe preview readiness, not export PASS',t=>{
  const x=setup(t);
  let report=x.run();
  assert.equal(report.stage,'READY_FOR_OPERATOR_PREVIEW_OR_CONFIRMATION');
  assert.equal(find(report,'editor_binary').status,'PASS');
  assert.equal(find(report,'bound_job').status,'PASS');
  assert.equal(find(report,'operator_review').status,'WAITING');
  assert.equal(report.license_approved,false);
  assert.equal(fs.existsSync(reviewPath(x.root,'ASSET-000021')),false);
  const bound=readBoundJob(x.file,x.root);
  const preview=createExecutionReview(bound,x.engine,x.root,'win32');
  fs.mkdirSync(path.dirname(reviewPath(x.root,'ASSET-000021')),{recursive:true});
  fs.writeFileSync(reviewPath(x.root,'ASSET-000021'),JSON.stringify(preview));
  report=x.run();
  assert.equal(find(report,'operator_review').status,'PASS');
  assert.equal(report.stage,'READY_FOR_OPERATOR_PREVIEW_OR_CONFIRMATION');
});
test('original file hash and GLB structure plus matching handoff become integrity-only PASS',t=>{
  const x=setup(t);
  const {bound,sha}=writeExport(x);
  const id='ASSET-000021';
  const handoff={
    schema:HANDOFF_SCHEMA,record_id:id,
    source_record_sha256:x.bound.source_record_sha256,
    file_name:id+'.glb',file_bytes:fs.statSync(bound.model).size,
    file_sha256:sha,
    producer:'PIXELFORGE_LOCAL_UNREAL_EXPORT',
    evidence_status:'EXPORT_HASH_AND_STRUCTURE_CHECKED',
    boundary:'File integrity evidence only; not a license or compatibility approval.'
  };
  const file=path.join(x.root,'local-assets','handoffs',id+'.vr-asset-handoff.v1.json');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(handoff));
  const result=x.run();
  assert.equal(result.stage,'GLB_HANDOFF_INTEGRITY_VERIFIED',JSON.stringify(result.checks));
  assert.equal(find(result,'local_export').status,'PASS');
  assert.equal(find(result,'browser_handoff').status,'PASS');
  assert.equal(result.compatible_in_pixelforge,false);
  assert.equal(result.browser_renderer_tested,false);
  assert.ok(!JSON.stringify(result).includes(x.project));
  assert.ok(!JSON.stringify(result).includes(bound.model));
});
test('wrong GLB bytes, receipts, or handoff hashes are blocked',t=>{
  const x=setup(t);
  const {bound,sha}=writeExport(x);
  fs.appendFileSync(bound.model,Buffer.from([0]));
  let report=x.run();
  assert.equal(report.stage,'BLOCKED_REVIEW_REQUIRED');
  assert.equal(find(report,'local_export').status,'BLOCKED');
  fs.truncateSync(bound.model,fs.statSync(bound.model).size-1);
  const file=path.join(x.root,'local-assets','handoffs',
    'ASSET-000021.vr-asset-handoff.v1.json');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify({
    schema:HANDOFF_SCHEMA,record_id:'ASSET-000021',
    source_record_sha256:x.bound.source_record_sha256,
    file_name:'ASSET-000021.glb',file_bytes:fs.statSync(bound.model).size,
    file_sha256:'f'.repeat(64),
    producer:'PIXELFORGE_LOCAL_UNREAL_EXPORT',
    evidence_status:'EXPORT_HASH_AND_STRUCTURE_CHECKED',
    boundary:'Integrity only; no license or compatibility grant included in this handoff.'
  }));
  report=x.run();
  assert.equal(report.stage,'BLOCKED_REVIEW_REQUIRED');
  assert.equal(find(report,'local_export').status,'PASS');
  assert.ok(report.checks.some(v=>v.status==='BLOCKED'&&v.detail.includes('SHA-256')));
  assert.notEqual(sha,'f'.repeat(64));
});
test('partial output or stale export lock is a blocker, never permission to rerun',t=>{
  const x=setup(t);
  const bound=readBoundJob(x.file,x.root);
  fs.mkdirSync(path.dirname(bound.model),{recursive:true});
  fs.writeFileSync(bound.model,makeGlb());
  const report=x.run();
  assert.equal(report.stage,'BLOCKED_REVIEW_REQUIRED');
  assert.equal(find(report,'local_export').status,'BLOCKED');
  const lock=path.join(x.root,'local-assets','locks',
    'ASSET-000021.guarded-unreal.lock');
  fs.mkdirSync(path.dirname(lock),{recursive:true});
  fs.writeFileSync(lock,'locked');
  assert.equal(find(x.run(),'export_lock').status,'BLOCKED');
});
