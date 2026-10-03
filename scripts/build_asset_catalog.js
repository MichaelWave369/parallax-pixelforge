#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}};
const pack=readJson(path.join(root,'assets','snes-house','asset-pack.json'));
const paletteDir=path.join(root,'assets','snes-house','palettes');
const palettes=fs.existsSync(paletteDir)?fs.readdirSync(paletteDir).filter(n=>n.endsWith('.json')).map(n=>readJson(path.join(paletteDir,n))).filter(Boolean):[];
const gamesDir=path.join(root,'games');
const profiles=[];
for(const name of fs.readdirSync(gamesDir,{withFileTypes:true})){
  if(!name.isDirectory() || name.name.startsWith('_')) continue;
  const p=path.join(gamesDir,name.name,'asset-profile.json');
  if(!fs.existsSync(p)) continue;
  const profile=readJson(p); if(!profile) continue;
  const req=(profile.slots||[]).filter(s=>s.required===true);
  const ready=req.filter(s=>['ready','approved'].includes(s.status) && s.file && fs.existsSync(path.join(gamesDir,name.name,s.file))).length;
  profiles.push({slug:profile.cartridgeSlug,title:profile.cartridgeTitle,status:profile.status,packId:profile.packId,required_slots:req.length,required_ready:ready,required_pending:req.length-ready,profile_path:path.relative(root,p)});
}
const catalog={schema:'pixelforge.asset-catalog.v5.8',generated_at:new Date().toISOString(),pack,palettes,cartridges:profiles,boundary:'Catalog indexes contracts and declared readiness. It does not generate or certify finished art.'};
const outDir=path.join(root,'exports','assets'); fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'catalog.v5.8.json'),JSON.stringify(catalog,null,2)+'\n');
const paletteLines=palettes.map(p=>`- **${p.name}** (\`${p.id}\`) — ${p.colorCount} colors — ${p.purpose}`).join('\n');
const gameLines=profiles.map(p=>`- **${p.title}** — ${p.required_ready}/${p.required_slots} required slots ready — ${p.required_pending} pending`).join('\n')||'- No cartridge profiles found.';
fs.writeFileSync(path.join(outDir,'catalog.v5.8.md'),`# PixelForge SNES Asset Catalog v5.8\n\n## House pack\n\n- ${pack?.name || 'missing'}\n- Status: **${pack?.status || 'missing'}**\n\n## Palettes\n\n${paletteLines}\n\n## Cartridge asset profiles\n\n${gameLines}\n\n> ${catalog.boundary}\n`);
console.log(`Asset catalog: ${profiles.length} cartridge profile(s), ${palettes.length} palette(s).`);
