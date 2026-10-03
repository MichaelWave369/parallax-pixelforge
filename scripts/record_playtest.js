#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: npm run community:playtest -- <slug> --tester "Name" --fun 1-5 --clarity 1-5 --difficulty 1-5 --replay 1-5 --price-worthiness 1-5 --notes "text"');
  process.exit(0);
}
const slug = args[0];
const flags = {};
for (let i=1;i<args.length;i++) {
  const a=args[i];
  if (!a.startsWith('--')) continue;
  const key=a.slice(2); flags[key]=args[i+1] ?? ''; i++;
}
const gameDir = path.join(process.cwd(), 'games', slug);
if (!fs.existsSync(gameDir)) { console.error(`Unknown cartridge: ${slug}`); process.exit(2); }
const metaPath=path.join(gameDir,'cartridge.meta.json');
let meta={}; try { meta=JSON.parse(fs.readFileSync(metaPath,'utf8')); } catch {}
const score = (name) => {
  if (flags[name] === undefined || flags[name] === '') return null;
  const n=Number(flags[name]);
  if (!Number.isInteger(n) || n<1 || n>5) { console.error(`--${name} must be an integer 1-5`); process.exit(2); }
  return n;
};
const now=new Date();
const safeTime=now.toISOString().replace(/[:.]/g,'-');
const receipt={
  schema:'pixelforge.playtest-receipt.v5.6',
  kind:'human-playtest',
  cartridge_slug:slug,
  cartridge_title:meta.title || slug,
  tester:flags.tester || 'anonymous-local-tester',
  recorded_at:now.toISOString(),
  ratings:{ fun:score('fun'), clarity:score('clarity'), difficulty:score('difficulty'), replay:score('replay'), price_worthiness:score('price-worthiness') },
  notes:flags.notes || '',
  privacy:'local receipt; contains only the fields explicitly entered by the tester'
};
const dir=path.join(process.cwd(),'community','playtests'); fs.mkdirSync(dir,{recursive:true});
const out=path.join(dir,`${slug}.${safeTime}.json`); fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
console.log(`Recorded playtest receipt: ${path.relative(process.cwd(),out)}`);
console.log('Rebuild the shelf with: npm run community:shelf');
