#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const gamesDir=path.join(root,'games');
const read=(p)=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
const json=(p)=>{try{return JSON.parse(read(p));}catch{return {};}};
const folders=fs.readdirSync(gamesDir,{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.name.startsWith('_')).map(d=>d.name).sort();
const playtestFiles=fs.existsSync(path.join(root,'community','playtests')) ? fs.readdirSync(path.join(root,'community','playtests')).filter(f=>f.endsWith('.json')) : [];
const playtests=playtestFiles.map(f=>json(path.join(root,'community','playtests',f))).filter(x=>x.cartridge_slug);

function summaryFor(slug){
  const all=playtests.filter(p=>p.cartridge_slug===slug);
  const humans=all.filter(p=>p.kind==='human-playtest');
  const autos=all.filter(p=>p.kind==='automated-browser');
  const dims=['fun','clarity','difficulty','replay']; const averages={};
  for(const d of dims){ const vals=humans.map(p=>p.ratings?.[d]).filter(Number.isFinite); averages[d]=vals.length?Number((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)):null; }
  return { total_receipts:all.length, human_sessions:humans.length, automated_sessions:autos.length, automated_passes:autos.filter(p=>p.passed).length, averages };
}
function firstParagraph(text){
  const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).filter(s=>!s.startsWith('#')&&!s.startsWith('**'));
  return lines.find(s=>s.length>30) || '';
}
const cartridges=folders.map(slug=>{
  const dir=path.join(gamesDir,slug); const meta=json(path.join(dir,'cartridge.meta.json')); const pkg=json(path.join(dir,'package.json'));
  const review=json(path.join(root,'exports','reviews',`${slug}.community-review.v5.5.json`));
  const credits=read(path.join(dir,'CREDITS.md')); const creatorLine=credits.split(/\r?\n/).find(l=>/^- (Studio|Original concept|Creative direction|Creator):/i.test(l));
  return {
    slug,
    title:meta.title || pkg.description || slug,
    version:meta.version || pkg.version || 'unversioned',
    status:meta.status || 'prototype',
    creator:meta.creator || (creatorLine?creatorLine.replace(/^- [^:]+:\s*/, ''):'Parallax PixelForge'),
    studio:meta.studio || 'Parallax PixelForge',
    description:firstParagraph(read(path.join(dir,'README.md'))),
    modes:meta.modes || [], tags:meta.tags || [], featured:Boolean(meta.featured), learning_value:meta.learning_value || '',
    paths:{ cartridge:`games/${slug}/`, readme:`games/${slug}/README.md`, rights:`games/${slug}/RIGHTS.md`, credits:fs.existsSync(path.join(dir,'CREDITS.md'))?`games/${slug}/CREDITS.md`:null },
    badges:review.badges || {rights:'review-needed',credits:'review-needed',claims:'review-needed',mobile:'review-needed',runtime:'review-needed'},
    review_passed:Boolean(review.passed), playtests:summaryFor(slug)
  };
});
const catalog={ schema:'pixelforge.community-catalog.v5.5', generated_at:new Date().toISOString(), local_first:true, network_required:false, cartridge_count:cartridges.length, featured_count:cartridges.filter(c=>c.featured).length, cartridges };
const communityDir=path.join(root,'community'); fs.mkdirSync(communityDir,{recursive:true});
fs.writeFileSync(path.join(communityDir,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
const escaped=JSON.stringify(catalog).replace(/</g,'\\u003c');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PixelForge Community Cartridge Shelf v5.5</title><style>
:root{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color-scheme:dark;background:#0c1020;color:#eef2ff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#1c2853 0,#0c1020 45%);min-height:100vh}.wrap{width:min(1100px,100%);margin:auto;padding:max(22px,env(safe-area-inset-top)) 18px 48px}header{display:grid;gap:12px;margin-bottom:22px}h1{margin:0;font-size:clamp(1.7rem,5vw,3.2rem)}.sub{color:#b7c5f3;max-width:780px;line-height:1.6}.toolbar{display:flex;gap:10px;flex-wrap:wrap}button,.filebtn{min-height:44px;border:1px solid #7184cf;background:#151d3c;color:#fff;border-radius:10px;padding:10px 14px;font:inherit;cursor:pointer}.filebtn input{display:none}.stats{display:flex;gap:9px;flex-wrap:wrap}.pill,.badge{display:inline-flex;align-items:center;min-height:28px;border:1px solid #3b4a83;border-radius:999px;padding:4px 9px;font-size:.78rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px}.card{border:1px solid #344478;background:#111831e8;border-radius:16px;padding:17px;box-shadow:0 18px 45px #0005}.card h2{margin:.2rem 0 .4rem;font-size:1.25rem}.meta{color:#aebce9;font-size:.85rem}.desc{line-height:1.5;min-height:4.5em}.badges{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.pass{border-color:#4f9f7a;color:#baf5d8}.warn{border-color:#a48244;color:#ffe0a3}.featured{color:#ffd972}.learn{border-left:3px solid #899cff;padding-left:10px;color:#cdd6ff}.scores{font-size:.83rem;color:#b7c5f3}.credits{margin-top:28px;border-top:1px solid #344478;padding-top:18px}a{color:#b8c8ff}:focus-visible{outline:3px solid #ffd972;outline-offset:3px}@media(max-width:560px){.wrap{padding-inline:12px}.card{padding:14px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style></head><body><main class="wrap"><header><div class="meta">PARALLAX PIXELFORGE · LOCAL-FIRST COMMUNITY LAYER</div><h1>Community Cartridge Shelf <span class="featured">v5.5</span></h1><p class="sub">A portable cartridge catalog with visible rights, credit, claim-boundary, mobile, and local-runtime badges. No account or network connection is required.</p><div class="toolbar"><button id="exportBtn">Export catalog JSON</button><label class="filebtn">Import catalog JSON<input id="importInput" type="file" accept="application/json,.json"></label><button id="resetBtn">Reset bundled shelf</button></div><div class="stats" id="stats"></div></header><section class="grid" id="grid"></section><section class="credits"><h2>Creator credits view</h2><div id="credits"></div></section></main><script>
const bundled=${escaped}; let catalog=bundled;
const good=new Set(['declared','bounded','pass','local-first']);
function badge(label,value){return '<span class="badge '+(good.has(value)?'pass':'warn')+'">'+label+': '+value+'</span>'}
function render(){const list=catalog.cartridges||[];document.getElementById('stats').innerHTML='<span class="pill">'+list.length+' cartridges</span><span class="pill">'+list.filter(x=>x.featured).length+' featured learning cartridges</span><span class="pill">local-only catalog</span>';document.getElementById('grid').innerHTML=list.map(c=>{const p=c.playtests||{};const av=p.averages||{};const ratings=av.fun==null?'No human ratings yet':'Fun '+av.fun+'/5 · Clarity '+av.clarity+'/5 · Replay '+av.replay+'/5';return '<article class="card"><div class="meta">'+(c.featured?'<span class="featured">★ FEATURED LEARNING CARTRIDGE</span> · ':'')+c.version+' · '+c.status+'</div><h2>'+c.title+'</h2><div class="meta">'+c.creator+'</div><p class="desc">'+(c.description||'PixelForge cartridge')+'</p>'+(c.learning_value?'<p class="learn">'+c.learning_value+'</p>':'')+'<div class="badges">'+badge('Rights',c.badges.rights)+badge('Credits',c.badges.credits)+badge('Claims',c.badges.claims)+badge('Mobile',c.badges.mobile)+badge('Runtime',c.badges.runtime)+'</div><div class="scores">Playtests: '+(p.human_sessions||0)+' human · '+(p.automated_sessions||0)+' automated · '+ratings+'</div><p><a href="../'+c.paths.readme+'">README</a> · <a href="../'+c.paths.rights+'">Rights</a>'+(c.paths.credits?' · <a href="../'+c.paths.credits+'">Credits</a>':'')+'</p></article>'}).join('');const groups={};for(const c of list)(groups[c.creator]??=[]).push(c.title);document.getElementById('credits').innerHTML=Object.entries(groups).map(([n,t])=>'<p><strong>'+n+'</strong><br>'+t.join(' · ')+'</p>').join('')}
function download(){const b=new Blob([JSON.stringify(catalog,null,2)+'\\n'],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='pixelforge-community-catalog.v5.5.json';a.click();URL.revokeObjectURL(u)}
document.getElementById('exportBtn').onclick=download;document.getElementById('resetBtn').onclick=()=>{catalog=bundled;render()};document.getElementById('importInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!Array.isArray(x.cartridges))throw Error('catalog has no cartridges array');catalog=x;render()}catch(err){alert('Could not import catalog: '+err.message)}};render();
</script></body></html>`;
fs.writeFileSync(path.join(communityDir,'index.html'),html);
console.log(`Built community/catalog.json with ${cartridges.length} cartridges.`);
console.log('Built community/index.html (zero-install local shelf).');
