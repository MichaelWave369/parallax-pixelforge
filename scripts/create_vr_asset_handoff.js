#!/usr/bin/env node
// Explicit local operator tool. Reads an existing bound job and exported receipt,
// independently verifies GLB bytes, and emits metadata only (never model bytes).
import fs from 'node:fs';
import path from 'node:path';
import {verifyUnrealExportReceipt} from './lib/unreal_export_receipt.js';
import {inspectGlbFile} from './lib/glb_inspector.js';
import {createHandoffFromVerifiedExport} from '../vr-studio/asset-handoff.js';

function main(){
  const args=process.argv.slice(2);
  if(args.length!==2||args.some(x=>x.startsWith('--'))){
    console.error('Usage: npm run asset:vr:handoff -- <local-bound-job.v2.json> <local-unreal-export-receipt.v1.json>');
    process.exitCode=2;return;
  }
  const [jobPath,receiptPath]=args.map(x=>path.resolve(x));
  try{
    for(const p of [jobPath,receiptPath]){
      if(!fs.statSync(p).isFile())throw Error('Expected local file: '+p);
      if(fs.statSync(p).size>250_000)throw Error('Oversized local job or receipt JSON.');
    }
    const job=JSON.parse(fs.readFileSync(jobPath,'utf8'));
    const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
    const verification=verifyUnrealExportReceipt(job,receipt);
    if(!verification.verified)throw Error('Local Unreal export verification failed: '+
      Object.entries(verification.checks).filter(([,ok])=>!ok).map(([key])=>key).join(', '));
    const inspection=inspectGlbFile(receipt.output.file_path);
    const handoff=createHandoffFromVerifiedExport({job,receipt,verification,inspection});
    const root=path.resolve('local-assets/handoffs');
    fs.mkdirSync(root,{recursive:true});
    const file=path.join(root,handoff.record_id+'.vr-asset-handoff.v1.json');
    // Refuse silent overwrite: every handoff is deliberate evidence.
    fs.writeFileSync(file,JSON.stringify(handoff,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log('EXPORT EVIDENCE HASH-MATCHED + STRUCTURAL GLB PASS');
    console.log('Private handoff: '+file);
    console.log('Record: '+handoff.record_id+' · GLB SHA-256: '+handoff.file_sha256);
    console.log('No GLB content copied. No rights, visual or runtime approval granted.');
  }catch(error){console.error('HANDOFF BLOCKED: '+error.message);process.exitCode=1;}
}
main();
