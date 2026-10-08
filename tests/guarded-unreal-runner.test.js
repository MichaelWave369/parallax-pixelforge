import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bindUnrealExportJob} from '../scripts/lib/unreal_export_job.js';
import {readBoundJob,createExecutionReview,requireExactReview,
  reviewPath,runReceiptPath,REVIEW_SCHEMA} from '../scripts/lib/guarded_unreal_runner.js';

const entry=fileURLToPath(new URL('../scripts/guarded_unreal_export.js',import.meta.url));
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pixelforge-guard-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const root=path.join(dir,'repo');
  fs.mkdirSync(path.join(root,'local-assets','jobs'),{recursive:true});
  const proj=path.join(dir,'Scene.uproject');
  fs.writeFileSync(proj,'{}');
  const engine=path.join(dir,'Epic','UE_TEST');
  const platform=process.platform==='win32'?'win32':'linux';
  const exe=path.join(engine,'Engine','Binaries',
    platform==='win32'?'Win64':'Linux',
    platform==='win32'?'UnrealEditor-Cmd.exe':'UnrealEditor-Cmd');
  fs.mkdirSync(path.dirname(exe),{recursive:true});fs.writeFileSync(exe,'fixture');
  const v1={
    schema:'pixelforge.unreal-export-job.v1',job_id:'PF-UE-ASSET-900021-NATIVE_3D',
    state:'DRAFT_OPERATOR_BINDING_REQUIRED',record_id:'ASSET-900021',
    source_record_sha256:'1'.repeat(64),requested_forge_target:'NATIVE_3D',
    requested_interchange_format:'GLB',
    source:{unreal_asset_path:null,requires_operator_binding:true,storage_policy:'LOCAL_ONLY_DO_NOT_COMMIT'},
    output:{staging_root:'local-assets/staging/ASSET-900021',overwrite:false,
      manifest_required:true,hash_outputs:true},
    unreal_editor_requirements:['PythonScriptPlugin','GLTFExporter']
  };
  const bound=bindUnrealExportJob(v1,{repoRoot:root,projectPath:proj,
    assetPath:'/Game/Fantasy/SM_Example'});
  const file=path.join(root,'local-assets','jobs','ASSET-900021.unreal-export-job.v2.json');
  fs.writeFileSync(file,JSON.stringify(bound));
  return {dir,root,engine,exe,file,bound};
}
test('local guard requires a concrete, full-path v2 job and creates a review only',t=>{
  const x=fixture(t);
  const job=readBoundJob(x.file,x.root);
  assert.equal(job.job.record_id,'ASSET-900021');
  assert.equal(job.jobHash.length,64);
  const review=createExecutionReview(job,x.engine,x.root);
  assert.equal(review.schema,REVIEW_SCHEMA);
  assert.equal(review.state,'REVIEW_REQUIRED');
  assert.equal(review.authority,'SINGLE_ASSET_OPERATOR_CONFIRMATION_ONLY');
  assert.equal(review.editor_path,x.exe);
  assert.equal(review.unreal_asset_path,'/Game/Fantasy/SM_Example');
  assert.equal(reviewPath(x.root,'ASSET-900021').includes('/local-assets/')||
    reviewPath(x.root,'ASSET-900021').includes('\\local-assets\\'),true);
  assert.match(runReceiptPath(x.root,'ASSET-900021'),/guarded-unreal-invocation.v1.json$/);
  assert.equal(requireExactReview(review,review,review.record_id,review.job_sha256.slice(0,12)),true);
});
test('operator approval refuses mutated review, wrong record ID, or wrong hash prefix',t=>{
  const x=fixture(t);
  const original=createExecutionReview(readBoundJob(x.file,x.root),x.engine,x.root);
  const prefix=original.job_sha256.slice(0,12);
  assert.throws(()=>requireExactReview(original,original,'ASSET-900022',prefix),/record ID/);
  assert.throws(()=>requireExactReview(original,original,original.record_id,'a'.repeat(12)),/SHA-256/);
  assert.throws(()=>requireExactReview({...original,authority:'RUN_NOW'},original,original.record_id,prefix),/stale or modified/);
  assert.throws(()=>requireExactReview({...original,extra:true},original,original.record_id,prefix),/stale or modified/);
  // Edited job bytes invalidate the previous preview, even if record ID is unchanged.
  fs.writeFileSync(x.file,JSON.stringify({...x.bound,operator_note:'changed'}));
  const updated=createExecutionReview(readBoundJob(x.file,x.root),x.engine,x.root);
  assert.notEqual(updated.job_sha256,original.job_sha256);
  assert.throws(()=>requireExactReview(original,updated,updated.record_id,updated.job_sha256.slice(0,12)),/stale or modified/);
});
test('guard blocks dangerous formats, output redirection and symlink escapes',t=>{
  const x=fixture(t);
  const variations=[
    {...x.bound,requested_interchange_format:'GLTF'},
    {...x.bound,requested_forge_target:'FEATURE_REFERENCE'},
    {...x.bound,output:{...x.bound.output,overwrite:true}},
    {...x.bound,source:{...x.bound.source,unreal_asset_path:'/Engine/Secret'}},
    {...x.bound,source:{...x.bound.source,requires_operator_binding:true}},
    {...x.bound,output:{...x.bound.output,staging_root:x.dir}},
    {...x.bound,output:{...x.bound.output,receipt_path:path.join(x.dir,'wrong.json')}},
    {...x.bound,output:{...x.bound.output,hash_outputs:false}}
  ];
  for(const entry of variations){
    fs.writeFileSync(x.file,JSON.stringify(entry));
    assert.throws(()=>readBoundJob(x.file,x.root));
  }
  fs.writeFileSync(x.file,JSON.stringify(x.bound));
  const staging=path.join(x.root,'local-assets','staging');
  fs.mkdirSync(staging,{recursive:true});
  const actual=path.join(x.dir,'external');
  fs.mkdirSync(actual);
  const link=path.join(staging,'ASSET-900021');
  try {
    fs.symlinkSync(actual,link,process.platform==='win32'?'junction':'dir');
    assert.throws(()=>readBoundJob(x.file,x.root),/symlink/);
  }catch(error){
    if(!['EPERM','EACCES','ENOTSUP'].includes(error.code))throw error;
  }
});
test('review refuses an existing export, receipt, handoff or guarded run',t=>{
  const x=fixture(t);
  const bound=readBoundJob(x.file,x.root);
  const all=[
    bound.model,bound.receipt,
    path.join(x.root,'local-assets','handoffs','ASSET-900021.vr-asset-handoff.v1.json'),
    runReceiptPath(x.root,'ASSET-900021')
  ];
  for(const p of all){
    fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,'no overwrite');
    assert.throws(()=>createExecutionReview(bound,x.engine,x.root),/already exists/);
    fs.unlinkSync(p);
  }
  assert.throws(()=>createExecutionReview(bound,path.join(x.dir,'missing-engine'),x.root),/UnrealEditor-Cmd/);
});
test('real guarded CLI cannot execute with no review, no confirmation or extra arguments',()=>{
  const invoke=args=>spawnSync(process.execPath,[entry,...args],{encoding:'utf8'});
  assert.equal(invoke([]).status,2);
  assert.equal(invoke(['--execute']).status,1);
  assert.equal(invoke(['anything','--execute']).status,1);
  assert.equal(invoke(['anything','--engine-root','fake','--execute']).status,1);
  assert.equal(invoke(['anything','--engine-root','fake','--execute','--confirm-id','ASSET-900021']).status,1);
});
