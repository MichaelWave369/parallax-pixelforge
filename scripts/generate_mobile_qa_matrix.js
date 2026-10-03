#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
const file=process.argv[2] || 'pocketgames/the_legend_of_more_bounce.pocketgame.json';
const m=JSON.parse(fs.readFileSync(file,'utf8')); const slug=m.slug;
const mobile=JSON.parse(fs.readFileSync(m.productionEvidence.mobileReadability,'utf8'));
const browser=JSON.parse(fs.readFileSync(m.productionEvidence.automatedBrowserProof,'utf8'));
const wrapper=`exports/pocketgames/${slug}/mobile-wrapper`;
const rows=[
 {id:'source-mobile-readability',environment:'Static source/CSS audit',status:mobile.passed&&mobile.error_count===0?'pass':'fail',evidence:m.productionEvidence.mobileReadability},
 {id:'desktop-browser-proof',environment:'Headless Chromium deterministic playthrough',status:browser.passed&&browser.page_errors===0?'pass':'fail',evidence:m.productionEvidence.automatedBrowserProof},
 {id:'pwa-wrapper-structure',environment:'PWA research wrapper structure',status:['index.html','manifest.webmanifest','service-worker.js'].every(n=>fs.existsSync(path.join(wrapper,n)))?'pass':'fail',evidence:wrapper},
 {id:'android-small-phone',environment:'Physical Android small-phone touch test',status:'human-device-test-pending',evidence:null},
 {id:'iphone-small-phone',environment:'Physical iPhone Safari touch test',status:'human-device-test-pending',evidence:null},
 {id:'install-offline-reopen',environment:'Installed PWA offline close/reopen test',status:'human-device-test-pending',evidence:null}
];
const automatedPass=rows.filter(r=>['source-mobile-readability','desktop-browser-proof','pwa-wrapper-structure'].includes(r.id)).every(r=>r.status==='pass');
const out={schema:'pixelforge.mobile-qa-matrix.v5.6',generated_at:new Date().toISOString(),slug,title:m.title,automated_preflight_passed:automatedPass,physical_device_release_signoff:false,rows,boundary:'Automated/source checks may support production packaging. Physical-device rows remain explicit human tests before mobile-store release.'};
const outFile=`exports/qa/${slug}.mobile-qa-matrix.v5.6.json`;fs.writeFileSync(outFile,JSON.stringify(out,null,2)+'\n');
const md=`# Mobile QA Matrix — ${m.title}\n\nAutomated preflight: **${automatedPass?'PASS':'FAIL'}**\n\n| Check | Environment | Status | Evidence |\n|---|---|---|---|\n${rows.map(r=>`| ${r.id} | ${r.environment} | ${r.status} | ${r.evidence||'—'} |`).join('\n')}\n\nPhysical-device release signoff remains pending by design.\n`;
fs.writeFileSync(`exports/qa/${slug}.mobile-qa-matrix.v5.6.md`,md); console.log(`Generated ${outFile}`); if(!automatedPass)process.exit(1);
