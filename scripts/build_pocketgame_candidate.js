#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const manifestFile = process.argv[2] || 'pocketgames/the_legend_of_more_bounce.pocketgame.json';
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const slug = manifest.slug;
const base = path.join('exports', 'pocketgames', slug);
const decisionPath = path.join(base, 'release-decision.v5.6.json');
if (!fs.existsSync(decisionPath)) throw new Error(`Missing ${decisionPath}; run pocketgames:evaluate first.`);
const decision = JSON.parse(fs.readFileSync(decisionPath, 'utf8'));
if (decision.production_candidate !== true) throw new Error('Release decision does not permit production-candidate packaging.');

const candidate = path.join(base, `candidate-${manifest.manifestVersion}`);
fs.rmSync(candidate, { recursive: true, force: true });
fs.mkdirSync(candidate, { recursive: true });

function copyFile(src, dst) {
  if (!fs.existsSync(src)) throw new Error(`Missing packaging input: ${src}`);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

copyFile(manifestFile, path.join(candidate, 'manifest', path.basename(manifestFile)));
copyFile(manifest.rightsAndSafety.requiredRightsReceipt, path.join(candidate, 'governance', 'RIGHTS.md'));
copyFile(manifest.productionEvidence.credits, path.join(candidate, 'governance', 'CREDITS.md'));
copyFile(manifest.productionEvidence.rightsDeclarationReceipt, path.join(candidate, 'governance', 'rights-declaration.v5.6.json'));
copyFile(manifest.productionEvidence.communityReview, path.join(candidate, 'evidence', 'community-review.json'));
copyFile(manifest.productionEvidence.mobileReadability, path.join(candidate, 'evidence', 'mobile-readability.json'));
if (manifest.productionEvidence.assetProfile) copyFile(manifest.productionEvidence.assetProfile, path.join(candidate, 'evidence', 'asset-profile.json'));
if (manifest.productionEvidence.assetReview) copyFile(manifest.productionEvidence.assetReview, path.join(candidate, 'evidence', 'asset-review.v5.8.json'));
copyFile(`exports/qa/${slug}.mobile-qa-matrix.v5.6.json`, path.join(candidate, 'evidence', 'mobile-qa-matrix.v5.6.json'));
copyFile(`exports/qa/${slug}.mobile-qa-matrix.v5.6.md`, path.join(candidate, 'evidence', 'mobile-qa-matrix.v5.6.md'));
copyFile(manifest.productionEvidence.automatedBrowserProof, path.join(candidate, 'evidence', 'automated-browser-proof.json'));
copyFile(decisionPath, path.join(candidate, 'evidence', 'release-decision.v5.6.json'));
copyFile(path.join(base, 'release-decision.v5.6.md'), path.join(candidate, 'evidence', 'release-decision.v5.6.md'));
const storePage = path.join('exports', 'store-pages', `${slug}.store-page.md`);
copyFile(storePage, path.join(candidate, 'store', 'STORE_PAGE.md'));
copyFile(path.join('exports','store-pages',`${slug}.store-metadata.v5.6.json`), path.join(candidate, 'store', 'store-metadata.v5.6.json'));
copyFile(manifest.productionEvidence.standalonePlayable, path.join(candidate, 'playable', 'index.html'));
for (const shot of manifest.productionEvidence.screenshots || []) copyFile(shot, path.join(candidate, 'store', 'screenshots', path.basename(shot)));
const wrapperRoot=path.join(base,'mobile-wrapper');
if(fs.existsSync(wrapperRoot)){
  for(const f of walk(wrapperRoot)){
    const rel=path.relative(wrapperRoot,f); copyFile(f,path.join(candidate,'mobile-wrapper',rel));
  }
}

const status = `# ${manifest.title} — 369 PocketGames Production Candidate\n\n- Candidate number: ${manifest.candidateNumber}\n- Manifest version: ${manifest.manifestVersion}\n- Target price: $${manifest.price.usdTarget}\n- Production candidate: PASS\n- Retail release ready: ${decision.retail_release_ready ? 'YES' : 'NO'}\n- Status: ${decision.status}\n\nThis package is a reproducible production handoff, not an automatic authorization to sell. See evidence/release-decision.v5.6.md for remaining human gates.\n`;
fs.writeFileSync(path.join(candidate, 'RELEASE_STATUS.md'), status);
const assetChecklist = `# Store Asset Checklist — ${manifest.title}\n\n- [ ] Final app icon human-approved\n- [ ] Feature graphic / promo banner human-approved\n- [x] Four gameplay screenshots packaged\n- [ ] Optional short trailer (not required for production candidate)\n- [x] Store text packet generated\n- [x] Rights declarations and credits packaged\n- [x] Release decision packaged\n\nThe checked items are evidence-backed. Final required in-game asset slots and unchecked store-art items remain retail release gates.\n`;
fs.writeFileSync(path.join(candidate,'store','ASSET_CHECKLIST.md'),assetChecklist);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full)); else out.push(full);
  }
  return out;
}
const files = walk(candidate).sort();
const hashes = files.map(file => {
  const rel = path.relative(candidate, file).replaceAll('\\', '/');
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  return { path: rel, sha256: hash, bytes: fs.statSync(file).size };
});
fs.writeFileSync(path.join(candidate, 'CANDIDATE_MANIFEST.json'), JSON.stringify({
  schema: 'pixelforge.pocketgame-candidate-package.v5.6',
  generated_at: new Date().toISOString(),
  slug,
  title: manifest.title,
  status: decision.status,
  files: hashes
}, null, 2) + '\n');
const finalFiles = walk(candidate).sort();
const shaLines = finalFiles.map(file => {
  const rel = path.relative(candidate, file).replaceAll('\\', '/');
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  return `${hash}  ${rel}`;
});
fs.writeFileSync(path.join(candidate, 'SHA256SUMS.txt'), shaLines.join('\n') + '\n');

const indexPath = 'pocketgames/production-candidates.json';
let index = { schema: 'pixelforge.pocketgame-production-candidates.v5.6', candidates: [] };
if (fs.existsSync(indexPath)) {
  try { index = JSON.parse(fs.readFileSync(indexPath, 'utf8')); } catch {}
}
index.schema = 'pixelforge.pocketgame-production-candidates.v5.6';
index.generated_at = new Date().toISOString();
index.candidates = (index.candidates || []).filter(c => c.slug !== slug);
index.candidates.push({
  candidateNumber: manifest.candidateNumber,
  slug,
  title: manifest.title,
  manifest: manifestFile,
  package: candidate,
  status: decision.status,
  production_candidate: true,
  retail_release_ready: decision.retail_release_ready
});
index.candidates.sort((a,b) => a.candidateNumber - b.candidateNumber);
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
console.log(`Built 369 PocketGames candidate package: ${candidate}`);
