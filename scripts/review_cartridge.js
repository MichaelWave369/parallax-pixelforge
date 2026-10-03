#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const targetArg = process.argv[2];
if (!targetArg) {
  console.error('Usage: npm run community:review -- games/my-cartridge');
  process.exit(2);
}
const root = process.cwd();
const target = path.resolve(root, targetArg);
if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  console.error(`Cartridge directory not found: ${targetArg}`);
  process.exit(2);
}
const slug = path.basename(target);
const read = (rel) => {
  const p = path.join(target, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
};
const readJson = (rel) => {
  try { return JSON.parse(read(rel)); } catch { return {}; }
};
const meta = readJson('cartridge.meta.json');
const pkg = readJson('package.json');
const rights = read('RIGHTS.md');
const credits = read('CREDITS.md');
const readme = read('README.md');
const qaPath = path.join(root, 'exports', 'qa', `${slug}.mobile-readability.v5.4.json`);
let mobile = null;
if (fs.existsSync(qaPath)) {
  try { mobile = JSON.parse(fs.readFileSync(qaPath, 'utf8')); } catch { mobile = null; }
}

const stylePath = path.join(root, 'exports', 'style-reviews', `${slug}.visual-style.v5.7.json`);
let styleReview = null;
if (fs.existsSync(stylePath)) {
  try { styleReview = JSON.parse(fs.readFileSync(stylePath, 'utf8')); } catch { styleReview = null; }
}

const assetPath = path.join(root, 'exports', 'asset-reviews', `${slug}.asset-profile.v5.8.json`);
let assetReview = null;
if (fs.existsSync(assetPath)) {
  try { assetReview = JSON.parse(fs.readFileSync(assetPath, 'utf8')); } catch { assetReview = null; }
}

const checks = {
  rights_declared: Boolean(rights.trim()) && /rights/i.test(rights),
  creator_credits: Boolean(credits.trim()),
  claim_boundary: /claim boundary/i.test(rights) || /claim boundary/i.test(readme),
  mobile_ready: Boolean(mobile?.passed),
  local_first: meta.local_first === true || meta.network_required === false || /local-first|no network|does not require accounts/i.test(readme),
  metadata_present: Boolean(meta.title || meta.slug),
  visual_profile: meta.visualEra === '16-bit' && meta.styleProfile === 'snes-adventure' ? Boolean(styleReview?.passed) : true,
  asset_contract: meta.visualEra === '16-bit' && meta.styleProfile === 'snes-adventure' ? Boolean(assetReview?.contract_passed) : true,
};
const badges = {
  rights: checks.rights_declared ? 'declared' : 'missing',
  credits: checks.creator_credits ? 'declared' : 'missing',
  claims: checks.claim_boundary ? 'bounded' : 'review-needed',
  mobile: checks.mobile_ready ? 'pass' : 'review-needed',
  runtime: checks.local_first ? 'local-first' : 'review-needed',
  visual: meta.visualEra === '16-bit' && meta.styleProfile === 'snes-adventure' ? (styleReview?.passed ? 'snes-source-pass' : 'review-needed') : 'lane-not-required',
  assets: meta.visualEra === '16-bit' && meta.styleProfile === 'snes-adventure' ? (assetReview?.contract_passed ? (assetReview?.content_ready ? 'required-assets-ready' : 'contract-pass-art-pending') : 'review-needed') : 'lane-not-required'
};
const passed = Object.values(checks).every(Boolean);
const receipt = {
  schema: 'pixelforge.community-review.v5.5',
  slug,
  title: meta.title || pkg.description || slug,
  cartridge_path: path.relative(root, target),
  reviewed_at: new Date().toISOString(),
  passed,
  checks,
  badges,
  evidence: {
    rights: fs.existsSync(path.join(target, 'RIGHTS.md')) ? `${path.relative(root,target)}/RIGHTS.md` : null,
    credits: fs.existsSync(path.join(target, 'CREDITS.md')) ? `${path.relative(root,target)}/CREDITS.md` : null,
    mobile_receipt: mobile ? path.relative(root, qaPath) : null,
    metadata: fs.existsSync(path.join(target, 'cartridge.meta.json')) ? `${path.relative(root,target)}/cartridge.meta.json` : null,
    visual_style_receipt: styleReview ? path.relative(root, stylePath) : null,
    asset_profile_receipt: assetReview ? path.relative(root, assetPath) : null
  }
};
const outDir = path.join(root, 'exports', 'reviews');
fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, `${slug}.community-review.v5.5.json`);
fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2) + '\n');
const md = `# Community Review Receipt — ${receipt.title}\n\n- Cartridge: \`${receipt.cartridge_path}\`\n- Overall: **${passed ? 'PASS' : 'REVIEW NEEDED'}**\n- Rights: **${badges.rights}**\n- Credits: **${badges.credits}**\n- Claim boundary: **${badges.claims}**\n- Mobile: **${badges.mobile}**\n- Runtime: **${badges.runtime}**
- Visual lane: **${badges.visual}**
- Asset contract: **${badges.assets}**\n\nThis receipt is a deterministic repository check, not a legal opinion or a substitute for human playtesting.\n`;
fs.writeFileSync(path.join(outDir, `${slug}.community-review.v5.5.md`), md);
console.log(`PixelForge community review: ${slug}`);
for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? 'PASS' : 'WARN'}  ${name}`);
console.log(`Receipt: ${path.relative(root, jsonPath)}`);
if (!passed) process.exit(1);
