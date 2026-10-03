#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2), flags={};
for(let i=0;i<args.length;i++){if(args[i].startsWith('--')){flags[args[i].slice(2)]=args[i+1]??'';i++}}
if(flags.help||!flags.tester){console.log('Usage: npm run legend:gold:review -- --tester "Name" --controls 1-5 --fun 1-5 --clarity 1-5 --visuals 1-5 --pacing 1-5 --replay 1-5 --content-depth 1-5 --price-worthiness 1-5 --gold-visual yes|no --controls-approved yes|no --content-depth-approved yes|no --notes "..."');process.exit(flags.help?0:2)}
const score=n=>{const v=Number(flags[n]);if(!Number.isInteger(v)||v<1||v>5){console.error(`--${n} must be 1-5`);process.exit(2)}return v};
const yn=n=>{const v=String(flags[n]||'').toLowerCase();if(!['yes','no'].includes(v)){console.error(`--${n} must be yes or no`);process.exit(2)}return v==='yes'};
const ratings={controls:score('controls'),fun:score('fun'),clarity:score('clarity'),visuals:score('visuals'),pacing:score('pacing'),replay:score('replay'),content_depth:score('content-depth'),price_worthiness:score('price-worthiness')};
const now=new Date(),stamp=now.toISOString().replace(/[:.]/g,'-');
const receipt={schema:'pixelforge.gold-standard-human-review.v5.18',kind:'human-gold-standard-playtest',cartridge_slug:'the-legend-of-more-bounce',cartridge_title:'The Legend of More Bounce',tester:flags.tester,recorded_at:now.toISOString(),ratings,price_worthiness:ratings.price_worthiness,approvals:{gold_visual:yn('gold-visual'),controls:yn('controls-approved'),commercial_content_depth:yn('content-depth-approved')},notes:flags.notes||'',authority:'Human-entered receipt. PixelForge does not infer approval from machine evidence.',privacy:'local receipt; contains only fields explicitly entered by tester'};
fs.mkdirSync('community/playtests',{recursive:true});const out=path.join('community/playtests',`the-legend-of-more-bounce.gold-v5.18.${stamp}.json`);fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');console.log(`Recorded human Gold Standard review: ${out}`);console.log('This receipt reflects the named tester input; it is not an automated approval.');
