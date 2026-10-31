import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {createWorldSession,makeStarterAtlas,stepWorldSession} from '../layer-studio/room-atlas.js';
import {
  BOSS_SCHEMA,normalizeBoss,normalizeBossBeats,bossTimelineBeats,createBossTimeline,
  stepBossTimeline,currentBoss,beginBossBattle,stepBossStage,renderBossStage
} from '../layer-studio/boss-stage.js';
import {writeSaveSlot,readSaveSlot} from '../layer-studio/adventure-journal.js';

function world(){
  const root=createScene();
  root.atlas=makeStarterAtlas(root,normalizeScene);
  return normalizeScene(root);
}
function makeReliquary(){
  const s=createWorldSession(world()),portal=s.atlas.rooms[0].portals[0];
  s.game.keyCollected=true;
  s.game.player.x=portal.x+4;s.game.player.y=portal.y+portal.h-42;
  s.game.player.grounded=true;
  assert.equal(stepWorldSession(s,{interactPressed:true}).travelled,true);
  return s;
}
function startFight(){
  const s=makeReliquary();
  const def=currentBoss(s);
  s.game.player.x=def.triggerX+9;
  s.game.player.y=def.triggerY+50;
  assert.equal(stepWorldSession(s).bossIntro,true);
  assert.equal(beginBossBattle(s),true);
  return s;
}
function shot(s){
  const def=currentBoss(s);
  s.game.boss.invulnerable=0;
  s.game.shots.push({x:def.x+12,y:def.y+20,w:12,h:8,vx:0,ttl:1});
  return stepWorldSession(s);
}

test('Rung 10 starter authors three predictable warnings, timed introduction and victory',()=>{
  const root=world(),def=root.atlas.rooms[1].boss;
  assert.equal(def.schema,BOSS_SCHEMA);
  assert.deepEqual(def.phases.map(p=>p.telegraph),[.85,.63,.38]);
  assert.deepEqual(def.phases.map(p=>p.cue),['ASH ORB INCOMING','SHADOW BOLT','LAST EMBER']);
  assert.equal(def.introBeats.length,3);
  assert.equal(def.victoryBeats.length,2);
  assert.equal(def.introBeats[1].text.includes('spark'),true);
  assert.equal(def.victoryBeats[1].title,'A PATH OPENS');
  assert.deepEqual(normalizeScene(JSON.parse(JSON.stringify(root))).atlas,root.atlas);
});

test('legacy Rung 9 boss scenes do not gain telegraph and timeline authoring fields',()=>{
  const old=normalizeBoss({schema:BOSS_SCHEMA,name:'ORIGINAL GUARDIAN',
    phases:[{name:'ONE',interval:2,speed:180},{name:'TWO',interval:1.4,speed:230},
      {name:'THREE',interval:.8,speed:315}]});
  assert.equal(Object.hasOwn(old,'introBeats'),false);
  assert.equal(Object.hasOwn(old,'victoryBeats'),false);
  assert.ok(old.phases.every(p=>!Object.hasOwn(p,'telegraph')&&!Object.hasOwn(p,'cue')));
  assert.deepEqual(normalizeBoss(old),old);
  const intro=bossTimelineBeats(old,'intro');
  const victory=bossTimelineBeats(old,'victory');
  assert.equal(intro.length,1);assert.equal(victory.length,1);
  assert.match(intro[0].text,/silence/);
});

test('cinematic beat normalization clamps imported text, duration, and number of beats',()=>{
  const beats=normalizeBossBeats(Array.from({length:20},()=>({
    title:'T'.repeat(900),text:'W'.repeat(2000),seconds:-300,script:'window.evil()'
  })));
  assert.equal(beats.length,4);
  assert.equal(beats[0].title.length,70);
  assert.equal(beats[0].text.length,220);
  assert.equal(beats[0].seconds,.7);
  assert.equal(Object.hasOwn(beats[0],'script'),false);
  const src=normalizeBoss({schema:BOSS_SCHEMA,
    phases:[{interval:.45,telegraph:999,cue:'X'.repeat(200)},
      {interval:1.5,telegraph:0},{interval:3,telegraph:.75}],
    introBeats:beats,victoryBeats:[]});
  assert.ok(src.phases[0].telegraph<=.35);
  assert.equal(src.phases[1].telegraph,.15);
  assert.equal(src.phases[0].cue.length,70);
  assert.equal(src.victoryBeats.length,0);
  assert.equal(bossTimelineBeats(src,'victory').length,1);
  assert.equal(normalizeBossBeats(null).length,0);
});

