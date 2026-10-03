#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const args=process.argv.slice(2);
function usage(){console.log('Usage: npm run asset:attach -- games/my-cartridge SLOT_ID /path/to/file --rights original|licensed|public-domain --source-note "..."');process.exit(2)}
if(args.length<3) usage();
const targetArg=args[0], slotId=args[1], sourceArg=args[2];
let rights='', sourceNote='';
for(let i=3;i<args.length;i++){
  if(args[i]==='--rights'){rights=args[++i]||'';continue}
  if(args[i].startsWith('--rights=')){rights=args[i].slice(9);continue}
  if(args[i]==='--source-note'){sourceNote=args[++i]||'';continue}
  if(args[i].startsWith('--source-note=')){sourceNote=args[i].slice(14);continue}
  console.error(`Unknown option: ${args[i]}`);usage();
}
const allowedRights=new Set(['original','licensed','public-domain']);
if(!allowedRights.has(rights)){console.error('Explicit --rights original|licensed|public-domain is required.');process.exit(2)}
const root=process.cwd(), target=path.resolve(root,targetArg), source=path.resolve(sourceArg);
if(!fs.existsSync(source)||!fs.statSync(source).isFile()){console.error(`Source asset not found: ${sourceArg}`);process.exit(2)}
const profilePath=path.join(target,'asset-profile.json');
if(!fs.existsSync(profilePath)){console.error('asset-profile.json missing.');process.exit(2)}
const profile=JSON.parse(fs.readFileSync(profilePath,'utf8'));
const slot=profile.slots?.find(s=>s.id===slotId);
if(!slot){console.error(`Unknown asset slot: ${slotId}`);process.exit(2)}
const ext=path.extname(source).toLowerCase();
const allowedExt=new Set(['.png','.webp','.svg','.ogg','.wav','.mp3']);
if(!allowedExt.has(ext)){console.error(`Unsupported asset format: ${ext}`);process.exit(2)}
const cleanBase=path.basename(source).replace(/[^A-Za-z0-9._-]+/g,'-');
const destDir=path.join(target,'public','assets','forge');fs.mkdirSync(destDir,{recursive:true});
const dest=path.join(destDir,cleanBase);
if(fs.existsSync(dest)){console.error(`Refusing to overwrite existing asset: ${path.relative(root,dest)}`);process.exit(3)}
fs.copyFileSync(source,dest);
const bytes=fs.readFileSync(dest); const sha=crypto.createHash('sha256').update(bytes).digest('hex');
slot.file=path.relative(target,dest).replaceAll('\\','/');
slot.status='ready'; slot.rightsStatus=rights; slot.sha256=sha; slot.bytes=bytes.length; slot.attachedAt=new Date().toISOString();
if(sourceNote) slot.sourceNote=sourceNote;
profile.status='asset-contract-ready-content-pending';
fs.writeFileSync(profilePath,JSON.stringify(profile,null,2)+'\n');
console.log(`Attached ${path.relative(root,dest)} -> ${slotId}`);
console.log(`Rights: ${rights}`); console.log(`SHA-256: ${sha}`);
console.log(`Next: npm run asset:check -- ${targetArg}`);
