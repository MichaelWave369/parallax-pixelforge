// PixelForge v5.44: local-only Unreal export execution guard.
// Pure validation/plan helpers. No remote authority and no browser usage.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {normalizeUnrealAssetPath} from './unreal_export_job.js';

export const REVIEW_SCHEMA='pixelforge.unreal-operator-review.v1';
const ID=/^ASSET-[0-9]{6}$/;
const SHA=/^[a-f0-9]{64}$/;

const inside=(parent,child)=>{
  const relative=path.relative(parent,child);
  return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);
};
function requireLocalPath(value,root,label) {
  if(typeof value!=='string'||!path.isAbsolute(value))throw Error(label+' must be an absolute path.');
  const target=path.resolve(value),allowed=path.resolve(root);
  if(!inside(allowed,target))throw Error(label+' must remain inside '+allowed);
  // Reject existing symlink components, not only traversal via ../.
  let at=allowed;
  if(fs.existsSync(at)&&fs.lstatSync(at).isSymbolicLink())throw Error(label+' has a symlinked root.');
  const fragments=path.relative(allowed,target).split(path.sep);
  for(const name of fragments){
    at=path.join(at,name);
    if(fs.existsSync(at)&&fs.lstatSync(at).isSymbolicLink())
      throw Error(label+' may not traverse a symlink.');
  }
  return target;
}
export function readBoundJob(jobPath,repoRoot){
  const base=path.resolve(repoRoot),file=path.resolve(jobPath);
  requireLocalPath(file,path.join(base,'local-assets','jobs'),'Bound job');
  const stat=fs.statSync(file);
  if(!stat.isFile()||stat.size<50||stat.size>250_000)
    throw Error('Bound job is missing or too large.');
  const bytes=fs.readFileSync(file);
  const job=JSON.parse(bytes.toString('utf8'));
  if(job?.schema!=='pixelforge.unreal-export-job.v2'||
     job.state!=='READY_FOR_UNREAL_EXECUTION'||
     !ID.test(job.record_id||'')||!SHA.test(job.source_record_sha256||'')||
     job.requested_forge_target!=='NATIVE_3D'||
     job.requested_interchange_format!=='GLB'||
     job.source?.requires_operator_binding!==false||
     job.source?.storage_policy!=='LOCAL_ONLY_DO_NOT_COMMIT'||
     typeof job.source?.project_path!=='string'||
     job.source?.unreal_asset_path!==normalizeUnrealAssetPath(job.source?.unreal_asset_path)||
     !job.source.unreal_asset_path.startsWith('/Game/')||
     job.output?.overwrite!==false||job.output?.hash_outputs!==true||
     job.output?.manifest_required!==true)
    throw Error('Bound job missing explicit local-only export policy.');
  const project=path.resolve(job.source.project_path);
  if(!path.isAbsolute(job.source.project_path)||path.extname(project).toLowerCase()!=='.uproject'||
     !fs.statSync(project).isFile())throw Error('Bound Unreal project not found.');
  const staging=requireLocalPath(job.output.staging_root,
    path.join(base,'local-assets','staging'),'Staging');
  const receipt=requireLocalPath(job.output.receipt_path,
    path.join(base,'local-assets','receipts'),'Unreal receipt');
  if(path.basename(receipt)!==job.record_id+'.unreal-export-receipt.v1.json')
    throw Error('Receipt path does not match governed record ID.');
  const model=path.join(staging,job.record_id+'.glb');
  return {file,job,jobHash:crypto.createHash('sha256').update(bytes).digest('hex'),
    project,staging,receipt,model};
}
export function editorBinary(engineRoot,platform=process.platform) {
  const root=path.resolve(engineRoot),engine=fs.existsSync(path.join(root,'Engine'))?
    path.join(root,'Engine'):root;
  return path.join(engine,'Binaries',
    platform==='win32'?'Win64':'Linux',
    platform==='win32'?'UnrealEditor-Cmd.exe':'UnrealEditor-Cmd');
}
export function createExecutionReview(bound,engineRoot,repoRoot,platform=process.platform){
  const engine=path.resolve(engineRoot),exe=editorBinary(engine,platform);
  if(!fs.statSync(exe).isFile())throw Error('UnrealEditor-Cmd not found: '+exe);
  if(fs.existsSync(bound.model)||fs.existsSync(bound.receipt))
    throw Error('Export output or receipt already exists; no overwrite permitted.');
  const handoff=path.join(repoRoot,'local-assets','handoffs',
    bound.job.record_id+'.vr-asset-handoff.v1.json');
  if(fs.existsSync(handoff))throw Error('A handoff already exists for this ID. Archive it first.');
  const existingRun=runReceiptPath(repoRoot,bound.job.record_id);
  if(fs.existsSync(existingRun))throw Error('An operator run receipt already exists; reruns require an explicit new job.');
  return {
    schema:REVIEW_SCHEMA,state:'REVIEW_REQUIRED',
    record_id:bound.job.record_id,source_record_sha256:bound.job.source_record_sha256,
    job_path:bound.file,job_sha256:bound.jobHash,
    project_path:bound.project,unreal_asset_path:bound.job.source.unreal_asset_path,
    engine_root:engine,editor_path:exe,glb_path:bound.model,receipt_path:bound.receipt,
    authority:'SINGLE_ASSET_OPERATOR_CONFIRMATION_ONLY',
    boundary:'Review binds one locally installed Unreal asset and one immutable job hash. Preview never launches Unreal. Actual execution requires a matching saved review and two explicit CLI confirmations; no source license or runtime compatibility approval.'
  };
}
export function reviewPath(repoRoot,recordId){
  if(!ID.test(recordId))throw Error('Invalid review record ID.');
  return path.join(repoRoot,'local-assets','reviews',
    recordId+'.unreal-operator-review.v1.json');
}
export function runReceiptPath(repoRoot,recordId){
  if(!ID.test(recordId))throw Error('Invalid guarded-run record ID.');
  return path.join(repoRoot,'local-assets','receipts',
    recordId+'.guarded-unreal-invocation.v1.json');
}
export function requireExactReview(review,expected,confirmedId,confirmedShaPrefix) {
  if(!review||Object.keys(review).length!==Object.keys(expected).length||
    Object.keys(expected).some(key=>review[key]!==expected[key]))
    throw Error('Review is stale or modified. Regenerate manually before executing.');
  if(confirmedId!==expected.record_id)
    throw Error('Operator-confirmed record ID does not match the job.');
  if(typeof confirmedShaPrefix!=='string'||!/^[a-f0-9]{12}$/.test(confirmedShaPrefix)||
     !expected.job_sha256.startsWith(confirmedShaPrefix))
    throw Error('Operator must confirm the first 12 characters of the current job SHA-256.');
  return true;
}