test('cinematic timeline advances in fixed bounded steps and never starts the fight itself',()=>{
  const s=makeReliquary(),def=currentBoss(s);
  s.game.player.x=def.triggerX+9;s.game.player.y=def.triggerY+50;
  assert.equal(stepWorldSession(s).bossIntro,true);
  const timeline=createBossTimeline(def,'intro');
  assert.equal(timeline.kind,'intro');
  assert.equal(timeline.index,0);
  assert.throws(()=>createBossTimeline(def,'invalid'),/Unknown boss timeline/);
  assert.equal(stepBossTimeline(timeline,0),false);
  let changed=0;
  for(let n=0;n<180;n++)if(stepBossTimeline(timeline,.1))changed++;
  assert.equal(timeline.finished,true);
  assert.equal(timeline.index,def.introBeats.length-1);
  assert.equal(changed,def.introBeats.length);
  assert.equal(stepBossTimeline(timeline,.1),false);
  assert.equal(s.game.boss.status,'intro'); // time alone is not permission to attack
  assert.equal(beginBossBattle(s),true);
  const v=createBossTimeline(def,'victory');
  for(let n=0;n<150;n++)stepBossTimeline(v,.1);
  assert.equal(v.finished,true);
  assert.equal(v.index,def.victoryBeats.length-1);
});

test('warning locks aim before attack, so dodging after the cue changes the outcome',()=>{
  const s=startFight(),def=currentBoss(s),stage=s.game.boss;
  stage.attackTimer=def.phases[0].telegraph-.05;
  s.game.player.x=1050;s.game.player.y=390;
  const expectedY=Math.max(280,Math.min(500,s.game.player.y+s.game.player.h/2));
  stepBossStage(s);
  assert.equal(stage.aim.toward,-1);
  assert.equal(stage.aim.y,expectedY);
  const locked={...stage.aim};
  // Move across the guardian after the warning. The attack must retain its original lane.
  s.game.player.x=1650;s.game.player.y=510;
  let fired=false;
  for(let i=0;i<80;i++){
    stepBossStage(s);
    if(stage.orbs.length){fired=true;break;}
  }
  assert.equal(fired,true);
  assert.equal(stage.orbs[0].vx,-def.phases[0].speed);
  assert.equal(stage.orbs[0].y,locked.y);
  assert.equal(stage.aim,null);
  assert.ok(stage.attackTimer>0);
  assert.equal(s.game.health,3);
});

test('phase changes reset warning aim and use the next authored telegraph duration',()=>{
  const s=startFight(),stage=s.game.boss,def=currentBoss(s);
  stage.attackTimer=.1;
  s.game.player.x=1100;s.game.player.y=390;
  stepBossStage(s);
  assert.ok(stage.aim);
  s.game.player.x=700;s.game.player.y=458;
  // Two hits move this six-HP boss into phase 2.
  shot(s);shot(s);
  assert.equal(stage.phase,1);
  assert.equal(stage.aim,null);
  assert.equal(stage.attackTimer,def.phases[1].interval);
  stage.attackTimer=def.phases[1].telegraph+.05;
  stepBossStage(s);
  assert.equal(stage.aim,null);
  stepBossStage(s,.1);
  assert.ok(stage.aim);
});

