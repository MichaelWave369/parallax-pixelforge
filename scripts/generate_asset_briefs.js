#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const targetArg=process.argv[2];
if(!targetArg){console.error('Usage: npm run asset:briefs -- games/my-cartridge');process.exit(2)}
const root=process.cwd(); const target=path.resolve(root,targetArg);
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}};
const profile=readJson(path.join(target,'asset-profile.json')); const meta=readJson(path.join(target,'cartridge.meta.json'));
if(!profile||!meta){console.error('Missing/invalid asset-profile.json or cartridge.meta.json');process.exit(2)}
const briefs=(profile.slots||[]).map((s,i)=>({
  order:i+1,id:s.id,type:s.type,required:s.required===true,status:s.status,
  frameSize:s.frameSize||null,tileSize:s.tileSize||null,sheetGrid:s.sheetGrid||null,nineSlice:s.nineSlice||null,
  states:s.states||null,regions:s.regions||null,cueIds:s.cueIds||null,paletteId:s.paletteId||null,
  artDirection:s.notes||null,rightsRequirement:s.rightsStatus,
  acceptance:[
    'Must fit the declared PixelForge 16-bit lane without copying protected franchise art.',
    s.frameSize?`Frames must be authored for ${s.frameSize} target readability.`:null,
    s.tileSize?`Tiles must compose cleanly on a ${s.tileSize}x${s.tileSize} grid.`:null,
    s.states?.length?`Required states: ${s.states.join(', ')}.`:null,
    s.regions?.length?`Required regions/elements: ${s.regions.join(', ')}.`:null,
    'Final file must be attached with explicit rights status and pass the asset-profile validator.'
  ].filter(Boolean)
}));
const packet={schema:'pixelforge.asset-production-briefs.v5.8',generated_at:new Date().toISOString(),slug:profile.cartridgeSlug,title:profile.cartridgeTitle,visualEra:profile.visualEra,styleProfile:profile.styleProfile,packId:profile.packId,briefs,boundary:'These are production specifications, not claims that the art exists. Human art direction and rights review remain required.'};
const outDir=path.join(root,'exports','assets',profile.cartridgeSlug);fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'asset-briefs.v5.8.json'),JSON.stringify(packet,null,2)+'\n');
const lines=briefs.map(b=>`## ${b.order}. ${b.id}\n\n- Type: **${b.type}**\n- Required: **${b.required?'yes':'no'}**\n- Current status: **${b.status}**\n- Frame/tile target: **${b.frameSize||b.tileSize||b.nineSlice||'n/a'}**\n- Palette: \`${b.paletteId||'n/a'}\`\n- Rights requirement: **${b.rightsRequirement}**\n${b.artDirection?`- Direction: ${b.artDirection}\n`:''}\n### Acceptance\n\n${b.acceptance.map(x=>`- [ ] ${x}`).join('\n')}\n`).join('\n');
fs.writeFileSync(path.join(outDir,'asset-briefs.v5.8.md'),`# Asset Production Briefs — ${packet.title}\n\n- Visual lane: **${packet.visualEra} / ${packet.styleProfile}**\n- House pack: \`${packet.packId}\`\n\n${lines}\n> ${packet.boundary}\n`);
console.log(`Generated ${briefs.length} asset brief(s): exports/assets/${profile.cartridgeSlug}/asset-briefs.v5.8.*`);
