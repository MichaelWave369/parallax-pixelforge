import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAMEPAD_DEADZONE,neutralGamepad,readStandardGamepad,gamepadRisingEdges,firstStandardGamepad
} from '../src/standard-gamepad.js';
import {createSamplePlayableWorld,validatePlayableWorld} from '../src/playable-world.js';
import {newGameplaySession,advanceGameplaySession,addGameplayMarker} from '../src/gameplay-rules.js';
import {
  listPlaytestCheckpoints,playtestCheckpointAt,lastPlaytestCheckpoint,
  appendPlaytestFrame,digestPlayableWorld,createPlaytestSave,parsePlaytestSave
} from '../src/playtest-save.js';

function pad(axes=[0,0,0,0],buttons=[],mapping='standard'){
  return {connected:true,mapping,axes,buttons:buttons.map(pressed=>({pressed}))};
}
test('standard controller maps left stick movement, right stick camera and deadzone',()=>{
  const state=readStandardGamepad(pad([.8,-.8,.5,-.9]));
  assert.equal(state.connected,true);
  assert.ok(state.right>0&&state.forward>0&&state.turn>0&&state.look<0);
  assert.ok(Math.hypot(state.right,state.forward)<=1+1e-9);
  const neutral=readStandardGamepad(pad([.04,-.04,.12,-.12]));
  assert.deepEqual([neutral.right,neutral.forward,neutral.turn,neutral.look],[0,0,0,0]);
  assert.ok(GAMEPAD_DEADZONE>.1);
});
test('standard buttons map A jump, X interact, Start pause, Y checkpoint, RB sprint',()=>{
  const b=Array.from({length:17},()=>false);
  for(const i of [0,2,3,5,9])b[i]=true;
  const state=readStandardGamepad(pad([0,0,0,0],b));
  assert.deepEqual([state.jump,state.interact,state.pause,state.checkpoint,state.sprint],
    [true,true,true,true,true]);
  const l3=Array.from({length:17},()=>false);l3[10]=true;
  assert.equal(readStandardGamepad(pad([0,0,0,0],l3)).sprint,true);
});
test('D-pad supports movement independent of analog axes',()=>{
  const b=Array.from({length:17},()=>false);
  b[12]=true;b[15]=true;
  const state=readStandardGamepad(pad([0,0,0,0],b));
  assert.equal(state.forward,1);assert.equal(state.right,1);
  b[12]=false;b[15]=false;b[13]=true;b[14]=true;
  const reversed=readStandardGamepad(pad([0,0,0,0],b));
  assert.equal(reversed.forward,-1);assert.equal(reversed.right,-1);
});
test('actions are edge triggered and holding does not repeatedly interact or checkpoint',()=>{
  const b=Array.from({length:17},()=>false);b[0]=true;b[2]=true;b[3]=true;b[9]=true;
  const active=readStandardGamepad(pad([0,0,0,0],b));
  assert.deepEqual(gamepadRisingEdges(neutralGamepad(),active),
    {jump:true,interact:true,pause:true,checkpoint:true});
  assert.deepEqual(gamepadRisingEdges(active,active),
    {jump:false,interact:false,pause:false,checkpoint:false});
  assert.deepEqual(gamepadRisingEdges(active,neutralGamepad()),
    {jump:false,interact:false,pause:false,checkpoint:false});
  assert.equal(gamepadRisingEdges(neutralGamepad(),active).checkpoint,true);
});
test('disconnect, unsupported mapping and invalid analog values neutralize input',()=>{
  assert.deepEqual(readStandardGamepad(null),neutralGamepad());
  assert.deepEqual(readStandardGamepad({...pad([0,-1]),connected:false}),neutralGamepad());
  assert.deepEqual(readStandardGamepad(pad([0,-1,0,0],[],'xr-standard')),neutralGamepad());
  assert.deepEqual(readStandardGamepad(pad([NaN,Infinity,0,0])).right,0);
  assert.equal(firstStandardGamepad([null,pad([1,0],[],'unknown'),pad()]).mapping,'standard');
  assert.equal(firstStandardGamepad([]),null);
  assert.equal(firstStandardGamepad(null),null);
});
test('multiple earned checkpoints can be listed and restored independently',()=>{
  const world=createSamplePlayableWorld(),hash=world.source.sha256;
  world.gameplay=addGameplayMarker(world.gameplay,hash,'trigger',[8,1.2,8],
    'Upper Balcony','Reached upper balcony');
  const manifest=validatePlayableWorld(world);
  let state=newGameplaySession(),frames=[];
  for(const mark of manifest.gameplay.triggers){
    const result=advanceGameplaySession(manifest.gameplay,state,mark.position);
    assert.ok(result.events.some(e=>e.type==='trigger'));
    frames=appendPlaytestFrame(frames,mark.position,false,result.events);
    state=result.session;
  }
  const entries=listPlaytestCheckpoints(manifest,frames);
  assert.deepEqual(entries.map(x=>x.id),['trigger-1','trigger-2']);
  assert.deepEqual(entries.map(x=>x.frameIndex),[0,1]);
  assert.equal(entries[1].name,'Upper Balcony');
  const original=playtestCheckpointAt(manifest,frames,0),later=playtestCheckpointAt(manifest,frames,1);
  assert.deepEqual(original.progress.triggered,['trigger-1']);
  assert.deepEqual(later.progress.triggered,['trigger-1','trigger-2']);
  assert.equal(original.frames.length,1);
  assert.equal(later.frames.length,2);
  assert.equal(lastPlaytestCheckpoint(manifest,frames).id,'trigger-2');
  assert.throws(()=>playtestCheckpointAt(manifest,frames,2),/not an activated/);
  assert.throws(()=>playtestCheckpointAt(manifest,frames,-1),/Select an activated/);
});
test('checkpoint selection refuses forged non-checkpoint frames and old Rung 9 save remains valid',async()=>{
  const world=createSamplePlayableWorld(),digest=await digestPlayableWorld(world);
  const picked=advanceGameplaySession(world.gameplay,newGameplaySession(),
    world.gameplay.collectibles[0].position);
  const frames=appendPlaytestFrame([],world.gameplay.collectibles[0].position,false,picked.events);
  assert.deepEqual(listPlaytestCheckpoints(world,frames),[]);
  assert.throws(()=>playtestCheckpointAt(world,frames,0),/not an activated/);
  const save=createPlaytestSave(world,digest,world.spawn,frames);
  assert.deepEqual(parsePlaytestSave(JSON.stringify(save),world,digest),save);
});
