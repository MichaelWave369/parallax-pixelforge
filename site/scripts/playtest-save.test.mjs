import test from 'node:test';
import assert from 'node:assert/strict';
import {createSamplePlayableWorld,validatePlayableWorld} from '../src/playable-world.js';
import {newGameplaySession,advanceGameplaySession} from '../src/gameplay-rules.js';
import {
  PLAYTEST_SAVE_FORMAT,PLAYTEST_MAX_BYTES,PLAYTEST_MAX_FRAMES,
  digestPlayableWorld,playtestStorageKey,appendPlaytestFrame,replayPlaytestTrace,
  createPlaytestSave,validatePlaytestSave,parsePlaytestSave,lastPlaytestCheckpoint
} from '../src/playtest-save.js';

function runSample(){
  const world=createSamplePlayableWorld();
  let state=newGameplaySession(),frames=[];
  for(const mark of [
    world.gameplay.collectibles[0],
    world.gameplay.triggers[0],
    world.gameplay.graph.nodes.find(x=>x.kind==='secret'),
    world.gameplay.goal
  ]){
    const position=[...mark.position];
    const {session,events}=advanceGameplaySession(world.gameplay,state,position);
    frames=appendPlaytestFrame(frames,position,false,events);
    state=session;
  }
  return {world,state,frames};
}
test('world digest is content-bound even if imported source SHA metadata stays identical',async()=>{
  const world=createSamplePlayableWorld();
  const a=await digestPlayableWorld(world);
  assert.match(a,/^[a-f0-9]{64}$/);
  assert.equal(await digestPlayableWorld(structuredClone(world)),a);
  assert.equal(playtestStorageKey(a),'pixelforge.v6.playtest.v1.'+a);
  const changed=structuredClone(world);
  changed.objects[0].position[0]=1;
  assert.notEqual(await digestPlayableWorld(changed),a);
  const changedRules=structuredClone(world);
  changedRules.gameplay.graph.nodes[0].position[0]=5;
  assert.notEqual(await digestPlayableWorld(changedRules),a);
  assert.equal(changed.source.sha256,world.source.sha256);
});
test('save progress and exact position; load in a fresh session, replay deterministic events',async()=>{
  const {world,state,frames}=runSample(),hash=await digestPlayableWorld(world);
  const save=createPlaytestSave(world,hash,[2,2,-1],frames,1770000000000);
  assert.equal(save.format,PLAYTEST_SAVE_FORMAT);
  assert.equal(save.saved_at,1770000000000);
  assert.equal(save.progress.won,true);
  assert.deepEqual(save.position,[2,2,-1]);
  assert.deepEqual(save.progress,state);
  const restored=parsePlaytestSave(JSON.stringify(save),world,hash);
  assert.deepEqual(restored,save);
  const trace=replayPlaytestTrace(world,restored.frames);
  assert.equal(trace.timeline.length,4);
  assert.deepEqual(trace.timeline.map(f=>f.events.map(e=>e.type)),[
    ['collect'],['trigger'],['secret','door'],['win']
  ]);
});
test('last activated checkpoint provides an exact partial replay and re-entry location',()=>{
  const {world,frames}=runSample();
  const checkpoint=lastPlaytestCheckpoint(world,frames);
  assert.equal(checkpoint.id,'trigger-1');
  assert.equal(checkpoint.frameIndex,1);
  assert.deepEqual(checkpoint.position,world.gameplay.triggers[0].position);
  assert.deepEqual(checkpoint.progress.triggered,['trigger-1']);
  assert.deepEqual(checkpoint.progress.openedDoors,[]);
  assert.equal(checkpoint.frames.length,2);
  assert.equal(replayPlaytestTrace(world,checkpoint.frames).progress.won,false);
  assert.equal(lastPlaytestCheckpoint(world,frames.slice(0,1)),null);
});
test('switch interactions replay only when recorded as explicit interact frames',async()=>{
  const world=createSamplePlayableWorld();
  const hash=await digestPlayableWorld(world);
  const switchNode=world.gameplay.graph.nodes.find(x=>x.kind==='switch');
  const result=advanceGameplaySession(world.gameplay,newGameplaySession(),switchNode.position,{interact:true});
  assert.deepEqual(result.events.map(e=>e.type),['switch','door']);
  const frames=appendPlaytestFrame([],switchNode.position,true,result.events);
  const save=createPlaytestSave(world,hash,switchNode.position,frames);
  assert.deepEqual(validatePlaytestSave(save,world,hash).progress.openedDoors,['door-1']);
  const corrupted=structuredClone(save);corrupted.frames[0].interact=false;
  assert.throws(()=>validatePlaytestSave(corrupted,world,hash),/cannot be reproduced/);
});
test('wrong worlds, old revisions, and forged progress cannot be restored',async()=>{
  const {world,frames}=runSample(),hash=await digestPlayableWorld(world);
  const save=createPlaytestSave(world,hash,[0,2,0],frames);
  const changed=structuredClone(world);changed.gravity=-8;
  const changedHash=await digestPlayableWorld(changed);
  assert.throws(()=>validatePlaytestSave(save,changed,changedHash),/different playable world/);
  const forged=structuredClone(save);forged.progress.openedDoors=[];
  assert.throws(()=>validatePlaytestSave(forged,world,hash),/does not match/);
  const forgedEvent=structuredClone(save);forgedEvent.frames[1].event_ids=['win:goal-1'];
  assert.throws(()=>validatePlaytestSave(forgedEvent,world,hash),/cannot be reproduced/);
  const afterVictory=structuredClone(save);
  afterVictory.frames.push(afterVictory.frames[0]);
  assert.throws(()=>validatePlaytestSave(afterVictory,world,hash),/after world completion/);
});
test('malformed, oversized, executable, out-of-bounds and duplicate event data reject safely',async()=>{
  const {world,frames}=runSample(),hash=await digestPlayableWorld(world);
  const base=createPlaytestSave(world,hash,[0,1,0],frames);
  const extra=structuredClone(base);extra.script='alert(1)';
  assert.throws(()=>validatePlaytestSave(extra,world,hash),/unsupported/);
  const invalid=structuredClone(base);invalid.position=[0,Infinity,0];
  assert.throws(()=>validatePlaytestSave(invalid,world,hash),/bounded/);
  const wrong=structuredClone(base);wrong.frames[0].network='https://example.test';
  assert.throws(()=>validatePlaytestSave(wrong,world,hash),/unsupported/);
  const large=structuredClone(base);large.frames=Array.from({length:PLAYTEST_MAX_FRAMES+1},()=>base.frames[0]);
  assert.throws(()=>validatePlaytestSave(large,world,hash),/limit/);
  assert.throws(()=>parsePlaytestSave('x'.repeat(PLAYTEST_MAX_BYTES+1),world,hash),/64 KB/);
  assert.throws(()=>parsePlaytestSave('{"invalid":',world,hash),SyntaxError);
  assert.throws(()=>appendPlaytestFrame([],world.spawn,false,[]),/Only gameplay/);
});
test('older exploration-only worlds save and restore without a rules engine',async()=>{
  const world=createSamplePlayableWorld();delete world.gameplay;
  const validated=validatePlayableWorld(world),hash=await digestPlayableWorld(validated);
  const save=createPlaytestSave(validated,hash,[3,1,2],[],1770000000000);
  const loaded=parsePlaytestSave(JSON.stringify(save),validated,hash);
  assert.deepEqual(loaded.progress,newGameplaySession());
  assert.deepEqual(loaded.frames,[]);
  assert.equal(lastPlaytestCheckpoint(validated,[]),null);
});
test('trace cannot invent checkpoint rewards or mutate the source world',()=>{
  const {world,frames}=runSample(),source=JSON.stringify(world);
  const replay=replayPlaytestTrace(world,frames);
  assert.ok(replay.timeline[1].events.some(e=>e.id==='trigger-1'));
  assert.equal(JSON.stringify(world),source);
  assert.deepEqual(replay.progress.collected,['pickup-1']);
});
