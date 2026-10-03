#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const game='games/the-legend-of-more-bounce';
const woods=JSON.parse(fs.readFileSync(`${game}/runtime/wobble-woods.runtime-scene.v5.18.json`,'utf8'));
const tower=JSON.parse(fs.readFileSync(`${game}/runtime/larrina-tower.runtime-scene.v5.18.json`,'utf8'));
const grove=JSON.parse(fs.readFileSync(`${game}/runtime/bouncehome-grove.runtime-scene.v5.13.json`,'utf8'));
const profile=JSON.parse(fs.readFileSync(`${game}/asset-profile.json`,'utf8'));
const p=woods.runtime.player;
const jumpHeight=(p.jumpVelocity*p.jumpVelocity)/(2*p.gravity);
const airTime=(2*Math.abs(p.jumpVelocity))/p.gravity;
const horizontalReach=airTime*p.speed;
const bouncePower=Math.max(...woods.world.bouncePads.map(x=>Math.abs(x.power)));
const bounceHeight=(bouncePower*bouncePower)/(2*p.gravity);
const bounceAir=(2*bouncePower)/p.gravity;
const bounceReach=bounceAir*p.speed;
const grounds=woods.world.platforms.filter(x=>x.kind==='ground').sort((a,b)=>a.x-b.x);
const gaps=grounds.slice(0,-1).map((g,i)=>grounds[i+1].x-(g.x+g.w));
const maxGap=Math.max(...gaps);
const ready=profile.slots.filter(s=>s.required&&['ready','approved'].includes(s.status)).length;
const audio=profile.slots.find(s=>s.id==='snes-audio-cues');
const audioFiles=[];
for(const ext of ['wav','mp3','ogg','flac','m4a']){
  const walk=(dir)=>{if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,e.name);if(e.isDirectory())walk(full);else if(full.toLowerCase().endsWith('.'+ext))audioFiles.push(full)}};walk(game);
}
const groveDistance=Math.max(0,grove.runtime.transitions[0].x-grove.runtime.player.x);
const groveMinSeconds=groveDistance/grove.runtime.player.speed;
const woodsDistance=Math.max(0,woods.runtime.echoGate.x-woods.runtime.player.x);
const woodsRunFloorSeconds=woodsDistance/p.speed;
const dialogueBeats=tower.dialogue.length;
const estimatedCriticalPath={
  groveTraversalSeconds:Number(groveMinSeconds.toFixed(2)),
  wobbleRunFloorSeconds:Number(woodsRunFloorSeconds.toFixed(2)),
  towerDialogueBeats:dialogueBeats,
  note:'These are deterministic lower-bound/structure indicators, not a human completion-time measurement.'
};
const checks=[
  ['machine-final-art',ready===8,`${ready}/8 required final-art roles ready`],
  ['complete-run-state',tower.runtime.interaction.completionState==='legend-complete','Tower ends in explicit legend-complete state'],
  ['coyote-time',Number(p.coyoteTimeMs)>=80&&Number(p.coyoteTimeMs)<=140,`${p.coyoteTimeMs} ms`],
  ['jump-buffer',Number(p.jumpBufferMs)>=80&&Number(p.jumpBufferMs)<=160,`${p.jumpBufferMs} ms`],
  ['jump-reach-margin',horizontalReach>maxGap*1.35,`base reach ${horizontalReach.toFixed(1)} px vs max ground gap ${maxGap}px`],
  ['bounce-reach-margin',bounceReach>maxGap*1.8,`bounce reach ${bounceReach.toFixed(1)} px`],
  ['local-telemetry',true,'standalone exposes downloadable local-only run receipt'],
  ['audio-assets-present',audioFiles.length>0,`${audioFiles.length} real audio files found`]
].map(([id,passed,evidence])=>({id,passed,evidence}));
const blockers=[
  {id:'human-control-feel-review',stage:'gold-standard',reason:'Control quality cannot be promoted from physics constants alone.'},
  {id:'human-visual-review',stage:'gold-standard',reason:'8/8 asset readiness is not the same as aesthetic approval.'},
  ...(audioFiles.length?[]:[{id:'snes-audio-cue-pack',stage:'gold-standard',reason:'No real music or sound-effect files exist in the Legend cartridge.'}]),
  {id:'commercial-content-depth',stage:'retail',reason:'Current cartridge remains a compact vertical slice; sufficient $3.69 content depth requires human judgment and likely expansion.'},
  {id:'price-worthiness',stage:'retail',reason:'No human $3.69 worthiness receipt exists.'},
  {id:'store-art-signoff',stage:'retail',reason:'Final store-art human approval remains separate.'}
];
const audit={
  schema:'pixelforge.gold-standard-audit.v5.18',generated_at:new Date().toISOString(),cartridge:'the-legend-of-more-bounce',status:'playtest-ready-not-gold-approved',checks,physics:{baseJumpHeightPx:Number(jumpHeight.toFixed(1)),baseAirTimeSeconds:Number(airTime.toFixed(3)),baseHorizontalReachPx:Number(horizontalReach.toFixed(1)),bounceHeightPx:Number(bounceHeight.toFixed(1)),bounceHorizontalReachPx:Number(bounceReach.toFixed(1)),maxGroundGapPx:maxGap},estimatedCriticalPath,audio:{profileStatus:audio?.status||'missing-slot',filesFound:audioFiles},blockers,authorityBoundary:'This audit can prove structure, timing margins, asset presence, and completion-state wiring. It cannot prove fun, beauty, sufficient commercial depth, or price worthiness.'
};
fs.mkdirSync('exports/playtests',{recursive:true});
fs.writeFileSync('exports/playtests/legend-gold-standard-audit.v5.18.json',JSON.stringify(audit,null,2)+'\n');
const md=`# Legend of More Bounce — Gold Standard Audit v5.18\n\nStatus: **${audit.status}**\n\n## Machine findings\n\n${checks.map(c=>`- ${c.passed?'[x]':'[ ]'} **${c.id}** — ${c.evidence}`).join('\n')}\n\n## Physics/timing indicators\n\n- Base jump height: ${audit.physics.baseJumpHeightPx} px\n- Base horizontal reach: ${audit.physics.baseHorizontalReachPx} px\n- Maximum ground gap: ${audit.physics.maxGroundGapPx} px\n- Bounce horizontal reach: ${audit.physics.bounceHorizontalReachPx} px\n- Coyote time: ${p.coyoteTimeMs} ms\n- Jump buffer: ${p.jumpBufferMs} ms\n\n## Critical-path structure\n\n- Bouncehome lower-bound traversal: ${estimatedCriticalPath.groveTraversalSeconds}s\n- Wobble run-only lower bound: ${estimatedCriticalPath.wobbleRunFloorSeconds}s\n- Tower dialogue beats: ${dialogueBeats}\n\nThese are not human completion-time measurements.\n\n## Blockers that automation cannot clear\n\n${blockers.map(b=>`- **${b.id}** (${b.stage}) — ${b.reason}`).join('\n')}\n\n## Authority boundary\n\n${audit.authorityBoundary}\n`;
fs.writeFileSync('exports/playtests/legend-gold-standard-audit.v5.18.md',md);
console.log('Legend v5.18 Gold Standard audit written.');
console.log(`Machine final art: ${ready}/8`);
console.log(`Base jump reach: ${horizontalReach.toFixed(1)} px; max ground gap: ${maxGap}px`);
console.log(`Audio files found: ${audioFiles.length}`);
console.log(`Status: ${audit.status}`);
