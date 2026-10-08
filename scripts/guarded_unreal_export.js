#!/usr/bin/env node
// PixelForge v5.44: one-job-at-a-time local Unreal runner.
// DEFAULT IS REVIEW ONLY. Never called by browser or GitHub Pages.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyUnrealExportReceipt} from './lib/unreal_export_receipt.js';
import {inspectGlbFile} from './lib/glb_inspector.js';
import {createHandoffFromVerifiedExport} from '../vr-studio/asset-handoff.js';
import {readBoundJob,createExecutionReview,requireExactReview,
  reviewPath,runReceiptPath} from './lib/guarded_unreal_runner.js';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
const RUNNER=fileURLToPath(new URL('./run_python.mjs',import.meta.url));
const UE_SCRIPT=fileURLToPath(new URL('./run_unreal_export.py',import.meta.url));

function usage(){
  console.error('Preview: npm run asset:unreal:guard -- <local-bound-job.v2.json> --engine-root <installed-UE-root>');
  console.error('Execute: npm run asset:unreal:guard -- <job.v2.json> --engine-root <installed-UE-root> --execute --confirm-id ASSET-000021 --confirm-job <12-hex-prefix>');
  console.error('One bound record only. No batch/unattended execution.');
}
function parseArgs(args){
  if(!args.length||args[0].startsWith('--'))throw Error('A local v2 bound job path is required.');
  const result={job:args[0],engineRoot:null,execute:false,confirmedId:null,confirmedJob:null};
  const found=new Set();
  for(let i=1;i<args.length;i++){
    const key=args[i];
    if(!['--engine-root','--execute','--confirm-id','--confirm-job'].includes(key)||found.has(key))
      throw Error('Invalid or duplicated guard argument '+key);
    found.add(key);
    if(key==='--execute')result.execute=true;
    else {
      if(i+1>=args.length||args[i+1].startsWith('--'))throw Error('Missing '+key+' value.');
      result[({ '--engine-root':'engineRoot','--confirm-id':'confirmedId','--confirm-job':'confirmedJob'})[key]]=args[++i];
    }
  }
  if(!result.engineRoot)throw Error('Installed Unreal Engine root is required.');
  if(result.execute!==Boolean(result.confirmedId&&result.confirmedJob))
    throw Error('Execution requires --execute, --confirm-id and --confirm-job together.');
  return result;
}
function readReview(reviewFile){
  const stat=fs.statSync(reviewFile);
  if(!stat.isFile()||stat.size>16000)throw Error('Saved review is missing or oversized.');
  return JSON.parse(fs.readFileSync(reviewFile,'utf8'));
}
function writePrivate(file,data){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
}
function main(){
  let lock=null;
  try {
    const flags=parseArgs(process.argv.slice(2));
    const bound=readBoundJob(flags.job,ROOT);
    const review=createExecutionReview(bound,flags.engineRoot,ROOT);
    const reviewFile=reviewPath(ROOT,bound.job.record_id);
    if(!flags.execute){
      if(fs.existsSync(reviewFile)){
        requireExactReview(readReview(reviewFile),review,review.record_id,review.job_sha256.slice(0,12));
        console.log('Existing identical local review retained.');
      }else writePrivate(reviewFile,review);
      console.log('PREVIEW ONLY. Unreal was NOT launched.');
      console.log('RECORD: '+review.record_id);
      console.log('JOB SHA-256: '+review.job_sha256);
      console.log('APPROVAL PREFIX: '+review.job_sha256.slice(0,12));
      console.log('PROJECT: '+review.project_path);
      console.log('UNREAL OBJECT: '+review.unreal_asset_path);
      console.log('ENGINE: '+review.editor_path);
      console.log('DESTINATION: '+review.glb_path);
      console.log('LOCAL REVIEW: '+reviewFile);
      console.log('If correct, execute the command in the v5.44 docs with explicit confirmations.');
      return;
    }
    requireExactReview(readReview(reviewFile),review,flags.confirmedId,flags.confirmedJob);
    const lockFile=path.join(ROOT,'local-assets','locks',
      review.record_id+'.guarded-unreal.lock');
    fs.mkdirSync(path.dirname(lockFile),{recursive:true});
    fs.writeFileSync(lockFile,'Active operator-authorized export of '+review.job_sha256+'\n',
      {flag:'wx',mode:0o600});
    lock=lockFile;
    const started=new Date().toISOString();
    // Uses existing Unreal exporter. argv array, never shell interpolation.
    const result=spawnSync(process.execPath,
      [RUNNER,UE_SCRIPT,bound.file,'--engine-root',review.engine_root,'--execute'],
      {cwd:ROOT,stdio:'inherit',shell:false,timeout:30*60*1000});
    if(result.error)throw Error('Local Unreal command failed: '+result.error.message);
    if(result.status!==0)throw Error('Unreal exporter exited with code '+String(result.status));
    const receipt=JSON.parse(fs.readFileSync(bound.receipt,'utf8'));
    const verification=verifyUnrealExportReceipt(bound.job,receipt);
    if(!verification.verified)throw Error('Exporter verification failed: '+
      Object.entries(verification.checks).filter(([,passed])=>!passed).map(([name])=>name).join(', '));
    const inspection=inspectGlbFile(bound.model);
    const handoff=createHandoffFromVerifiedExport({
      job:bound.job,receipt,verification,inspection});
    const handoffFile=path.join(ROOT,'local-assets','handoffs',
      review.record_id+'.vr-asset-handoff.v1.json');
    writePrivate(handoffFile,handoff);
    writePrivate(runReceiptPath(ROOT,review.record_id),{
      schema:'pixelforge.guarded-unreal-invocation.v1',
      record_id:review.record_id,job_sha256:review.job_sha256,
      started_at:started,finished_at:new Date().toISOString(),
      status:'EXPORT_VERIFIED_HANDOFF_READY',
      output_glb:bound.model,output_sha256:handoff.file_sha256,
      handoff_file:handoffFile,
      authority:'LOCAL_OPERATOR_CONFIRMATION',
      boundary:'File production and structural integrity checked, but no license, material parity, runtime readiness or headset qualification is granted.'
    });
    console.log('PASS: LOCAL EXPORT VERIFIED + HANDOFF READY: '+handoffFile);
    console.log('Open PixelForge VR Studio and select the same ID, handoff JSON, and exact GLB.');
  }catch(error){
    console.error('GUARDED EXPORT BLOCKED: '+error.message);
    process.exitCode=1;
  }finally{
    if(lock&&fs.existsSync(lock))fs.unlinkSync(lock);
  }
}
if(!process.argv.slice(2).length){usage();process.exitCode=2;}
else main();