test('victory is emitted exactly once after the lethal ray, with flag before the cinematic',()=>{
  const s=startFight(),def=currentBoss(s);
  for(let i=0;i<def.maxHealth-1;i++)assert.equal(shot(s).bossVictory,undefined);
  const result=shot(s);
  assert.equal(result.bossVictory,true);
  assert.equal(s.game.boss.status,'defeated');
  assert.equal(s.worldFlags.has(def.victoryFlag),true);
  assert.equal(stepWorldSession(s).bossVictory,undefined);
  const timeline=createBossTimeline(def,'victory');
  assert.equal(timeline.beats.length,2);
  assert.equal(timeline.beats[0].title,'THE LAST EMBER');
  assert.equal(s.game.boss.hp,0);
});

test('save/load and backtracking cannot replay an already-completed victory sequence',()=>{
  const root=world(),s=createWorldSession(root),storage=new Map();
  const vault=s.atlas.rooms[0].portals[0];
  s.game.keyCollected=true;s.game.player.x=vault.x+4;
  s.game.player.y=vault.y+vault.h-42;s.game.player.grounded=true;
  assert.equal(stepWorldSession(s,{interactPressed:true}).travelled,true);
  const def=currentBoss(s);
  s.game.player.x=def.triggerX+9;s.game.player.y=def.triggerY+50;
  assert.equal(stepWorldSession(s).bossIntro,true);
  beginBossBattle(s);
  for(let i=0;i<def.maxHealth;i++)shot(s);
  const store={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),
    removeItem:k=>storage.delete(k)};
  writeSaveSlot(store,root,s,1);
  const resumed=readSaveSlot(store,root,1);
  assert.equal(resumed.game.boss.status,'defeated');
  assert.equal(stepWorldSession(resumed).bossVictory,undefined);
  assert.equal(resumed.worldFlags.has('ash-warden-fallen'),true);
  const portal=resumed.atlas.rooms[1].portals[0];
  resumed.game.player.x=portal.x+4;resumed.game.player.y=portal.y+portal.h-42;
  resumed.game.player.grounded=true;
  assert.equal(stepWorldSession(resumed,{interactPressed:true}).travelled,true);
  resumed.game.player.x=vault.x+4;resumed.game.player.y=vault.y+vault.h-42;
  resumed.game.player.grounded=true;
  assert.equal(stepWorldSession(resumed,{interactPressed:true}).travelled,true);
  assert.equal(resumed.game.boss.status,'defeated');
});

test('warning visualization uses Canvas and points along captured aim lane',()=>{
  const s=startFight(),stage=s.game.boss;
  stage.attackTimer=.2;s.game.player.x=1000;s.game.player.y=430;
  stepBossStage(s);
  let fill=0,labels=0,paths=0;
  const ctx=new Proxy({},{
    get(obj,key){
      if(key in obj)return obj[key];
      if(key==='fillRect')return ()=>{fill++};
      if(key==='fillText')return ()=>{labels++};
      if(key==='beginPath')return ()=>{paths++};
      return ()=>{};
    },set(obj,key,value){obj[key]=value;return true;}
  });
  renderBossStage(ctx,s,0);
  assert.ok(fill>=4);
  assert.ok(labels>=1);
  assert.ok(paths>0);
});

test('studio and player expose authored telegraph, cinematic and victory controls',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const player=readFileSync(new URL('../layer-studio/play.js',import.meta.url),'utf8');
  for(const i of [1,2,3])for(const suffix of ['Telegraph','Cue'])
    assert.match(html,new RegExp('id="bossPhase'+i+suffix+'"'));
  for(const [kind,count] of [['Intro',3],['Victory',2]])
    for(let i=1;i<=count;i++)for(const suffix of ['Title','Text','Seconds'])
      assert.match(html,new RegExp('id="boss'+kind+'Beat'+i+suffix+'"'));
  assert.match(studio,/bossTimelineBeats/);
  assert.match(studio,/Telegraph/);
  assert.match(player,/boss-victory/);
  assert.match(player,/createBossTimeline/);
  assert.match(player,/stepBossTimeline/);
  assert.match(player,/NEXT BEAT/);
});
