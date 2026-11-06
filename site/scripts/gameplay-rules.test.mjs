import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleVrWorld,fingerprintVrWorld,newPhysicsProfile,placeOnSurface} from '../src/vr-physics-bridge.js';
import {buildPlayableWorld,createSamplePlayableWorld,parsePlayableWorld,validatePlayableWorld} from '../src/playable-world.js';
import {GAMEPLAY_FORMAT,MAX_PICKUPS,MAX_TRIGGERS,
  newGameplayRules,validateGameplayRules,addGameplayMarker,removeGameplayMarker,
  editGameplayMarker,newGameplaySession,advanceGameplaySession,markerPositionForObject} from '../src/gameplay-rules.js';

async function fixture(){
  const world=sampleVrWorld(),hash=await fingerprintVrWorld(world);
  return {world,hash,profile:newPhysicsProfile(world,hash)};
}
test('Rung 5 files without gameplay still import unchanged',()=>{
  const sample=createSamplePlayableWorld();
  const old=JSON.parse(JSON.stringify(sample));delete old.gameplay;
  assert.equal(validatePlayableWorld(old).gameplay,undefined);
  assert.equal(parsePlayableWorld(JSON.stringify(old)).gameplay,undefined);
});
test('builder authors collectibles, checkpoints, finish and strictly source-binds them',async()=>{
  const {world,hash,profile}=await fixture();
  const before=JSON.stringify(world),src=JSON.stringify(profile);
  let rules=newGameplayRules(hash);
  rules=addGameplayMarker(rules,hash,'collectible',[1,1,-4],'Phi Crystal');
  rules=addGameplayMarker(rules,hash,'trigger',[2,1,-4],'Checkpoint','Open the gate.');
  rules=addGameplayMarker(rules,hash,'goal',[3,1,-4],'Final Exit','You won!');
  assert.equal(rules.format,GAMEPLAY_FORMAT);
  assert.equal(rules.collectibles.length,1);
  assert.equal(rules.triggers.length,1);
  assert.equal(rules.goal.name,'Final Exit');
  const playable=buildPlayableWorld(world,profile,hash,-9.81,rules);
  assert.deepEqual(parsePlayableWorld(JSON.stringify(playable)).gameplay,rules);
  assert.equal(JSON.stringify(world),before);
  assert.equal(JSON.stringify(profile),src);
  assert.throws(()=>validateGameplayRules(rules,'a'.repeat(64)),/match/);
  assert.throws(()=>validatePlayableWorld({...playable,source:{...playable.source,sha256:'b'.repeat(64)}}),/match/);
});
test('gameplay progression is position-based, ordered, single-fire, and goal gated',async()=>{
  const {hash}=await fixture();
  let rules=newGameplayRules(hash);
  rules=addGameplayMarker(rules,hash,'collectible',[1,1,0],'Spark');
  rules=addGameplayMarker(rules,hash,'trigger',[4,1,0],'Checkpoint','Portal ready');
  rules=addGameplayMarker(rules,hash,'goal',[7,1,0],'Finish','Complete!');
  const zero=newGameplaySession();
  const early=advanceGameplaySession(rules,zero,[7,1,0]);
  assert.deepEqual(early.session,zero);
  assert.equal(early.events.length,0);
  const a=advanceGameplaySession(rules,zero,[1,1,0]);
  assert.deepEqual(a.events.map(e=>e.type),['collect']);
  assert.deepEqual(advanceGameplaySession(rules,a.session,[1,1,0]).events,[]);
  const b=advanceGameplaySession(rules,a.session,[4,1,0]);
  assert.deepEqual(b.events.map(e=>e.type),['trigger']);
  const won=advanceGameplaySession(rules,b.session,[7,1,0]);
  assert.equal(won.session.won,true);
  assert.deepEqual(won.events.map(e=>e.type),['win']);
  assert.deepEqual(advanceGameplaySession(rules,won.session,[7,1,0]).events,[]);
  assert.equal(newGameplaySession().won,false);
});
test('pickup, checkpoint and goal co-located with player fire in deterministic order',async()=>{
  const {hash}=await fixture();
  let rules=newGameplayRules(hash);
  rules=addGameplayMarker(rules,hash,'collectible',[0,0,0],'Spark');
  rules=addGameplayMarker(rules,hash,'trigger',[0,0,0],'Switch','Enabled');
  rules=addGameplayMarker(rules,hash,'goal',[0,0,0],'Exit','Won');
  const {session,events}=advanceGameplaySession(rules,newGameplaySession(),[0,0,0]);
  assert.deepEqual(events.map(e=>e.type),['collect','trigger','win']);
  assert.equal(session.won,true);
});
test('marker editor is immutable, bounded and rejects unsupported executable fields',async()=>{
  const {hash}=await fixture();
  const initial=newGameplayRules(hash);
  const marker=addGameplayMarker(initial,hash,'collectible',[0,1,0],'Spark');
  const updated=editGameplayMarker(marker,hash,'pickup-1',{position:[.5,1,0],radius:1.5});
  assert.equal(marker.collectibles[0].radius,1.25);
  assert.equal(updated.collectibles[0].radius,1.5);
  assert.equal(removeGameplayMarker(updated,hash,'pickup-1').collectibles.length,0);
  assert.throws(()=>editGameplayMarker(marker,hash,'pickup-1',{js:'alert(1)'}),/executable/);
  assert.throws(()=>addGameplayMarker(initial,hash,'script',[0,0,0],'Bad'),/Unknown/);
  assert.throws(()=>addGameplayMarker(initial,hash,'collectible',[Infinity,0,0],'Bad'),/radius/);
  assert.throws(()=>addGameplayMarker(initial,hash,'collectible',[0,0,0],''),/text/);
  assert.throws(()=>validateGameplayRules({...initial,execute:'code'},hash),/executable/);
  assert.throws(()=>validateGameplayRules({...marker,collectibles:[marker.collectibles[0],marker.collectibles[0]]},hash),/duplicate/);
  assert.throws(()=>validateGameplayRules({...initial,goal:{id:'goal-1',name:'Exit',position:[0,0,0],radius:1,message:'Done',url:'https://bad'}},hash),/executable/);
});
test('strict collection limits and stable marker positions',async()=>{
  const {world,hash}=await fixture();
  let rules=newGameplayRules(hash);
  for(let i=0;i<MAX_PICKUPS;i++)rules=addGameplayMarker(rules,hash,'collectible',[i,1,0],'Spark');
  assert.throws(()=>addGameplayMarker(rules,hash,'collectible',[1,1,1],'Extra'),/limit/);
  for(let i=0;i<MAX_TRIGGERS;i++)rules=addGameplayMarker(rules,hash,'trigger',[i,1,2],'Gate','Activated');
  assert.throws(()=>addGameplayMarker(rules,hash,'trigger',[1,1,1],'Too many','Hi'),/limit/);
  const p=markerPositionForObject(world.objects[0]);
  assert.deepEqual(p,[0,.9,-4]);
});
test('world player starter course is winnable by a deterministic position path',()=>{
  const sample=createSamplePlayableWorld();
  assert.ok(sample.gameplay);
  let state=newGameplaySession();
  for(const marker of [...sample.gameplay.collectibles,...sample.gameplay.triggers,sample.gameplay.goal]){
    const tick=advanceGameplaySession(sample.gameplay,state,marker.position);
    state=tick.session;
  }
  assert.equal(state.won,true);
});
