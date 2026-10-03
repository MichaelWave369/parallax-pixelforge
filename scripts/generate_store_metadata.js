#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
const file=process.argv[2] || 'pocketgames/the_legend_of_more_bounce.pocketgame.json';
const m=JSON.parse(fs.readFileSync(file,'utf8'));
const out=`exports/store-pages/${m.slug}.store-metadata.v5.6.json`; fs.mkdirSync(path.dirname(out),{recursive:true});
const packet={schema:'pixelforge.store-metadata.v5.6',generated_at:new Date().toISOString(),slug:m.slug,title:m.title,subtitle:m.subtitle,series:m.series,target_price_usd:m.price.usdTarget,pricing_model:m.price.model,tagline:m.storePageSeed.tagline,short_description:m.storePageSeed.shortDescription,long_description:m.storePageSeed.longDescription,feature_bullets:m.storePageSeed.featureBullets,content_notes:m.storePageSeed.contentNotes,orientation:m.mobileProfile.orientation,monetization_promise:m.monetizationBoundary,assets:{screenshots:m.productionEvidence?.screenshots||[],final_icon:'human-signoff-pending',feature_graphic:'human-signoff-pending',trailer:'optional-not-required'},release_note:'Production-candidate metadata packet. Store submission/signing is outside PixelForge v5.6.'};
fs.writeFileSync(out,JSON.stringify(packet,null,2)+'\n'); console.log(`Generated ${out}`);
