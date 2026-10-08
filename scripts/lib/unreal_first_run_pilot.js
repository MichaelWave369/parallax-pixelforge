// PixelForge v5.45: read-only workstation qualification.
// No Unreal execution, private-asset import, remote request, or authority change.
import fs from 'node:fs';
import path from 'node:path';
import {readBoundJob,editorBinary,createExecutionReview,
  requireExactReview,reviewPath,runReceiptPath} from './guarded_unreal_runner.js';
import {verifyUnrealExportReceipt} from './unreal_export_receipt.js';
import {inspectGlbFile} from './glb_inspector.js';
import {parseHandoff,assertHandoffForSelection,assertHandoffHash} from '../../vr-studio/asset-handoff.js';

export const PILOT_SCHEMA='pixelforge.unreal-first-run-pilot.v1';
const MAX_JSON=250_000;
function readJson(file,max=MAX_JSON) {
  const stat=fs.statSync(file);
  if(!stat.isFile()||stat.size<2||stat.size>max)throw Error('Missing or oversized local JSON: '+file);
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function checkExists(file){return fs.existsSync(file)&&fs.statSync(file).isFile();}
function check(id,status,detail) {return {id,status,detail:String(detail).slice(0,350)};}
function inspectLocalExport(bound) {
  if(!checkExists(bound.model)||!checkExists(bound.receipt))
    throw Error('Both local GLB and original Unreal receipt must exist.');
  const receipt=readJson(bound.receipt);
  // A receipt must not redirect the inspector to an arbitrary private drive path.
  if(path.resolve(receipt?.output?.file_path||'')!==path.resolve(bound.model))
    throw Error('Receipt GLB path differs from the approved bound-job output.');
  const verified=verifyUnrealExportReceipt(bound.job,receipt);
  if(!verified.verified)throw Error('Unreal export receipt failed checks: '+
    Object.entries(verified.checks).filter(([,v])=>!v).map(([k])=>k).join(', '));
  const inspection=inspectGlbFile(bound.model);
  if(inspection.valid!==true)throw Error('GLB structural inspection did not pass.');
  return {receipt,inspection};
}
export function inspectPilot({repoRoot,jobPath=null,engineRoot=null,platform=process.platform}){
  const root=path.resolve(repoRoot);
  const checks=[];
  const add=(id,status,detail)=>{checks.push(check(id,status,detail));};
  add('platform',platform==='win32'?'PASS':'INFO',
    platform==='win32'?'Windows workstation detected.':
      'This path is designed for Windows + an installed Unreal Editor. Fixture tests run on other OSes.');
  const privateRoot=path.join(root,'local-assets');
  if(fs.existsSync(privateRoot)&&fs.lstatSync(privateRoot).isSymbolicLink())
    add('private_workspace','BLOCKED','local-assets is a symlink; inspection refuses redirected private output.');
  else add('private_workspace','PASS','Private assets must remain under gitignored local-assets.');
  const engine=engineRoot?path.resolve(engineRoot):null;
  let exe=null,engineReady=false;
  if(!engine){
    add('editor_binary','NEEDS_INPUT','Supply --engine-root pointing to a locally installed Unreal Engine.');
  }else{
    exe=editorBinary(engine,platform);
    engineReady=checkExists(exe);
    add('editor_binary',engineReady?'PASS':'BLOCKED',
      engineReady?'UnrealEditor-Cmd binary found. Plugins and actual launch remain untested.':
        'UnrealEditor-Cmd not found under the provided engine root.');
  }
  let bound=null;
  if(!jobPath) add('bound_job','NEEDS_INPUT',
    'Create a v2 job using the existing Unreal discovery and explicit /Game path binding.');
  else if(checks.some(x=>x.id==='private_workspace'&&x.status==='BLOCKED'))
    add('bound_job','BLOCKED','Unsafe private workspace; refusing to read bound job.');
  else {
    try{
      bound=readBoundJob(jobPath,root);
      add('bound_job','PASS','Bound GLB job '+bound.job.record_id+
        ', source SHA linked, private output paths validated.');
    }catch(error){add('bound_job','BLOCKED',error.message);}
  }
  let readyForReview=false;
  let handoffVerified=false;
  if(bound) {
    const id=bound.job.record_id,model=bound.model,receipt=bound.receipt;
    const hasModel=fs.existsSync(model),hasReceipt=fs.existsSync(receipt);
    const reviewFile=reviewPath(root,id);
    const lock=path.join(root,'local-assets','locks',id+'.guarded-unreal.lock');
    if(fs.existsSync(lock)){
      add('export_lock','BLOCKED','A guarded export lock exists; inspect running processes before any new export.');
    }else add('export_lock','PASS','No guarded export lock present.');
    if(!hasModel&&!hasReceipt){
      add('local_export','WAITING','No GLB or Unreal receipt yet. Export has not been proven.');
      if(engineReady) {
        try{
          const expected=createExecutionReview(bound,engine,root,platform);
          if(checkExists(reviewFile)){
            const reviewed=readJson(reviewFile,16_000);
            requireExactReview(reviewed,expected,id,bound.jobHash.slice(0,12));
            readyForReview=true;
            add('operator_review','PASS','Exact operator review matches current job SHA. Still requires explicit --execute confirmation.');
          }else{
            readyForReview=true;
            add('operator_review','WAITING','Ready to run guarded preview and create a local operator review.');
          }
        }catch(error){add('operator_review','BLOCKED',error.message);}
      }else add('operator_review','WAITING','UE editor and valid bound job required before review.');
    } else {
      if(checkExists(reviewFile)){
        try {
          const reviewed=readJson(reviewFile,16_000);
          if(reviewed.schema!=='pixelforge.unreal-operator-review.v1'||
             reviewed.state!=='REVIEW_REQUIRED'||
             reviewed.authority!=='SINGLE_ASSET_OPERATOR_CONFIRMATION_ONLY'||
             reviewed.record_id!==id||reviewed.job_sha256!==bound.jobHash||
             reviewed.project_path!==bound.project||
             reviewed.unreal_asset_path!==bound.job.source.unreal_asset_path||
             (engineReady&&reviewed.editor_path!==exe))
            throw Error('Operator review does not match the current bound job and engine.');
          add('operator_review','PASS',
            'Saved review matches the bound job identity and job hash. Execution still not inferred.');
        }catch(error){add('operator_review','BLOCKED',error.message);}
      }else add('operator_review','BLOCKED',
        'No saved operator review; outputs cannot be credited to guarded execution.');
      if(hasModel!==hasReceipt){
        add('local_export','BLOCKED','Partial export: GLB and receipt must both exist; investigate before retry.');
      }else {
        try{
          const {receipt:exportReceipt,inspection}=inspectLocalExport(bound);
          add('local_export','PASS','GLB bytes, SHA-256 and structural glTF inspection match local Unreal receipt.');
          const handoffPath=path.join(root,'local-assets','handoffs',
            id+'.vr-asset-handoff.v1.json');
          if(!checkExists(handoffPath)) {
            add('browser_handoff','WAITING','Export verified but v5.42 browser handoff not found.');
          }else {
            const handoff=parseHandoff(fs.readFileSync(handoffPath,'utf8'));
            assertHandoffForSelection(handoff,id,{
              name:path.basename(bound.model),size:fs.statSync(bound.model).size
            });
            assertHandoffHash(handoff,exportReceipt.output.sha256);
            if(handoff.source_record_sha256!==bound.job.source_record_sha256)
              throw Error('Browser handoff source-record hash does not match bound job.');
            handoffVerified=true;
            add('browser_handoff','PASS','Verified metadata links the exact GLB to the catalog record. GPU fidelity untested.');
          }
          // Diagnostic only. Presence of a run audit is not a source-rights credential.
          const audit=runReceiptPath(root,id);
          if(checkExists(audit)){
            const v=readJson(audit);
            add('guarded_run_audit',v.schema==='pixelforge.guarded-unreal-invocation.v1'&&
              v.job_sha256===bound.jobHash&&v.record_id===id&&
              v.output_sha256===exportReceipt.output.sha256&&
              v.status==='EXPORT_VERIFIED_HANDOFF_READY'?
              'PASS':'BLOCKED','Guarded invocation audit recorded; identity checked against current bound job.');
          }else add('guarded_run_audit','INFO','No guarded-run audit on disk; export may have used a different local path.');
        }catch(error){add('local_export','BLOCKED',error.message);}
      }
    }
  }
  const blocked=checks.some(c=>c.status==='BLOCKED');
  const stage=blocked?'BLOCKED_REVIEW_REQUIRED':
    handoffVerified?'GLB_HANDOFF_INTEGRITY_VERIFIED':
    readyForReview?'READY_FOR_OPERATOR_PREVIEW_OR_CONFIRMATION':
    'SETUP_OR_EXPORT_EVIDENCE_PENDING';
  return {
    schema:PILOT_SCHEMA,generated_at:new Date().toISOString(),
    stage,record_id:bound?.job.record_id??null,
    job_sha256:bound?.jobHash??null,
    checks,
    // Intentionally no full local source paths or private catalog content in the report.
    diagnostic_executed_unreal:false,
    browser_renderer_tested:false,
    license_approved:false,
    compatible_in_pixelforge:false,
    boundary:'Read-only local diagnostics. A GLB integrity PASS does not qualify licensing, marketplace redistribution, visual parity, performance, gameplay, physical VR, or PixelForge renderer compatibility.'
  };
}
