#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { verifyUnrealExportReceipt } from './lib/unreal_export_receipt.js';

function usage(){console.log('Usage: npm run asset:unreal:verify -- /path/job.v2.json /path/unreal-export-receipt.v1.json [--out /path/verification.json]');process.exit(2)}
const args=process.argv.slice(2); if(args.length<2) usage();
const jobPath=path.resolve(args[0]), receiptPath=path.resolve(args[1]); let out='';
for(let i=2;i<args.length;i++){
  if(args[i]==='--out') out=args[++i]||'';
  else if(args[i].startsWith('--out=')) out=args[i].slice(6);
  else usage();
}
for(const file of [jobPath,receiptPath]) if(!fs.existsSync(file)){console.error(`File not found: ${file}`);process.exit(2)}
const job=JSON.parse(fs.readFileSync(jobPath,'utf8'));
const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
const result=verifyUnrealExportReceipt(job,receipt);
const output=path.resolve(out || `local-assets/receipts/${job.record_id}.pixelforge-export-verification.v1.json`);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({...result,generated_at:new Date().toISOString()},null,2)+'\n');
for(const [name,ok] of Object.entries(result.checks)) console.log(`${ok?'PASS':'FAIL'}  ${name}`);
console.log(`Status: ${result.status}`);
console.log(`Verification: ${output}`);
if(!result.verified) process.exit(1);
