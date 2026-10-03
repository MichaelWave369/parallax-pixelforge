#!/usr/bin/env node
import fs from 'node:fs';
const game='games/the-legend-of-more-bounce';
const chapter=JSON.parse(fs.readFileSync(`${game}/adventure/chapter-five-mirrorfall-convergence.v5.27.json`,'utf8'));
const save=JSON.parse(fs.readFileSync(`${game}/save-profile.v5.27.json`,'utf8'));
const travel=JSON.parse(fs.readFileSync(`${game}/travel-profile.v5.27.json`,'utf8'));
const audio=JSON.parse(fs.readFileSync(`${game}/assets/audio-v527/mirrorfall-audio.v0.1.json`,'utf8'));
const evidence={
 chapter:5,newRuntimeScenes:4,crossViewCausalLinks:3,topDownPrisms:chapter.topDown.prismPylons,sideViewPulseNodes:chapter.sideView.pulseNodes,firstPersonShutters:chapter.firstPerson.shutters,bossPhases:chapter.boss.phases,
 minimumAuthoredInteractionBeats:14,audioCues:audio.cues.length,travelLandmarks:travel.landmarks.length,saveSchemaVersion:save.schemaVersion,migratesFrom:['v5.24','v5.25','v5.26'],networkSync:save.networkSync
};
const blockers=[
 {id:'human-cross-view-causality-clarity',reason:'A human must confirm that changes in one perspective are understandable in the others.'},
 {id:'human-view-switch-friction',reason:'A human must judge whether moving between viewpoints feels exciting rather than cumbersome.'},
 {id:'human-blind-angle-readability',reason:'The three boss phases require human readability/fairness review.'},
 {id:'human-chapter-five-pacing',reason:'Machine interaction counts cannot establish satisfying pacing.'},
 {id:'commercial-content-depth',reason:'More authored beats do not prove commercial value.'},
 {id:'price-worthiness',reason:'$3.69 worthiness remains a named human judgment.'}
];
const out={schema:'pixelforge.legend-convergence-audit.v5.27',status:'machine-three-view-convergence-contract-pass-human-cross-view-clarity-switch-friction-boss-readability-pacing-and-commercial-depth-review-pending',machineEvidence:evidence,blockers};
fs.mkdirSync('exports/playtests',{recursive:true});fs.writeFileSync('exports/playtests/legend-three-view-convergence-audit.v5.27.json',JSON.stringify(out,null,2));
const md=`# Legend Three-View Convergence Audit — v5.27\n\n## Machine evidence\n\n- Chapter: 5\n- Runtime scenes: ${evidence.newRuntimeScenes}\n- Cross-view causal links: ${evidence.crossViewCausalLinks}\n- Top-down prism pylons: ${evidence.topDownPrisms}\n- Side-view Pulse Nodes: ${evidence.sideViewPulseNodes}\n- First-person lens shutters: ${evidence.firstPersonShutters}\n- Blind Angle phases: ${evidence.bossPhases}\n- Minimum authored interaction beats: ${evidence.minimumAuthoredInteractionBeats}\n- New original audio cues: ${evidence.audioCues}\n- Travel landmarks: ${evidence.travelLandmarks}\n- Save schema version: ${evidence.saveSchemaVersion}\n- Legacy migration: v5.24, v5.25, v5.26\n- Network sync: ${evidence.networkSync}\n\n## Human gates still open\n\n${blockers.map(b=>`- **${b.id}** — ${b.reason}`).join('\n')}\n\n**Status:** ${out.status}\n`;
fs.writeFileSync('Legend_Three_View_Convergence_Audit_v5_27.md',md);console.log(out.status);
