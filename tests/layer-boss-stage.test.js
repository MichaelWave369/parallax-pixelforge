import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {createWorldSession,makeStarterAtlas,stepWorldSession} from '../layer-studio/room-atlas.js';
import {startPuzzle,stepPuzzle,hurtPlayer} from '../layer-studio/puzzle.js';
import {knownWorldFlags,evaluateQuestLine} from '../layer-studio/quest-world.js';
import {
  BOSS_SCHEMA,normalizeBoss,bossFlags,currentBoss,initializeBossRoom,
  stepBossStage,beginBossBattle,snapshotBoss,normalizeBossProgress,
  restoreBossProgress,renderBossStage,renderBossHud
} from '../layer-studio/boss-stage.js';
import {captureSave,restoreSave,writeSaveSlot,readSaveSlot} from '../layer-studio/adventure-journal.js';

const makeWorld=()=>{
  const root=createScene();
  root.atlas=makeStarterAtlas(root,normalizeScene);
  return normalizeScene(root);
};
function moveToDoor(session){
  const r=session.atlas.rooms.find(r=>r.id===session.roomId);
  const p=r.portals[0];
  session.game.player.x=p.x+3;session.game.player.y=p.y+p.h-42;
  session.game.player.grounded=true;
  return stepWorldSession(session,{interactPressed:true});
}
function reliquary(){
  const session=createWorldSession(makeWorld());
  session.game.keyCollected=true;
  assert.equal(moveToDoor(session).travelled,true);
  return session;
}
function intro(session){
  session.game.player.x=1255;session.game.player.y=458;
  session.game.player.grounded=true;
  const event=stepWorldSession(session);
  assert.equal(event.bossIntro,true);
  assert.equal(session.game.boss.status,'intro');
  return event;
}
function battle(){
  const session=reliquary();intro(session);
  assert.equal(beginBossBattle(session),true);
  return session;
}
function strike(session){
  const b=currentBoss(session);
  session.game.boss.invulnerable=0;
  session.game.shots.push({x:b.x+12,y:b.y+20,w:12,h:8,vx:0,ttl:1});
  return stepBossStage(session,1/60);
}
const store=()=>{
  const data=new Map();
  return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),
    removeItem:k=>data.delete(k)};
};

