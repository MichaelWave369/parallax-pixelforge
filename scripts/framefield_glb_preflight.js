#!/usr/bin/env node
// Read-only explicit file analysis. Never exports, launches Unreal, or uploads assets.
import fs from 'node:fs';
import path from 'node:path';
import {preflightFramefieldGlb,FRAMEFIELD_PROFILE} from './lib/framefield_glb_preflight.js';

function usage(){
  console.log('Usage: npm run asset:framefield:preflight -- /path/to/export.glb [--json] [--out report.json]');
  console.log('Reads exactly one operator-selected local GLB. Default: no output files written.');
}
const args=process.argv.slice(2);
if(args.includes('--help')||args.includes('-h')){usage();process.exit(0);}
let input=null,out=null,asJson=false;
for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==='--json')asJson=true;
  else if(arg==='--out'){
    out=args[++i];
    if(!out||out.startsWith('--')){usage();process.exit(2);}
  }else if(!arg.startsWith('--')&&!input)input=arg;
  else{usage();process.exit(2);}
}
if(!input){usage();process.exit(2);}
try{
  const full=path.resolve(input);
  const stat=fs.statSync(full);
  if(!stat.isFile())throw Error('Input is not a regular file.');
  // Check before reading; never allocate huge buffers for an untrusted asset.
  if(stat.size<20||stat.size>FRAMEFIELD_PROFILE.max_bytes)
    throw Error('GLB file is outside the 20-byte to 16-MiB preflight safety envelope.');
  const report=preflightFramefieldGlb(fs.readFileSync(full));
  if(asJson)console.log(JSON.stringify(report,null,2));
  else{
    console.log('PixelForge -> Framefield preflight:',report.status);
    console.log('Original bytes:',report.source.bytes,'SHA-256:',report.source.sha256);
    console.log('Framefield static import candidate:',report.framefield_candidate);
    console.log('BPC XR contract candidate:',report.bpc_xr_candidate);
    for(const item of report.blockers)console.log('BLOCK',item.code+':',item.message,'NEXT:',item.action);
    for(const item of report.bpc_blockers)console.log('BPC',item.code+':',item.message);
    for(const item of report.warnings)console.log('WARN',item.code+':',item.message);
    console.log('Boundary:',report.boundary);
  }
  if(out){
    const output=path.resolve(out);
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log('Operator-requested local report written:',path.basename(output));
  }
  if(!report.framefield_candidate)process.exitCode=1;
}catch(error){
  console.error('Framefield preflight blocked:',String(error.message).slice(0,250));
  process.exitCode=2;
}
