#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { bindUnrealExportJob } from './lib/unreal_export_job.js';

function usage() {
  console.log('Usage: npm run asset:unreal:bind -- /path/job.v1.json --project /path/Project.uproject --asset-path /Game/Path/Asset [--out /path/job.v2.json]');
  process.exit(2);
}

const args=process.argv.slice(2);
if(!args[0] || args[0].startsWith('--')) usage();
const input=path.resolve(args[0]);
let projectPath='', assetPath='', out='';
for(let i=1;i<args.length;i++){
  const arg=args[i]; const next=()=>args[++i]||'';
  if(arg==='--project') projectPath=next();
  else if(arg.startsWith('--project=')) projectPath=arg.slice(10);
  else if(arg==='--asset-path') assetPath=next();
  else if(arg.startsWith('--asset-path=')) assetPath=arg.slice(13);
  else if(arg==='--out') out=next();
  else if(arg.startsWith('--out=')) out=arg.slice(6);
  else usage();
}
if(!fs.existsSync(input)){console.error(`Job not found: ${input}`);process.exit(2)}
if(!projectPath || !assetPath) usage();
const project=path.resolve(projectPath);
if(!fs.existsSync(project) || !fs.statSync(project).isFile()){
  console.error(`Unreal project not found: ${project}`);process.exit(2);
}
const job=JSON.parse(fs.readFileSync(input,'utf8'));
const bound=bindUnrealExportJob(job,{projectPath:project,assetPath,repoRoot:process.cwd()});
const output=path.resolve(out || `local-assets/jobs/${bound.record_id}.unreal-export-job.v2.json`);
fs.mkdirSync(path.dirname(output),{recursive:true});
if(fs.existsSync(output)){console.error(`Refusing to overwrite bound job: ${output}`);process.exit(3)}
fs.writeFileSync(output,JSON.stringify(bound,null,2)+'\n');
console.log(`Bound Unreal export job: ${output}`);
console.log(`Record: ${bound.record_id}`);
console.log(`Asset: ${bound.source.unreal_asset_path}`);
console.log(`Project: ${bound.source.project_path}`);
console.log('Next: npm run asset:unreal:run -- "'+output+'" --engine-root "C:\\Program Files\\Epic Games\\UE_5.4"');
