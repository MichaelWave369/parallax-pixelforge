#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2] || "pocketgames/journey_to_parallax_pyramid.pocketgame.json";
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
const outDir = "exports/store-pages";
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${manifest.slug}.store-page.md`);
const bullets = manifest.storePageSeed.featureBullets.map(item => `- ${item}`).join("\n");
const notes = (manifest.storePageSeed.contentNotes || []).map(item => `- ${item}`).join("\n");
const body = `# ${manifest.title}\n\n**${manifest.subtitle}**\n\n${manifest.storePageSeed.tagline}\n\n## Short description\n\n${manifest.storePageSeed.shortDescription}\n\n## Long description\n\n${manifest.storePageSeed.longDescription}\n\n## Feature bullets\n\n${bullets}\n\n## Content notes\n\n${notes}\n\n## Price / monetization promise\n\nTarget price: **$${manifest.price.usdTarget}**\n\n- Paid once\n- No ads: ${manifest.monetizationBoundary.noAds}\n- No predatory IAP: ${manifest.monetizationBoundary.noPredatoryIap}\n- No subscriptions: ${manifest.monetizationBoundary.noSubscriptions}\n- Offline playable: ${manifest.monetizationBoundary.offlinePlayable}\n\n## Asset checklist\n\n- App icon\n- Feature graphic / promo banner\n- 4 phone screenshots\n- 1 optional short trailer\n- Rights receipt: ${manifest.rightsAndSafety.requiredRightsReceipt}\n`;
fs.writeFileSync(outFile, body);
console.log(`Generated ${outFile}`);
