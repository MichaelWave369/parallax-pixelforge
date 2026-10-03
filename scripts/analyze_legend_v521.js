#!/usr/bin/env node
import fs from 'node:fs';
const cfg=JSON.parse(fs.readFileSync('games/the-legend-of-more-bounce/adventure/boss-combat-pass.v5.21.json','utf8'));
const b=cfg.boss;
const spawn=18, threshold=53, step=7;
const approachInputs=Math.ceil((threshold-spawn)/step);
const fullCycle=b.beatCycleMs;
const vulnerableMs=b.beatStepMs;
const minimumPerfectBossSeconds=(b.health*fullCycle)/1000;
const audit={
 schema:'pixelforge.boss-combat-audit.v5.21',generatedAt:new Date().toISOString(),status:'boss-loop-machine-pass-human-combat-review-pending',
 machineEvidence:{bossHealth:b.health,playerHearts:b.playerHearts,beatStepMs:b.beatStepMs,beatCycleMs:fullCycle,vulnerabilityDutyCycle:b.vulnerabilityDutyCycle,vulnerabilityWindowMs:vulnerableMs,minimumApproachInputs:approachInputs,minimumPerfectBossSeconds,bossSpecificReward:cfg.combatExpansion.bossSpecificReward,bossSpecificMusic:cfg.combatExpansion.bossSpecificMusic},
 blockers:[
  {id:'human-combat-feel-review',reason:'A human must judge whether timing, movement, recovery and hit feedback feel satisfying.'},
  {id:'human-boss-difficulty-review',reason:'A machine can prove the window exists, not that six hits and four hearts create fair difficulty.'},
  {id:'human-boss-visual-review',reason:'Boss readability and memorability remain aesthetic judgments.'},
  {id:'human-boss-audio-review',reason:'Boss music and SFX integrity can be verified, but musical quality/mix require listening.'},
  {id:'commercial-content-depth',reason:'Adding a boss materially expands the adventure but does not prove $3.69 value.'},
  {id:'price-worthiness',reason:'Price worthiness remains a named human signoff.'},
  {id:'store-art-signoff',reason:'Final storefront art approval remains separate.'}
 ],
 authorityBoundary:cfg.claimBoundary
};
fs.mkdirSync('exports/playtests',{recursive:true});
fs.writeFileSync('exports/playtests/legend-boss-combat-audit.v5.21.json',JSON.stringify(audit,null,2)+'\n');
fs.writeFileSync('exports/playtests/legend-boss-combat-audit.v5.21.md',`# Legend of More Bounce — v5.21 Boss + Combat Audit\n\nStatus: **${audit.status}**\n\n## Machine-observable combat\n\n- Boss health: ${b.health}\n- Player hearts: ${b.playerHearts}\n- Beat step: ${b.beatStepMs} ms\n- Full beat cycle: ${fullCycle} ms\n- Vulnerability window: ${vulnerableMs} ms (${Math.round(b.vulnerabilityDutyCycle*100)}%)\n- Minimum approach inputs: ${approachInputs}\n- Theoretical perfect-timing lower bound: ${minimumPerfectBossSeconds.toFixed(1)} seconds\n- Boss-specific reward: Resonance Seal\n- Boss-specific music: yes\n\n## Human gates still open\n\n${audit.blockers.map(x=>`- **${x.id}** — ${x.reason}`).join('\n')}\n\n> ${audit.authorityBoundary}\n`);
console.log(`Legend v5.21 combat audit: ${b.health}-hit boss, ${Math.round(b.vulnerabilityDutyCycle*100)}% vulnerability duty cycle; human combat review pending.`);
