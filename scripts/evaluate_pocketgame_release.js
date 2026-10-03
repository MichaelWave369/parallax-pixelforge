#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const manifestFile = process.argv[2] || 'pocketgames/the_legend_of_more_bounce.pocketgame.json';
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const slug = manifest.slug;
const outDir = path.join('exports', 'pocketgames', slug);
fs.mkdirSync(outDir, { recursive: true });

const exists = p => typeof p === 'string' && fs.existsSync(p);
const json = p => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
};

function findHumanPlaytests() {
  const roots = ['community/playtests', 'exports/playtests'];
  const hits = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root)) {
      if (!name.endsWith('.json')) continue;
      const file = path.join(root, name);
      const receipt = json(file);
      if (!receipt) continue;
      const receiptSlug = receipt.cartridge_slug || receipt.slug || '';
      const kind = String(receipt.kind || '').toLowerCase();
      const isHuman = kind.includes('human') || (!!receipt.tester && !kind.includes('automated'));
      if (receiptSlug === slug && isHuman) hits.push({ file, receipt });
    }
  }
  return hits;
}

const evidence = manifest.productionEvidence || {};
const review = json(evidence.communityReview);
const mobile = json(evidence.mobileReadability);
const browser = json(evidence.automatedBrowserProof);
const screenshots = Array.isArray(evidence.screenshots) ? evidence.screenshots : [];
const rightsReceipt = json(evidence.rightsDeclarationReceipt);
const assetReview = json(evidence.assetReview);
const humanPlaytests = findHumanPlaytests();
const artApprovalPath = `exports/qa/${slug}.store-art-approval.v5.6.json`;
const artApproval = json(artApprovalPath);

const checks = [
  {
    id: 'rights-and-credits',
    label: 'Rights and creator credits declared',
    requiredForProductionCandidate: true,
    passed: exists(manifest.rightsAndSafety?.requiredRightsReceipt) && exists(evidence.credits) && rightsReceipt?.declaration_status === 'declared-not-independently-verified',
    evidence: [manifest.rightsAndSafety?.requiredRightsReceipt, evidence.credits, evidence.rightsDeclarationReceipt].filter(Boolean)
  },
  {
    id: 'community-review',
    label: 'v5.5 community review passed',
    requiredForProductionCandidate: true,
    passed: review?.passed === true,
    evidence: [evidence.communityReview].filter(Boolean)
  },
  {
    id: 'mobile-readability',
    label: 'Mobile readability passed with zero errors',
    requiredForProductionCandidate: true,
    passed: mobile?.passed === true && Number(mobile?.error_count || 0) === 0,
    evidence: [evidence.mobileReadability].filter(Boolean)
  },
  {
    id: 'browser-playthrough',
    label: 'Automated browser proof reached a passing state with zero page errors',
    requiredForProductionCandidate: true,
    passed: browser?.passed === true && Number(browser?.page_errors || 0) === 0,
    evidence: [evidence.automatedBrowserProof].filter(Boolean)
  },
  {
    id: 'offline-playable',
    label: 'Standalone offline playable exists',
    requiredForProductionCandidate: true,
    passed: exists(evidence.standalonePlayable) && manifest.monetizationBoundary?.offlinePlayable === true,
    evidence: [evidence.standalonePlayable].filter(Boolean)
  },
  {
    id: 'four-screenshots',
    label: 'At least four production screenshots exist',
    requiredForProductionCandidate: true,
    passed: screenshots.length >= 4 && screenshots.every(exists),
    evidence: screenshots
  },
  {
    id: 'asset-contract',
    label: 'SNES asset contract is complete and audited',
    requiredForProductionCandidate: true,
    passed: assetReview?.contract_passed === true,
    evidence: [evidence.assetProfile, evidence.assetReview].filter(Boolean)
  },
  {
    id: 'required-asset-content',
    label: 'Every required final asset slot is ready',
    requiredForProductionCandidate: false,
    requiredForRetailRelease: true,
    passed: assetReview?.content_ready === true,
    evidence: [evidence.assetReview].filter(Boolean)
  },
  {
    id: 'clean-monetization-boundary',
    label: '369 paid-once monetization boundary is intact',
    requiredForProductionCandidate: true,
    passed: ['noAds','noPredatoryIap','noSubscriptions','noLootBoxes','noEnergyTimers','offlinePlayable']
      .every(key => manifest.monetizationBoundary?.[key] === true),
    evidence: [manifestFile]
  },
  {
    id: 'human-price-worthiness',
    label: '$3.69 human worthiness signoff',
    requiredForProductionCandidate: false,
    requiredForRetailRelease: true,
    passed: humanPlaytests.some(({ receipt }) => {
      const worth = receipt.price_worthiness ?? receipt.worthiness ?? receipt.ratings?.price_worthiness;
      return worth === true || Number(worth) >= 4;
    }),
    evidence: humanPlaytests.map(x => x.file)
  },
  {
    id: 'final-store-art',
    label: 'Final store art human approval',
    requiredForProductionCandidate: false,
    requiredForRetailRelease: true,
    passed: artApproval?.passed === true,
    evidence: exists(artApprovalPath) ? [artApprovalPath] : []
  }
];

