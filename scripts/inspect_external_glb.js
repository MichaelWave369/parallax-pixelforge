#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { inspectGlbFile } from './lib/glb_inspector.js';

function usage() {
  console.log('Usage: npm run asset:glb:inspect -- /path/to/file.glb [--out /path/to/inspection.json]');
  process.exit(2);
}

const args=process.argv.slice(2);
if(!args[0] || args[0].startsWith('--')) usage();
const input=path.resolve(args[0]);
let out='';
for(let i=1;i<args.length;i++){
  if(args[i]==='--out') out=args[++i]||'';
  else if(args[i].startsWith('--out=')) out=args[i].slice(6);
  else usage();
}
if(!fs.existsSync(input) || !fs.statSync(input).isFile()){
  console.error(`GLB file not found: ${input}`);
  process.exit(2);
}
try {
  const result=inspectGlbFile(input);
  const payload={...result,file_path:input,generated_at:new Date().toISOString()};
  if(out){
    const output=path.resolve(out);
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(payload,null,2)+'\n');
    console.log(`Inspection: ${output}`);
  }
  console.log(`GLB PASS: ${input}`);
  console.log(`Meshes=${result.summary.meshes} primitives=${result.summary.primitives} materials=${result.summary.materials} textures=${result.summary.textures} animations=${result.summary.animations}`);
} catch(error) {
  console.error(`GLB FAIL: ${error.message}`);
  process.exit(1);
}
