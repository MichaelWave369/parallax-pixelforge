#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
execFileSync(process.execPath,['scripts/build_legend_v518_playtest.js'],{stdio:'inherit'});
const base='exports/runtime/legend-v5.18-gold-standard-playtest.html';
let html=fs.readFileSync(base,'utf8');
const audioDir='games/the-legend-of-more-bounce/assets/audio-v519';
const manifest=JSON.parse(fs.readFileSync(path.join(audioDir,'legend-audio-cues.v0.1.json'),'utf8'));
const audio={};
for(const cue of manifest.cues){audio[cue.id]=`data:audio/wav;base64,${fs.readFileSync(path.join(audioDir,cue.file)).toString('base64')}`}
html=html
 .replaceAll('v5.18 Gold Standard Playtest','v5.19 Audio-Ready Gold Playtest')
 .replaceAll('PIXELFORGE v5.18 · GOLD STANDARD PLAYTEST','PIXELFORGE v5.19 · AUDIO-READY GOLD PLAYTEST')
 .replace('<span class="badge ready">CONTROL TUNING ACTIVE</span>','<span class="badge ready">CONTROL TUNING ACTIVE</span><span class="badge ready">AUDIO 10/10 READY</span>')
 .replace('<button id="downloadRun">DOWNLOAD RUN</button>','<button id="downloadRun">DOWNLOAD RUN</button><button id="soundToggle">♫ SOUND OFF</button>')
 .replace('v5.18 adds coyote time, jump buffering, variable jump height, acceleration/deceleration, and local-only run telemetry.','v5.19 retains the tuned controls and adds four original local music loops plus six event SFX. Sound starts OFF for browser autoplay safety; use the SOUND button to enable it.')
 .replace("a.download='legend-gold-playtest-run-v5.18.json'","a.download='legend-gold-playtest-run-v5.19.json'");

const injection=`<script>
const PF_AUDIO=${JSON.stringify(audio).replace(/</g,'\\u003c')};
let pfSound=false,pfMusic=null,pfLastScene=null,pfLastRune=false,pfLastBounces=0,pfLastFalls=0,pfLastDialogue=0,pfLastCompleted=false;
function pfStopMusic(){if(pfMusic){pfMusic.pause();pfMusic.currentTime=0;pfMusic=null}}
function pfPlaySfx(id,vol=.55){if(!pfSound||!PF_AUDIO[id])return;const a=new Audio(PF_AUDIO[id]);a.volume=vol;a.play().catch(()=>{})}
function pfSceneMusic(target,previous){if(!pfSound)return; if(target==='larrina-tower'&&previous==='wobble-woods')pfPlaySfx('gate-open',.62); if(target==='legend-complete'){pfStopMusic();pfPlaySfx('ending',.65);return} const id=target==='bouncehome-grove'?'overworld':target==='wobble-woods'?'woods':target==='larrina-tower'?'tower':null;if(!id)return;if(pfMusic?.dataset?.cue===id)return;pfStopMusic();pfMusic=new Audio(PF_AUDIO[id]);pfMusic.dataset.cue=id;pfMusic.loop=true;pfMusic.volume=.28;pfMusic.play().catch(()=>{})}
const pfBtn=document.getElementById('soundToggle');pfBtn.onclick=()=>{pfSound=!pfSound;pfBtn.textContent=pfSound?'♫ SOUND ON':'♫ SOUND OFF';pfBtn.classList.toggle('ready',pfSound);if(pfSound)pfSceneMusic(scene,pfLastScene);else pfStopMusic();c.focus()};
setInterval(()=>{try{if(scene!==pfLastScene){const prev=pfLastScene;pfLastScene=scene;pfSceneMusic(scene,prev)}if(rune&&!pfLastRune)pfPlaySfx('rune-pickup',.62);pfLastRune=rune;if(run.bouncePadHits>pfLastBounces)pfPlaySfx('bounce-impact',.48);pfLastBounces=run.bouncePadHits;if(run.falls>pfLastFalls)pfPlaySfx('hit',.60);pfLastFalls=run.falls;if(run.dialogueAdvances>pfLastDialogue)pfPlaySfx('dialogue-blip',.34);pfLastDialogue=run.dialogueAdvances;if(run.completed&&!pfLastCompleted)pfPlaySfx('ending',.65);pfLastCompleted=run.completed}catch{}},60);
</script>`;
html=html.replace('</body></html>',`${injection}</body></html>`);
fs.mkdirSync('exports/runtime',{recursive:true});
const out='exports/runtime/legend-v5.19-audio-gold-playtest.html';fs.writeFileSync(out,html);console.log(`Built ${out} with ${manifest.cues.length} embedded audio cues.`);
