#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';
const errors=[];
const required=['docs/V5_5_COMMUNITY_CARTRIDGE_WAVE.md','docs/COMMUNITY_CARTRIDGE_REVIEW_CHECKLIST.md','community/catalog.json','community/index.html','community/README.md','community/REVIEW_BADGES.md','community/playtests/README.md','scripts/build_community_shelf.js','scripts/review_cartridge.js','scripts/record_playtest.js','exports/reviews/journey-to-parallax-pyramid.community-review.v5.5.json','exports/reviews/the-legend-of-more-bounce.community-review.v5.5.json','games/journey-to-parallax-pyramid/CREDITS.md','games/the-legend-of-more-bounce/CREDITS.md'];
for(const p of required)if(!fs.existsSync(p))errors.push(`Missing v5.5 path: ${p}`);
let pkg={};try{pkg=JSON.parse(fs.readFileSync('package.json','utf8'))}catch(e){errors.push(`package.json invalid: ${e.message}`)}
if(pkg.version!=='5.5.0-alpha')errors.push('package.json version must be 5.5.0-alpha.');
for(const n of ['community:review','community:shelf','community:playtest','validate:v5.5'])if(!pkg.scripts?.[n])errors.push(`package.json missing script: ${n}`);
const html=fs.readFileSync('index.html','utf8');if(!html.includes('v5.5'))errors.push('Studio shell must visibly identify v5.5.');
const app=fs.readFileSync('app.js','utf8');if(!app.includes('5.5.0-community-shelf'))errors.push('app.js ENGINE_VERSION is not v5.5.');
let catalog={};try{catalog=JSON.parse(fs.readFileSync('community/catalog.json','utf8'))}catch(e){errors.push(`community/catalog.json invalid: ${e.message}`)}
if(catalog.schema!=='pixelforge.community-catalog.v5.5')errors.push('Community catalog schema mismatch.');
if(!Array.isArray(catalog.cartridges)||catalog.cartridges.length<2)errors.push('Community shelf must contain at least two cartridges.');
for(const slug of ['journey-to-parallax-pyramid','the-legend-of-more-bounce']){const c=catalog.cartridges?.find(x=>x.slug===slug);if(!c)errors.push(`Catalog missing ${slug}.`);else if(!c.featured)errors.push(`${slug} must be a featured learning cartridge.`);else if(!c.review_passed)errors.push(`${slug} community review must pass.`)}
const shelf=fs.readFileSync('community/index.html','utf8');if(!shelf.includes('Import catalog JSON')||!shelf.includes('Export catalog JSON'))errors.push('Community shelf missing local import/export controls.');
if(errors.length){console.error('PixelForge v5.5 validation failed:');for(const e of errors)console.error(`- ${e}`);process.exit(1)}
console.log('PixelForge v5.5 Community Cartridge Shelf validation passed.');
