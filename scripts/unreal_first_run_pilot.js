#!/usr/bin/env node
// v5.45: read-only workstation preflight, with a private diagnostic receipt.
// NO Unreal process, export, browser upload or agent permission is invoked.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectPilot} from './lib/unreal_first_run_pilot.js';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
function usage(){
  console.log('Usage: npm run asset:unreal:pilot -- [--engine-root "C:/Program Files/Epic Games/UE_5.x"] [--job local-assets/jobs/ASSET-000021.unreal-export-job.v2.json]');
  console.log('Safe: creates a private diagnostic report under ignored local-assets/reports/. Never runs Unreal.');
}
function args(argv){
  const result={engineRoot:null,jobPath:null};
  const seen=new Set();
  for(let i=0;i<argv.length;i++){
    const key=argv[i];
    if(!['--engine-root','--job'].includes(key)||seen.has(key)||!argv[i+1]||argv[i+1].startsWith('--'))
      throw Error('Invalid, duplicate, or incomplete argument '+key);
    seen.add(key);
    result[key==='--engine-root'?'engineRoot':'jobPath']=argv[++i];
  }
  return result;
}
function writeReport(report){
  const parent=path.join(ROOT,'local-assets');
  const dir=path.join(parent,'reports');
  if(fs.existsSync(parent)&&fs.lstatSync(parent).isSymbolicLink())
    throw Error('Private local-assets is a symlink: report not written.');
  if(fs.existsSync(dir)&&fs.lstatSync(dir).isSymbolicLink())
    throw Error('Private reports directory is a symlink: report not written.');
  fs.mkdirSync(dir,{recursive:true});
  const stamp=report.generated_at.replace(/[-:]/g,'').replace(/[.Z]/g,'');
  const dest=path.join(dir,'unreal-first-run-'+stamp+'-'+crypto.randomBytes(4).toString('hex')+'.json');
  fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  return dest;
}
if(process.argv.includes('--help')||process.argv.includes('-h')){
  usage();
}else{
  try{
    const flags=args(process.argv.slice(2));
    const report=inspectPilot({repoRoot:ROOT,
      engineRoot:flags.engineRoot,jobPath:flags.jobPath});
    console.log('PIXELFORGE LOCAL UE PILOT: '+report.stage);
    for(const item of report.checks)
      console.log('['+item.status+'] '+item.id+': '+item.detail);
    const file=writeReport(report);
    console.log('Private report: '+file);
    console.log('NO Unreal Editor execution, catalog upload, rendering approval or rights claim.');
    // Missing input is a reportable setup state, not a command failure.
    if(report.stage==='BLOCKED_REVIEW_REQUIRED')process.exitCode=1;
  }catch(error){
    console.error('PILOT REPORT BLOCKED: '+error.message);
    process.exitCode=2;
  }
}
