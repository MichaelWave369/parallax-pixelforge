#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const targetArg = process.argv[2];
if (!targetArg) {
  console.error('Usage: npm run asset:check -- games/my-cartridge');
  process.exit(2);
}
const root = process.cwd();
const target = path.resolve(root, targetArg);
const profilePath = path.join(target, 'asset-profile.json');
const metaPath = path.join(target, 'cartridge.meta.json');
const packPath = path.join(root, 'assets', 'snes-house', 'asset-pack.json');
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const profile = readJson(profilePath);
const meta = readJson(metaPath);
const pack = readJson(packPath);
if (!profile || !meta || !pack) {
  console.error('Asset profile, cartridge metadata, or house asset pack is missing/invalid.');
  process.exit(2);
}

const allowedStatus = new Set(['awaiting-art','awaiting-audio','draft','ready','approved']);
const allowedTypes = new Set((pack.slotTypes || []).map(x => x.id));
const paletteDir = path.join(root, 'assets', 'snes-house', 'palettes');
const paletteIds = new Set(fs.existsSync(paletteDir) ? fs.readdirSync(paletteDir).filter(n=>n.endsWith('.json')).map(n=>readJson(path.join(paletteDir,n))?.id).filter(Boolean) : []);
const requiredTypeIds = ['hero-spritesheet','tileset','interior-kit','ui-frame-kit','effects-sheet'];

const checks = {
  schema: profile.schema === 'pixelforge.asset-profile.v1',
  slug_matches: profile.cartridgeSlug === (meta.slug || path.basename(target)),
  title_matches: profile.cartridgeTitle === meta.title,
  visual_lane_matches: profile.visualEra === meta.visualEra && profile.styleProfile === meta.styleProfile,
  pack_matches: profile.packId === pack.id,
  slots_declared: Array.isArray(profile.slots) && profile.slots.length >= 7,
  required_types_covered: requiredTypeIds.every(type => profile.slots?.some(s => s.type === type && s.required === true)),
  statuses_valid: profile.slots?.every(s => allowedStatus.has(s.status)) === true,
  slot_types_valid: profile.slots?.every(s => allowedTypes.has(s.type)) === true,
  palettes_valid: profile.slots?.filter(s => s.paletteId).every(s => paletteIds.has(s.paletteId)) === true,
  rights_status_declared: profile.slots?.every(s => typeof s.rightsStatus === 'string' && s.rightsStatus.length > 3) === true,
  targets_declared: profile.slots?.every(s => s.type === 'audio-cue-pack' || s.frameSize || s.tileSize || s.nineSlice) === true,
  release_policy_declared: profile.releasePolicy?.contractRequiredForProductionCandidate === true && profile.releasePolicy?.allRequiredSlotsReadyForRetailRelease === true,
};

const slotResults = (profile.slots || []).map(slot => {
  const rel = slot.file;
  const abs = rel ? path.resolve(target, rel) : null;
  const fileExists = Boolean(abs && fs.existsSync(abs));
  const claimsReady = ['ready','approved'].includes(slot.status);
  const fileConsistency = claimsReady ? fileExists : true;
  const rightsReady = claimsReady ? !/required|pending|unknown/i.test(String(slot.rightsStatus || '')) : true;
  return { id:slot.id, type:slot.type, required:slot.required === true, status:slot.status, file:rel || null, file_exists:fileExists, file_consistency:fileConsistency, rights_ready_if_claimed:rightsReady };
});
checks.ready_slots_have_files = slotResults.every(x => x.file_consistency);
checks.ready_slots_have_rights = slotResults.every(x => x.rights_ready_if_claimed);

const contractPassed = Object.values(checks).every(Boolean);
const requiredSlots = slotResults.filter(s => s.required);
const contentReady = requiredSlots.length > 0 && requiredSlots.every(s => ['ready','approved'].includes(s.status) && s.file_exists && s.rights_ready_if_claimed);
const humanSigned = meta.visualReview?.humanGoldStandardSignedOff === true;
const status = !contractPassed ? 'asset-contract-fail' : contentReady ? (humanSigned ? 'asset-content-ready-human-visual-signed-off' : 'asset-content-ready-human-visual-review-pending') : 'asset-contract-pass-content-pending';

const receipt = {
  schema:'pixelforge.asset-profile-review.v5.8',
  generated_at:new Date().toISOString(),
  cartridge_path:path.relative(root,target),
  slug:profile.cartridgeSlug,
  title:profile.cartridgeTitle,
  packId:profile.packId,
  contract_passed:contractPassed,
  content_ready:contentReady,
  human_visual_signoff:humanSigned,
  status,
  checks,
  slots:slotResults,
  counts:{ total:slotResults.length, required:requiredSlots.length, ready:slotResults.filter(s=>['ready','approved'].includes(s.status)).length, pending:slotResults.filter(s=>!['ready','approved'].includes(s.status)).length },
  boundary:'This receipt verifies asset-slot coverage, paths, declared rights state, and release-contract semantics. It does not certify visual quality, originality, license validity, or commercial readiness.'
};
const outDir = path.join(root,'exports','asset-reviews');
fs.mkdirSync(outDir,{recursive:true});
const jsonOut = path.join(outDir,`${receipt.slug}.asset-profile.v5.8.json`);
const mdOut = path.join(outDir,`${receipt.slug}.asset-profile.v5.8.md`);
fs.writeFileSync(jsonOut,JSON.stringify(receipt,null,2)+'\n');
const checkLines=Object.entries(checks).map(([k,v])=>`- ${v?'PASS':'FAIL'} — ${k}`).join('\n');
const slotLines=slotResults.map(s=>`- **${s.id}** (${s.type}) — ${s.status}${s.file?` — \`${s.file}\``:' — no file yet'}`).join('\n');
fs.writeFileSync(mdOut,`# Asset Profile Receipt — ${receipt.title}\n\n- Contract: **${contractPassed?'PASS':'FAIL'}**\n- Required asset content ready: **${contentReady?'YES':'NO'}**\n- Human visual signoff: **${humanSigned?'YES':'PENDING'}**\n- Status: **${status}**\n\n## Contract checks\n\n${checkLines}\n\n## Slots\n\n${slotLines}\n\n> ${receipt.boundary}\n`);
console.log(`PixelForge asset audit: ${receipt.slug}`);
for(const [k,v] of Object.entries(checks)) console.log(`${v?'PASS':'FAIL'}  ${k}`);
console.log(`Required asset content ready: ${contentReady?'YES':'NO'}`);
console.log(`Status: ${status}`);
console.log(`Receipt: ${path.relative(root,jsonOut)}`);
if(!contractPassed) process.exit(1);