test('starter Reliquary authors an optional boss with bounded three-phase action and defeat flag',()=>{
  const root=makeWorld(),rooms=root.atlas.rooms;
  assert.equal(rooms.length,2);
  assert.equal('boss' in rooms[0],false);
  assert.equal(rooms[1].boss.schema,BOSS_SCHEMA);
  assert.equal(rooms[1].boss.name,'THE ASH WARDEN');
  assert.equal(rooms[1].boss.maxHealth,6);
  assert.equal(rooms[1].boss.phases.length,3);
  assert.deepEqual(bossFlags(root.atlas),['ash-warden-fallen']);
  assert.ok(knownWorldFlags(root.atlas).includes('ash-warden-fallen'));
  assert.deepEqual(normalizeScene(JSON.parse(JSON.stringify(root))).atlas,root.atlas);
  const single=createWorldSession(createScene());
  assert.equal(currentBoss(single),null);
  assert.equal('boss' in single.game,false);
});
test('introduction triggers exactly when player enters authored zone, pauses combat until accepted',()=>{
  const session=reliquary(),stage=session.game.boss;
  assert.equal(stage.status,'dormant');
  assert.equal(stage.hp,6);
  assert.equal(stepBossStage(session).introStarted,false);
  intro(session);
  assert.equal(beginBossBattle(session),true);
  assert.equal(beginBossBattle(session),false);
  assert.equal(stage.status,'battle');
  assert.equal(stage.hp,6);
  assert.equal(session.bossVersion,1);
});
test('stone ray hits boss, phases advance at health thresholds and victory sets world flag',()=>{
  const session=battle(),stage=session.game.boss;
  for(let n=0;n<6;n++){
    const before=stage.hp;
    const outcome=strike(session);
    assert.equal(stage.hp,before-1);
    assert.equal(outcome.defeated,n===5?true:undefined);
    assert.equal(stage.phase,n<1?0:n<3?1:2);
  }
  assert.equal(stage.status,'defeated');
  assert.equal(stage.hp,0);
  assert.deepEqual(stage.orbs,[]);
  assert.equal(session.worldFlags.has('ash-warden-fallen'),true);
  assert.equal(beginBossBattle(session),false);
  assert.equal(strike(session).defeated,undefined);
  assert.equal(stage.hp,0);
});
test('damage cooldown absorbs redundant shots and moving boss orbs use existing player health rules',()=>{
  const session=battle(),stage=session.game.boss,def=currentBoss(session);
  session.game.shots.push({x:def.x+10,y:def.y+15,w:12,h:8,vx:0,ttl:1});
  stepBossStage(session);
  assert.equal(stage.hp,5);
  session.game.shots.push({x:def.x+10,y:def.y+15,w:12,h:8,vx:0,ttl:1});
  stepBossStage(session);
  assert.equal(stage.hp,5);
  stage.attackTimer=0;
  session.game.player.x=1100;session.game.player.y=458;
  stepBossStage(session);
  assert.equal(stage.orbs.length,1);
  assert.ok(stage.orbs[0].vx<0);
  const orb=stage.orbs[0];
  orb.x=session.game.player.x+10;orb.y=session.game.player.y+20;
  session.game.player.invulnerable=0;
  stepBossStage(session);
  assert.equal(session.game.health,2);
  assert.equal(session.game.player.invulnerable>0,true);
  assert.equal(stage.orbs.length,0);
  // Existing damage helper still handles invulnerability and zero-health respawn.
  assert.equal(hurtPlayer(session.game),false);
  session.game.health=1;session.game.player.invulnerable=0;
  assert.equal(hurtPlayer(session.game),true);
  assert.equal(session.game.health,3);
  assert.equal(session.game.deaths,1);
});
test('boss health and defeat persist during backtracking without resurrecting boss',()=>{
  const session=battle();
  strike(session);strike(session);strike(session);
  assert.equal(session.game.boss.hp,3);
  assert.equal(moveToDoor(session).travelled,true);
  assert.equal(session.roomId,'lantern-vault');
  assert.equal('boss' in session.game,false);
  assert.equal(moveToDoor(session).travelled,true);
  assert.equal(session.game.boss.status,'battle');
  assert.equal(session.game.boss.hp,3);
  assert.equal(session.game.boss.phase,1);
  for(let i=0;i<3;i++)strike(session);
  assert.equal(session.game.boss.status,'defeated');
  assert.equal(moveToDoor(session).travelled,true);
  assert.equal(moveToDoor(session).travelled,true);
  assert.equal(session.game.boss.status,'defeated');
  assert.equal(session.game.boss.hp,0);
  assert.equal(session.worldFlags.has('ash-warden-fallen'),true);
});
test('save/load restores partial boss health and permanent victory, rejecting foreign IDs',()=>{
  const root=makeWorld(),s=reliquary(),storage=store();
  intro(s);beginBossBattle(s);
  strike(s);strike(s);
  assert.equal(s.game.boss.hp,4);
  const saved=writeSaveSlot(storage,root,s,2);
  assert.equal(saved.snapshots.reliquary.boss.hp,4);
  const loaded=readSaveSlot(storage,root,2);
  assert.equal(loaded.game.boss.status,'battle');
  assert.equal(loaded.game.boss.hp,4);
  assert.equal(loaded.game.boss.phase,1);
  const forged=captureSave(root,s,1);
  forged.snapshots.reliquary.boss={id:'unknown-boss',hp:0,status:'defeated'};
  const rejected=restoreSave(root,forged);
  assert.equal(rejected.game.boss.status,'dormant');
  assert.equal(rejected.game.boss.hp,6);
  const victory=battle();
  for(let i=0;i<6;i++)strike(victory);
  const save=writeSaveSlot(storage,root,victory,3);
  const resumed=readSaveSlot(storage,root,3);
  assert.equal(save.snapshots.reliquary.boss.status,'defeated');
  assert.equal(resumed.game.boss.status,'defeated');
  assert.equal(resumed.worldFlags.has('ash-warden-fallen'),true);
  assert.equal(resumed.game.boss.hp,0);
});
test('boss defeat can satisfy a quest and gate a door, without arbitrary script actions',()=>{
  const root=makeWorld();
  root.atlas.quests.push({id:'end-the-warden',title:'End the Warden',description:'Free the chamber.',objectives:[
    {id:'last-blow',kind:'flag',target:'ash-warden-fallen',label:'Defeat the Ash Warden'}]});
  root.atlas.rooms[1].portals[0].requiresQuest='end-the-warden';
  const s=createWorldSession(normalizeScene(root));
  s.game.keyCollected=true;
  assert.equal(moveToDoor(s).travelled,true);
  intro(s);beginBossBattle(s);
  assert.equal(moveToDoor(s).denied,'quest');
  for(let i=0;i<6;i++)strike(s);
  // Finished quest is evaluated after the fixed update before a door can open.
  stepWorldSession(s);
  assert.equal(evaluateQuestLine(s.atlas,s).find(q=>q.id==='end-the-warden').done,true);
  assert.equal(s.completedQuests.has('end-the-warden'),true);
  assert.equal(moveToDoor(s).travelled,true);
});
test('malformed boss metadata is clamped and imported script-like fields are discarded',()=>{
  assert.equal(normalizeBoss(null),null);
  assert.throws(()=>normalizeBoss({schema:'evil'}),/Invalid/);
  const def=normalizeBoss({
    schema:BOSS_SCHEMA,id:'bad id',name:'X'.repeat(900),intro:'I'.repeat(900),
    x:1e12,y:-1e12,w:9000,h:1,
    triggerW:999999,triggerH:-500,
    maxHealth:900,victoryFlag:'window.alert(1)',code:'evil()',
    phases:[
      {name:'A'.repeat(200),interval:-10,speed:1e6},
      {name:'Phase B',interval:2.5,speed:270},
      {name:'Phase C',interval:1.3,speed:340},
      {name:'Phase D',interval:1,speed:320}
    ]
  });
  assert.equal(def.id,'boss-warden');
  assert.equal(def.name.length,70);
  assert.equal(def.intro.length,350);
  assert.equal(def.x,5940);assert.equal(def.y,-200);
  assert.equal(def.w,150);assert.equal(def.h,45);
  assert.equal(def.triggerW,700);assert.equal(def.triggerH,24);
  assert.equal(def.maxHealth,12);assert.equal(def.victoryFlag,'');
  assert.equal(def.phases.length,3);assert.equal(def.phases[0].interval,.45);
  assert.equal(def.phases[0].speed,550);
  assert.equal('code' in def,false);
  assert.equal(normalizeBossProgress(def,{id:'imposter',hp:0,status:'defeated'}),null);
  assert.equal(normalizeBossProgress(def,{id:def.id,hp:-500,status:'defeated'}).status,'defeated');
});
test('rendering uses Canvas only and does not render dormant phase HUD',()=>{
  const session=reliquary();
  let rectangles=0,labels=0;
  const ctx=new Proxy({},{
    get(target,key){
      if(key in target)return target[key];
      if(key==='fillRect')return ()=>{rectangles++};
      if(key==='fillText')return ()=>{labels++};
      return ()=>{};
    },set(target,key,value){target[key]=value;return true;}
  });
  renderBossStage(ctx,session,0,{guides:true});
  assert.ok(rectangles>0);
  renderBossHud(ctx,session);
  assert.equal(labels,0);
  intro(session);beginBossBattle(session);
  renderBossHud(ctx,session);
  assert.ok(labels>=2);
});
test('editor, actor and cinematic panels include linked Rung 9 controls',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const play=readFileSync(new URL('../layer-studio/play.js',import.meta.url),'utf8');
  for(const id of [
    'addBossStage','removeBossStage','bossShowGuides','bossName','bossIntro',
    'bossVictoryFlag','bossMaxHealth','bossX','bossY','bossW','bossH',
    'bossTriggerX','bossTriggerY','bossTriggerW','bossTriggerH',
    ...[1,2,3].flatMap(n=>['bossPhase'+n+'Name','bossPhase'+n+'Interval','bossPhase'+n+'Speed'])
  ])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(studio,/renderBossStage/);
  assert.match(studio,/syncBossControls/);
  assert.match(play,/boss-intro/);
  assert.match(play,/beginBossBattle/);
  assert.match(play,/renderBossHud/);
});
