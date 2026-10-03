#!/usr/bin/env node
import fs from 'node:fs';
const plan=JSON.parse(fs.readFileSync('games/the-legend-of-more-bounce/adventure/adventure-expansion.v5.20.json','utf8'));
const c=plan.contentCounts;
const interactionBeats={npcClue:1,oldRuinChest:1,wobbleRune:1,flatlingEncounters:c.enemyEncounters,echoShardRewards:c.collectibleShards,shrineInputs:c.puzzleSteps,towerDialogue:4};
const lowerBound=Object.values(interactionBeats).reduce((a,b)=>a+b,0);
const audit={
  schema:'pixelforge.adventure-depth-audit.v5.20',
  generatedAt:new Date().toISOString(),
  status:'expanded-adventure-human-commercial-depth-review-pending',
  machineEvidence:{
    ...c,
    requiredProgressionFlags:plan.progressionFlags.length,
    distinctPlayableSceneFamilies:c.overworldNodes+c.sideViewRoutes+c.firstPersonInteriors,
    minimumAuthoredInteractionBeats:lowerBound,
    hasNpcClueChain:c.namedNpcEncounters>=1,
    hasEnemyLoop:c.enemyEncounters>=3,
    hasCollectibleLoop:c.collectibleShards>=3,
    hasPuzzleLoop:c.puzzleSteps>=3
  },
  blockers:[
    {id:'human-control-feel-review',reason:'Encounter and traversal feel must be played by a human.'},
    {id:'human-visual-review',reason:'SNES visual-gold-standard approval remains human-only.'},
    {id:'human-audio-review',reason:'The v5.19 audio pack exists, but mix/composition quality still needs listening review.'},
    {id:'commercial-content-depth',reason:'Content counts prove expansion, not sufficient value or satisfying duration.'},
    {id:'price-worthiness',reason:'A human must decide whether the finished adventure earns the $3.69 target.'},
    {id:'store-art-signoff',reason:'Final storefront presentation requires named human approval.'}
  ],
  claimBoundary:plan.claimBoundary
};
fs.mkdirSync('exports/playtests',{recursive:true});
fs.writeFileSync('exports/playtests/legend-adventure-depth-audit.v5.20.json',JSON.stringify(audit,null,2));
const md=`# Legend of More Bounce — v5.20 Adventure Depth Audit\n\nStatus: **${audit.status}**\n\n## Machine-observable expansion\n\n- Overworld nodes: ${c.overworldNodes}\n- Side-view routes: ${c.sideViewRoutes}\n- First-person interiors: ${c.firstPersonInteriors}\n- Named NPC encounters: ${c.namedNpcEncounters}\n- Enemy encounters: ${c.enemyEncounters}\n- Echo Shards: ${c.collectibleShards}\n- Puzzle steps: ${c.puzzleSteps}\n- Major quest items: ${c.majorQuestItems}\n- Required progression flags: ${plan.progressionFlags.length}\n- Minimum authored interaction beats: ${lowerBound}\n\n## Human gates still open\n\n${audit.blockers.map(b=>`- **${b.id}** — ${b.reason}`).join('\n')}\n\n## Claim boundary\n\n${audit.claimBoundary}\n`;
fs.writeFileSync('exports/playtests/legend-adventure-depth-audit.v5.20.md',md);
console.log(`Legend v5.20 depth audit: ${lowerBound} minimum authored interaction beats; commercial depth remains human review pending.`);
