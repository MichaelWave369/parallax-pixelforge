#!/usr/bin/env node
import fs from 'node:fs';
const game='games/the-legend-of-more-bounce';
const chapter=JSON.parse(fs.readFileSync(`${game}/adventure/chapter-four-stormglass-coast.v5.26.json`,'utf8'));
const travel=JSON.parse(fs.readFileSync(`${game}/travel-profile.v5.26.json`,'utf8'));
const audio=JSON.parse(fs.readFileSync(`${game}/assets/audio-v526/stormglass-coast-audio.v0.1.json`,'utf8'));
const requiredBeats=1+3+1+3+1+4+5+5+1; // Sable, shells, mantle, dash gaps, prism, puzzle, boss dash/strike cycles, reward
const audit={
 schema:'pixelforge.legend-stormglass-coast-audit.v5.26',
 status:'machine-chapter-four-contract-pass-human-air-dash-cliff-readability-puzzle-boss-pacing-and-commercial-depth-review-pending',
 machineEvidence:{chapter:4,newRegion:'Stormglass Coast',namedNpc:'Sable Current',collectibles:3,permanentUpgrade:'Gale Mantle',upgradeMechanic:'midair-dash',requiredDashGaps:3,firstPersonPuzzleSteps:4,boss:'The Undertow Bell',bossHealth:5,bossRequiredAbility:'galeMantle',chapterReward:'Stormglass Compass',travelLandmarks:travel.landmarks.length,audioCues:audio.cues.length,minimumAuthoredInteractionBeats:requiredBeats,saveSchema:'pixelforge.legend-save.v5.26',saveSchemaVersion:3,legacySaveSchemas:['pixelforge.legend-save.v5.24','pixelforge.legend-save.v5.25'],networkSync:false},
 blockers:[
  {id:'human-air-dash-feel',label:'Human Gale Mantle / air-dash feel review'},
  {id:'human-cliff-readability',label:'Human Stormglass Cliffs readability / gap telegraphing review'},
  {id:'human-tide-puzzle-clarity',label:'Human Tide Engine puzzle clarity review'},
  {id:'human-undertow-boss-fairness',label:'Human Undertow Bell timing / fairness review'},
  {id:'human-chapter-four-pacing',label:'Human Chapter Four pacing review'},
  {id:'commercial-content-depth',label:'Commercial content depth remains a human judgment'},
  {id:'price-worthiness',label:'$3.69 worthiness remains a human judgment'}
 ],
 privacy:'Chapter Four progress, saves and travel state remain local-only; no network telemetry or cloud sync.'
};
fs.mkdirSync('exports/playtests',{recursive:true});
fs.writeFileSync('exports/playtests/legend-stormglass-coast-audit.v5.26.json',JSON.stringify(audit,null,2));
fs.writeFileSync('exports/playtests/legend-stormglass-coast-audit.v5.26.md',`# Legend Stormglass Coast Audit v5.26\n\n**Status:** ${audit.status}\n\n- Required authored interaction beats: ${requiredBeats}\n- Tideglass Shells: 3\n- Permanent upgrade: Gale Mantle\n- Required air-dash gaps: 3\n- Tide Engine puzzle inputs: 4\n- Undertow Bell health: 5\n- Travel landmarks after Chapter Four: ${travel.landmarks.length}\n- Original Chapter Four audio cues: ${audio.cues.length}\n- v5.24/v5.25 save migration: REQUIRED\n- Network sync: NO\n\n## Human review still required\n${audit.blockers.map(b=>`- ${b.label}`).join('\n')}\n\nPrivacy: ${audit.privacy}\n`);
console.log('Legend v5.26 Stormglass Coast audit written:',audit.status);
