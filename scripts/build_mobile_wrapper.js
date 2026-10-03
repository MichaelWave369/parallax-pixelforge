#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
const file=process.argv[2] || 'pocketgames/the_legend_of_more_bounce.pocketgame.json';
const m=JSON.parse(fs.readFileSync(file,'utf8')); const slug=m.slug;
const out=path.join('exports','pocketgames',slug,'mobile-wrapper'); fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
let html=fs.readFileSync(m.productionEvidence.standalonePlayable,'utf8');
const head=`\n<link rel="manifest" href="./manifest.webmanifest">\n<meta name="theme-color" content="#171321">\n<meta name="apple-mobile-web-app-capable" content="yes">\n`;
html=html.includes('</head>')?html.replace('</head>',head+'</head>'):head+html;
const sw=`<script>if('serviceWorker' in navigator && location.protocol !== 'file:'){addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));}</script>`;
html=html.includes('</body>')?html.replace('</body>',sw+'\n</body>'):html+sw;
fs.writeFileSync(path.join(out,'index.html'),html);
const iconSrc=path.join(m.sourceCartridge,'public','starter-assets','cartridge.svg'); if(fs.existsSync(iconSrc))fs.copyFileSync(iconSrc,path.join(out,'icon.svg'));
const wm={name:m.title,short_name:'More Bounce',description:m.storePageSeed.shortDescription,start_url:'./index.html',scope:'./',display:'standalone',orientation:m.mobileProfile.orientation.startsWith('landscape')?'landscape':'any',background_color:'#171321',theme_color:'#171321',icons:[{src:'./icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]};
fs.writeFileSync(path.join(out,'manifest.webmanifest'),JSON.stringify(wm,null,2)+'\n');
fs.writeFileSync(path.join(out,'service-worker.js'),`const CACHE='pixelforge-${slug}-v0.1';\nconst FILES=['./','./index.html','./manifest.webmanifest','./icon.svg'];\nself.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));\nself.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));\n`);
fs.writeFileSync(path.join(out,'README.md'),`# Mobile wrapper research build — ${m.title}\n\nThis is a v5.6 PWA-style research wrapper around the validated standalone cartridge. It is not an app-store signed binary.\n\nServe this directory over localhost/HTTPS to exercise the service worker. The plain standalone HTML remains usable without this wrapper.\n`);
console.log(`Built mobile wrapper research lane: ${out}`);