const productionRequired = checks.filter(c => c.requiredForProductionCandidate);
const retailRequired = checks.filter(c => c.requiredForRetailRelease);
const productionCandidate = productionRequired.every(c => c.passed);
const retailReleaseReady = productionCandidate && retailRequired.every(c => c.passed);
const blockers = checks.filter(c => (c.requiredForProductionCandidate || c.requiredForRetailRelease) && !c.passed)
  .map(c => ({ id: c.id, label: c.label, stage: c.requiredForProductionCandidate ? 'production-candidate' : 'retail-release' }));

const decision = {
  schema: 'pixelforge.pocketgame-release-decision.v5.6',
  generated_at: new Date().toISOString(),
  manifest: manifestFile,
  slug,
  title: manifest.title,
  target_price_usd: manifest.price?.usdTarget,
  production_candidate: productionCandidate,
  retail_release_ready: retailReleaseReady,
  status: retailReleaseReady ? 'retail-release-ready' : productionCandidate ? 'production-candidate-human-signoff-pending' : 'blocked-before-production-candidate',
  checks,
  blockers,
  authority_boundary: 'Automated evidence may promote to production candidate after the asset contract passes. Paid public retail release additionally requires all required final asset slots ready, explicit human price-worthiness, and final store-art approval.'
};

const jsonOut = path.join(outDir, 'release-decision.v5.6.json');
const mdOut = path.join(outDir, 'release-decision.v5.6.md');
fs.writeFileSync(jsonOut, JSON.stringify(decision, null, 2) + '\n');
const lines = checks.map(c => `- ${c.passed ? '[x]' : '[ ]'} **${c.label}**${c.evidence?.length ? ` — ${c.evidence.join(', ')}` : ''}`).join('\n');
const blockLines = blockers.length ? blockers.map(b => `- ${b.label} (${b.stage})`).join('\n') : '- None';
fs.writeFileSync(mdOut, `# 369 PocketGames Release Decision — ${manifest.title}\n\nStatus: **${decision.status}**\n\nProduction candidate: **${productionCandidate ? 'PASS' : 'BLOCKED'}**\n\nRetail release ready: **${retailReleaseReady ? 'YES' : 'NO'}**\n\nTarget price: **$${manifest.price?.usdTarget}**\n\n## Evidence gates\n\n${lines}\n\n## Remaining blockers\n\n${blockLines}\n\n## Authority boundary\n\n${decision.authority_boundary}\n`);

console.log(`Release decision: ${decision.status}`);
console.log(`Production candidate: ${productionCandidate ? 'PASS' : 'BLOCKED'}`);
console.log(`Retail release ready: ${retailReleaseReady ? 'YES' : 'NO'}`);
console.log(`Wrote ${jsonOut}`);
if (!productionCandidate) process.exit(1);
