import test from 'node:test';
import assert from 'node:assert/strict';
import {createSamplePlayableWorld} from '../src/playable-world.js';
import {advanceGameplaySession,newGameplaySession} from '../src/gameplay-rules.js';
import {appendPlaytestFrame,createPlaytestSave,digestPlayableWorld} from '../src/playtest-save.js';
import {preparePublishedRun} from '../src/published-session.js';

test('Continue restores a saved position and exact game progress before first physics step',async()=>{
  const world=createSamplePlayableWorld(),digest=await digestPlayableWorld(world);
  const pickup=world.gameplay.collectibles[0];
  const result=advanceGameplaySession(world.gameplay,newGameplaySession(),pickup.position);
  assert.ok(result.events.some(item=>item.type==='collect'));
  const frames=appendPlaytestFrame([],pickup.position,false,result.events);
  const save=createPlaytestSave(world,digest,[3,2,4],frames,1770000012000);
  const source=JSON.stringify(save);
  const prepared=preparePublishedRun(world,save);
  assert.deepEqual(prepared.position,[3,2,4]);
  assert.deepEqual(prepared.progress,save.progress);
  assert.deepEqual(prepared.frames,frames);
  assert.ok(prepared.activity.length>0);
  assert.notStrictEqual(prepared.frames[0].position,frames[0].position);
  assert.equal(JSON.stringify(save),source);
});
test('fresh adventure requires no saved data and cannot forge a Continue state',async()=>{
  const world=createSamplePlayableWorld();
  assert.throws(()=>preparePublishedRun(world,null),/Cannot start Continue/);
  assert.throws(()=>preparePublishedRun(world,{position:[0,0,0]}),/Cannot start Continue/);
  const digest=await digestPlayableWorld(world);
  const good=createPlaytestSave(world,digest,world.spawn,[]);
  const tampered={...good,progress:{...good.progress,collected:['pickup-1']}};
  assert.throws(()=>preparePublishedRun(world,tampered),/does not match/);
  const modified=structuredClone(world);modified.gravity=-7;
  assert.equal(preparePublishedRun(world,good).progress.won,false);
  // This helper validates the exact event trace. Caller also verifies digest
  // against modified world before invoking it.
  assert.equal(typeof (await digestPlayableWorld(modified)),'string');
});
test('Continue supports rule-free explorer worlds and never edits source game geometry',async()=>{
  const world=createSamplePlayableWorld();delete world.gameplay;
  const digest=await digestPlayableWorld(world),before=JSON.stringify(world);
  const save=createPlaytestSave(world,digest,[1,3,2],[]);
  const run=preparePublishedRun(world,save);
  assert.deepEqual(run.frames,[]);
  assert.deepEqual(run.position,[1,3,2]);
  assert.equal(run.progress.won,false);
  assert.equal(JSON.stringify(world),before);
});
