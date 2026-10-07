#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { verifyUnrealExportReceipt } from './lib/unreal_export_receipt.js';
import { inspectGlbFile } from './lib/glb_inspector.js';

function usage(){
  console.log('Usage: npm run asset:external:qualify -- /path/job.v2.json /path/unreal-export-receipt.v1.json [--out /path/qualification.json]');
  process.exit(2);
}
const args=process.argv.slice(2);
if(args.length<2) usage();
const jobPath=path.resolve(args[0]), receiptPath=path.resolve(args[1]);
let out='';
for(let i=2;i<args.length;i++){
  if(args[i]==='--out') out=args[++i]||'';
  else if(args[i].startsWith('--out=')) out=args[i].slice(6);
  else usage();
}
for(const file of [jobPath,receiptPath]){
  if(!fs.existsSync(file)){console.error(`File not found: ${file}`);process.exit(2)}
}

const job=JSON.parse(fs.readFileSync(jobPath,'utf8'));
const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
const verification=verifyUnrealExportReceipt(job,receipt);
let inspection=null;
let structuralPass=false;
let structuralError=null;

if(verification.verified){
  try{
    inspection=inspectGlbFile(receipt.output.file_path);
    structuralPass=inspection.valid === true;
  }catch(error){
    structuralError=error.message;
  }
}

const passed=verification.verified && structuralPass;
const qualification={
  schema:'pixelforge.external-interchange-qualification.v1',
  generated_at:new Date().toISOString(),
  record_id:job.record_id,
  source_record_sha256:job.source_record_sha256,
  passed,
  status:passed?'INTERCHANGE_STRUCTURAL_PASS_RUNTIME_IMPORT_PENDING':'INTERCHANGE_STRUCTURAL_FAIL',
  export_verification:verification,
  glb_inspection:inspection ? {
    container:inspection.container,
    asset:inspection.asset,
    summary:inspection.summary,
    extensions_used:inspection.extensions_used,
    extensions_required:inspection.extensions_required,
    default_scene:inspection.default_scene,
  } : null,
  structural_error:structuralError,
  boundary:'Structural qualification proves an intact glTF 2.0 interchange container tied to a verified Unreal export. It does not prove rendering fidelity, material parity, collision, scale, performance, license approval, runtime import, or compatibility PASS.',
};
const output=path.resolve(out || `local-assets/receipts/${job.record_id}.external-interchange-qualification.v1.json`);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(qualification,null,2)+'\n');
console.log(`Status: ${qualification.status}`);
if(inspection) console.log(`Meshes=${inspection.summary.meshes} primitives=${inspection.summary.primitives} materials=${inspection.summary.materials} textures=${inspection.summary.textures}`);
console.log(`Qualification: ${output}`);
if(!passed) process.exit(1);
