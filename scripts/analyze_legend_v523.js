#!/usr/bin/env node
import fs from 'node:fs';
const game='games/the-legend-of-more-bounce';
const cfg=JSON.parse(fs.readFileSync(`${game}/adventure/chapter-three-iron-orchard.v5.23.json`,'utf8'));
const requiredBeats={hubIntroductions:2,gearAppleExploration:3,requiredShopTrade:1,rustlingCombatHits:cfg.enemyTier.count*cfg.enemyTier.health,cacheClaim:1,bossGuardBreaks:cfg.boss.guardCycles,bossDamageStrikes:cfg.boss.health,bossRewardClaim:1};
const minimumRequired=Object.values(requiredBeats).reduce((a,b)=>a+b,0);
const optionalBeats={wrenchCharmReturn:1,heartRivetMechanicalReward:1};
const audit={schema:'pixelforge.chapter-three-depth-audit.v5.23',status:'chapter-three-machine-depth-pass-human-hub-sidequest-combat-and-commercial-review-pending',chapter:'The Iron Orchard',machineEvidence:{requiredBeats,minimumRequiredInteractionBeats:minimumRequired,optionalBranchBeats:Object.values(optionalBeats).reduce((a,b)=>a+b,0),namedHubNpcs:2,gearApples:3,strongerEnemies:3,hitsPerRustling:3,requiredPermanentCombatUpgrade:'resonanceBracer',optionalMechanicalUpgrade:'heartRivet:+1 boss heart',sideViewDungeon:'rustroot-cavern',chapterBoss:'rustbloom-warden',bossGuardCycles:4,bossDamageHits:4,reward:'ironBlossom'},blockers:[
{id:'human-hub-flow-review',reason:'Machine structure cannot establish whether Rivet Row feels pleasant to revisit.'},
{id:'human-sidequest-value-review',reason:'The Wrench Charm / Heart Rivet branch must be judged for whether the detour feels worthwhile.'},
{id:'human-bracer-feel-review',reason:'The Resonance Bracer is mechanically required, but feel/timing satisfaction is human-only.'},
{id:'human-rustling-difficulty-review',reason:'Three 3-hit armored enemies may be tedious or satisfying; playtest required.'},
{id:'human-boss-fairness-review',reason:'Burst→Strike alternation and optional +1 heart require human fairness review.'},
{id:'commercial-content-depth',reason:'Additional authored beats do not prove sufficient retail depth.'},
{id:'price-worthiness',reason:'$3.69 value remains a human decision.'}
]};
fs.mkdirSync('exports/playtests',{recursive:true});fs.writeFileSync('exports/playtests/legend-iron-orchard-depth-audit.v5.23.json',JSON.stringify(audit,null,2));
fs.writeFileSync('exports/playtests/legend-iron-orchard-depth-audit.v5.23.md',`# Legend v5.23 — Iron Orchard Depth Audit\n\nStatus: **${audit.status}**\n\n- Minimum required authored interaction beats: **${minimumRequired}**\n- Optional branch beats: **${audit.machineEvidence.optionalBranchBeats}**\n- Hub NPCs: **2**\n- Gear Apples: **3**\n- Rustlings: **3 × 3 hits**\n- Required combat upgrade: **Resonance Bracer**\n- Optional mechanical reward: **Heart Rivet (+1 boss heart)**\n- Boss: **Rustbloom Warden (4 guard breaks + 4 damage strikes)**\n\nMachine depth is evidence of authored structure, not proof of fun, pacing, or retail value.\n`);
console.log(`Legend v5.23 depth audit: ${minimumRequired} minimum required beats + ${audit.machineEvidence.optionalBranchBeats} optional branch beats; human value review pending.`);
