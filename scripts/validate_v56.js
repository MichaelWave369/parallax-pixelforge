#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const errors=[];
const req=[
 'docs/V5_6_369_POCKETGAMES_PRODUCTION_CANDIDATE.md','docs/369_POCKETGAMES_PRODUCTION_GATE.md',
 'pocketgames/the_legend_of_more_bounce.pocketgame.json','pocketgames/production-candidates.json',
 'scripts/evaluate_pocketgame_release.js','scripts/build_pocketgame_candidate.js','scripts/generate_rights_receipt.js',
 'scripts/generate_store_metadata.js','scripts/build_mobile_wrapper.js','scripts/generate_mobile_qa_matrix.js','scripts/approve_store_art.js',
 'exports/qa/the-legend-of-more-bounce.rights-declaration.v5.6.json',
 'exports/qa/the-legend-of-more-bounce.mobile-qa-matrix.v5.6.json',
 'exports/store-pages/the-legend-of-more-bounce.store-metadata.v5.6.json',
 'exports/pocketgames/the-legend-of-more-bounce/release-decision.v5.6.json',
 'exports/pocketgames/the-legend-of-more-bounce/candidate-0.2.0/CANDIDATE_MANIFEST.json',
 'exports/pocketgames/the-legend-of-more-bounce/candidate-0.2.0/SHA256SUMS.txt',
 'exports/pocketgames/the-legend-of-more-bounce/candidate-0.2.0/playable/index.html',
 'exports/pocketgames/the-legend-of-more-bounce/candidate-0.2.0/mobile-wrapper/manifest.webmanifest'
];
for(const p of req)if(!fs.existsSync(p))errors.push(`Missing v5.6 path: ${p}`);
let pkg={};try{pkg=JSON.parse(fs.readFileSync('package.json','utf8'))}catch(e){errors.push(`package.json invalid: ${e.message}`)}
if(pkg.version!=='5.6.0-alpha')errors.push('package.json version must be 5.6.0-alpha.');
for(const n of ['pocketgames:legend','pocketgames:evaluate','pocketgames:package','pocketgames:promote','pocketgames:art-signoff','validate:v5.6'])if(!pkg.scripts?.[n])errors.push(`package.json missing script: ${n}`);
const html=fs.readFileSync('index.html','utf8');if(!html.includes('v5.6'))errors.push('Studio shell must visibly identify v5.6.');
const app=fs.readFileSync('app.js','utf8');if(!app.includes('5.6.0-pocketgames-production'))errors.push('app.js ENGINE_VERSION is not v5.6 production.');
let decision={};try{decision=JSON.parse(fs.readFileSync('exports/pocketgames/the-legend-of-more-bounce/release-decision.v5.6.json','utf8'))}catch(e){errors.push(`Release decision invalid: ${e.message}`)}
if(decision.production_candidate!==true)errors.push('Legend must pass the automated production-candidate gate.');
if(decision.retail_release_ready!==false)errors.push('Legend must remain retail-release blocked until explicit human signoffs exist.');
for(const id of ['human-price-worthiness','final-store-art'])if(!decision.blockers?.some(b=>b.id===id))errors.push(`Release decision must preserve human blocker: ${id}`);
let matrix={};try{matrix=JSON.parse(fs.readFileSync('exports/qa/the-legend-of-more-bounce.mobile-qa-matrix.v5.6.json','utf8'))}catch(e){errors.push(`Mobile QA matrix invalid: ${e.message}`)}
if(matrix.automated_preflight_passed!==true)errors.push('Automated mobile QA preflight must pass.');
if(matrix.physical_device_release_signoff!==false)errors.push('Physical-device signoff must remain explicitly pending.');
const candidate='exports/pocketgames/the-legend-of-more-bounce/candidate-0.2.0';
const shaFile=path.join(candidate,'SHA256SUMS.txt');
if(fs.existsSync(shaFile)){
 for(const line of fs.readFileSync(shaFile,'utf8').trim().split(/\n/)){
   const m=line.match(/^([a-f0-9]{64})  (.+)$/); if(!m){errors.push(`Malformed SHA256 line: ${line}`);continue}
   const f=path.join(candidate,m[2]); if(!fs.existsSync(f)){errors.push(`SHA256 target missing: ${m[2]}`);continue}
   const got=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); if(got!==m[1])errors.push(`SHA256 mismatch: ${m[2]}`);
 }
}
if(errors.length){console.error('PixelForge v5.6 validation failed:');for(const e of errors)console.error(`- ${e}`);process.exit(1)}
console.log('PixelForge v5.6 369 PocketGames Production Candidate validation passed.');
