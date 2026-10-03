#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
const args=process.argv.slice(2); const slug=args[0];
if(!slug || args.includes('--help')){console.log('Usage: npm run pocketgames:art-signoff -- <slug> --reviewer "Name" --pass yes|no --notes "text"');process.exit(slug?0:2)}
const flags={}; for(let i=1;i<args.length;i++){if(args[i].startsWith('--')){flags[args[i].slice(2)]=args[i+1]??'';i++}}
if(!flags.reviewer){console.error('--reviewer is required for human signoff.');process.exit(2)}
if(!['yes','no'].includes(String(flags.pass).toLowerCase())){console.error('--pass must be yes or no.');process.exit(2)}
const receipt={schema:'pixelforge.store-art-approval.v5.6',slug,reviewer:flags.reviewer,recorded_at:new Date().toISOString(),passed:String(flags.pass).toLowerCase()==='yes',notes:flags.notes||'',authority:'Explicit human store-art approval; never generated automatically.'};
const out=`exports/qa/${slug}.store-art-approval.v5.6.json`; fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n'); console.log(`Recorded ${out}`);
