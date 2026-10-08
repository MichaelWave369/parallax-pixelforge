#!/usr/bin/env node
// Local-only queue PLANNER. Cannot bind /Game paths or run Unreal Editor.
import fs from 'node:fs';
import path from 'node:path';
import {parseAssetCatalog,canPlanGlb,CATALOG_BYTES} from '../vr-studio/asset-catalog.js';
import {parseExportQueue,EXPORT_QUEUE_BYTES} from '../vr-studio/export-queue.js';
import {buildExternalAssetPassport,buildUnrealExportJob,
  EXTERNAL_ASSET_SCHEMA} from './lib/external_asset_forge.js';

function readLimited(file,max){
  const p=path.resolve(file);
  if(!fs.statSync(p).isFile()||fs.statSync(p).size>max)
    throw Error('Missing/oversized private input: '+p);
  return fs.readFileSync(p,'utf8');
}
function plan(catalogPath,queuePath) {
  const text=readLimited(catalogPath,CATALOG_BYTES);
  const raw=JSON.parse(text);
  const records=Array.isArray(raw)?raw:
    raw?.schema==='pixelforge.external-asset-registry.v1'?raw.passports:null;
  if(!Array.isArray(records))throw Error('Expected a governed private records array or v5.28 registry.');
  const normalized=parseAssetCatalog(text);
  const queue=parseExportQueue(readLimited(queuePath,EXPORT_QUEUE_BYTES));
  const lookup=new Map(records.map(record=>[record.record_id,record]));
  const eligible=new Map(normalized.map(asset=>[asset.id,asset]));
  const jobs=queue.record_ids.map(id=>{
    const asset=eligible.get(id);
    const record=lookup.get(id);
    if(!record||!canPlanGlb(asset))
      throw Error('Queue item is not a known static 3D export candidate: '+id);
    // Reverify against the authoritative local records, not browser-supplied classifications.
    const passport=record.schema===EXTERNAL_ASSET_SCHEMA?
      record:buildExternalAssetPassport(record);
    if(passport.record_id!==id||passport.pixelforge_lane!=='PORTABLE'||
       !passport.forge_targets.includes('NATIVE_3D'))
      throw Error('Local source passport does not qualify for draft NATIVE_3D routing: '+id);
    const job=buildUnrealExportJob(passport,{mode:'NATIVE_3D',format:'GLB'});
    if(job.state!=='DRAFT_OPERATOR_BINDING_REQUIRED'||
       job.source.unreal_asset_path!==null||job.source.requires_operator_binding!==true)
      throw Error('Unexpectedly executable export job for '+id);
    return {id,job};
  });
  const dir=path.resolve('local-assets/jobs/queue-drafts');
  // Do not overwrite even one existing local job, regardless of the requested queue.
  for(const item of jobs) {
    const output=path.join(dir,item.id+'.unreal-export-job.v1.json');
    if(fs.existsSync(output))throw Error('Refusing overwrite of existing queue draft: '+output);
  }
  fs.mkdirSync(dir,{recursive:true});
  for(const {id,job} of jobs) {
    const output=path.join(dir,id+'.unreal-export-job.v1.json');
    fs.writeFileSync(output,JSON.stringify(job,null,2)+'\n',{flag:'wx',mode:0o600});
  }
  return jobs.length;
}
const args=process.argv.slice(2);
if(args.length!==3||args[2]!=='--confirm-plan'){
  console.error('Usage: npm run asset:unreal:queue:plan -- <local-governed-records.json> <reviewed-queue.json> --confirm-plan');
  console.error('Only local DRAFT export jobs are produced. No Unreal command executes.');
  process.exitCode=2;
}else{
  try{
    const count=plan(args[0],args[1]);
    console.log('PLANNED '+count+' operator-bound DRAFT jobs in ignored local-assets/jobs/queue-drafts/');
    console.log('NEXT: review each draft, bind a genuine .uproject and /Game asset path separately; execute only by an explicit later operator action.');
    console.log('NO Unreal process ran, no compatibility/license approval or purchased binary publication.');
  }catch(error){
    console.error('EXPORT QUEUE PLAN BLOCKED: '+error.message);
    process.exitCode=1;
  }
}
