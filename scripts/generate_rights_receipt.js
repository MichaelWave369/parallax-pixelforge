#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const manifestFile=process.argv[2] || 'pocketgames/the_legend_of_more_bounce.pocketgame.json';
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
const slug=manifest.slug;
const root=manifest.sourceCartridge;
const rights=manifest.rightsAndSafety?.requiredRightsReceipt;
const credits=manifest.productionEvidence?.credits;
const inventory=[];
function hash(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}
function add(file,kind){if(fs.existsSync(file))inventory.push({path:file,kind,bytes:fs.statSync(file).size,sha256:hash(file)})}
add(rights,'rights-declaration'); add(credits,'creator-credits');
for(const rel of ['src/main.jsx','src/styles.css','public/starter-assets/cartridge.svg','public/starter-assets/spark.svg','public/starter-assets/RIGHTS.md']) add(path.join(root,rel), rel.includes('.svg')?'original-starter-asset':'source-or-declaration');
const receipt={
 schema:'pixelforge.rights-declaration-receipt.v5.6',generated_at:new Date().toISOString(),slug,title:manifest.title,
 declaration_status:'declared-not-independently-verified',third_party_ip_allowed:manifest.rightsAndSafety?.thirdPartyIpAllowed,
 asset_status:manifest.rightsAndSafety?.assetStatus,inventory,
 boundary:'This receipt proves which declarations/files were packaged and their hashes. It does not independently prove ownership beyond the project declarations.'
};
const out=manifest.productionEvidence?.rightsDeclarationReceipt || `exports/qa/${slug}.rights-declaration.v5.6.json`;
fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n'); console.log(`Generated ${out}`);
