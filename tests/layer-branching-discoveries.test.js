import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {createWorldSession,makeStarterAtlas,stepWorldSession} from '../layer-studio/room-atlas.js';
import {knownWorldFlags,evaluateQuestLine,refreshQuestProgress} from '../layer-studio/quest-world.js';
import {
  WORLD_SEQUENCE_SCHEMA,normalizeWorldSequences,worldSequenceFlags,
  activeWorldTrack,worldSequenceChoices,nearbyWorldSequence,completeWorldSequence,
  cancelWorldSequence,tryOpenWorldSequence,createWorldTimeline
} from '../layer-studio/world-sequences.js';
import {captureSave,restoreSave,writeSaveSlot,readSaveSlot} from '../layer-studio/adventure-journal.js';

function world(){
  const scene=createScene();scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene);
}
function travel(session){
  const door=session.atlas.rooms.find(r=>r.id===session.roomId).portals[0];
  session.game.keyCollected=true;
  session.game.player.x=door.x+4;
  session.game.player.y=door.y+door.h-42;
  session.game.player.grounded=true;
  return stepWorldSession(session,{interactPressed:true});
}
function atFork(){
  const session=createWorldSession(world());
  // Earn the actual upstream archive discovery instead of inventing its flag.
  session.game.player.x=740;session.game.player.y=458;
  session.game.player.grounded=true;
  assert.equal(stepWorldSession(session,{interactPressed:true}).worldSequence,true);
  assert.equal(completeWorldSequence(session)?.flag,'archive-revealed');
  assert.equal(travel(session).travelled,true);
  session.game.player.x=720;session.game.player.y=458;session.game.player.grounded=true;
  assert.equal(nearbyWorldSequence(session)?.id,'forked-echo');
  return session;
}
function decision(session,choiceId){
  assert.equal(stepWorldSession(session,{interactPressed:true}).worldSequence,true);
  assert.equal(activeWorldTrack(session)?.id,'forked-echo');
  return completeWorldSequence(session,choiceId);
}
const store=()=>{
  const data=new Map();
  return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),
    removeItem:k=>data.delete(k)};
};

test('Rung 13 demo is a fork with two mutually gated follow-up discoveries',()=>{
  const root=world(),vault=root.atlas.rooms[0],room=root.atlas.rooms[1];
  assert.equal(vault.sequences.tracks.length,1);
  assert.equal(vault.sequences.tracks[0].choices,undefined);
  assert.equal(room.sequences.tracks.length,3);
  const [fork,kept,quiet]=room.sequences.tracks;
  assert.equal(fork.id,'forked-echo');
  assert.equal(fork.requiresFlag,'archive-revealed');
  assert.equal(fork.completionFlag,'fork-decided');
  assert.equal(fork.once,true);
  assert.deepEqual(fork.choices.map(c=>c.id),['honor','silence']);
  assert.deepEqual(fork.choices.map(c=>c.setFlag),['echo-honored','echo-silenced']);
  assert.equal(kept.requiresFlag,'echo-honored');
  assert.equal(kept.unlessFlag,'echo-silenced');
  assert.equal(quiet.requiresFlag,'echo-silenced');
  assert.equal(quiet.unlessFlag,'echo-honored');
  assert.deepEqual(worldSequenceFlags(root.atlas),[
    'archive-revealed','fork-decided','echo-honored','echo-silenced',
    'promise-kept','chamber-hushed'
  ]);
  assert.ok(knownWorldFlags(root.atlas).includes('echo-honored'));
  assert.deepEqual(normalizeScene(JSON.parse(JSON.stringify(root))).atlas,root.atlas);
});

test('open a fork, explicitly select an authored answer, and earn precisely one branch flag',()=>{
  const session=atFork();
  assert.equal(tryOpenWorldSequence(session,{interactPressed:false}),false);
  assert.equal(stepWorldSession(session,{interactPressed:true}).worldSequence,true);
  assert.equal(worldSequenceChoices(session).length,2);
  assert.equal(createWorldTimeline(session).beats.length,2);
  const before=[...session.worldFlags];
  assert.equal(completeWorldSequence(session),null);
  assert.equal(completeWorldSequence(session,'fake-choice'),null);
  assert.deepEqual([...session.worldFlags],before);
  assert.equal(session.activeWorldSequence.id,'forked-echo');
  const result=completeWorldSequence(session,'honor');
  assert.deepEqual(result,{
    id:'forked-echo',flag:'fork-decided',choiceId:'honor',choiceFlag:'echo-honored'
  });
  assert.equal(session.worldFlags.has('fork-decided'),true);
  assert.equal(session.worldFlags.has('echo-honored'),true);
  assert.equal(session.worldFlags.has('echo-silenced'),false);
  assert.equal(session.game.sequenceSeen.has('forked-echo'),true);
  assert.equal(session.activeWorldSequence,null);
  assert.equal(completeWorldSequence(session,'silence'),null);
  assert.equal(nearbyWorldSequence(session),null); // Once-only fork is finished.
});

test('cancelling a branch never makes a choice or awards completion',()=>{
  const session=atFork();
  assert.equal(stepWorldSession(session,{interactPressed:true}).worldSequence,true);
  cancelWorldSequence(session);
  assert.equal(session.activeWorldSequence,null);
  assert.equal(session.worldFlags.has('fork-decided'),false);
  assert.equal(session.game.sequenceSeen.has('forked-echo'),false);
  assert.equal(stepWorldSession(session,{interactPressed:true}).worldSequence,true);
  assert.equal(completeWorldSequence(session,'silence')?.choiceFlag,'echo-silenced');
  assert.equal(session.worldFlags.has('echo-honored'),false);
  assert.equal(session.worldFlags.has('fork-decided'),true);
});

test('each branch unlocks a different follow-up; the unchosen path fails closed',()=>{
  for(const [chosen,expectedId,expectedFlag,blockedId] of [
    ['honor','promise-path','promise-kept','silence-path'],
    ['silence','silence-path','chamber-hushed','promise-path']
  ]){
    const session=atFork();
    assert.equal(decision(session,chosen)?.choiceId,chosen);
    session.game.player.x=1060;session.game.player.y=458;
    const follow=nearbyWorldSequence(session);
    assert.equal(follow?.id,expectedId);
    assert.equal(stepWorldSession(session,{interactPressed:true}).worldSequence,true);
    assert.equal(activeWorldTrack(session).id,expectedId);
    assert.equal(worldSequenceChoices(session).length,0);
    const earned=completeWorldSequence(session);
    assert.equal(earned.flag,expectedFlag);
    assert.equal(session.worldFlags.has(expectedFlag),true);
    assert.equal(session.atlas.rooms[1].sequences.tracks.find(t=>t.id===blockedId)
      .requiresFlag!==session.worldFlags.has(chosen==='honor'?'echo-honored':'echo-silenced'),true);
    assert.equal(nearbyWorldSequence(session),null);
  }
});

test('branch flags can satisfy quests and conditional doors using unchanged world-state contracts',()=>{
  const root=world();
  root.atlas.quests.push({id:'promise-oath',title:'A Promise Remembered',
    objectives:[{id:'promise',kind:'flag',target:'promise-kept',label:'Keep the promise'}]});
  root.atlas.rooms[1].portals[0].requiresFlag='promise-kept';
  const session=createWorldSession(normalizeScene(root));
  session.game.player.x=740;session.game.player.y=458;
  assert.equal(stepWorldSession(session,{interactPressed:true}).worldSequence,true);
  completeWorldSequence(session);
  assert.equal(travel(session).travelled,true);
  session.game.player.x=720;session.game.player.y=458;
  assert.equal(decision(session,'honor').choiceFlag,'echo-honored');
  assert.equal(evaluateQuestLine(session.atlas,session)
    .find(q=>q.id==='promise-oath').done,false);
  assert.equal(travel(session).denied,'flag');
  session.game.player.x=1060;session.game.player.y=458;
  assert.equal(stepWorldSession(session,{interactPressed:true}).worldSequence,true);
  assert.equal(completeWorldSequence(session).flag,'promise-kept');
  refreshQuestProgress(session);
  assert.equal(session.completedQuests.has('promise-oath'),true);
  assert.equal(travel(session).travelled,true);
});

test('branch choices and follow-up completion survive backtracking and local save/load',()=>{
  const root=world(),s=createWorldSession(root),storage=store();
  s.game.player.x=740;s.game.player.y=458;
  assert.equal(stepWorldSession(s,{interactPressed:true}).worldSequence,true);
  completeWorldSequence(s);
  assert.equal(travel(s).travelled,true);
  s.game.player.x=720;s.game.player.y=458;
  assert.equal(decision(s,'silence')?.choiceFlag,'echo-silenced');
  s.game.player.x=1060;s.game.player.y=458;
  assert.equal(stepWorldSession(s,{interactPressed:true}).worldSequence,true);
  assert.equal(completeWorldSequence(s).flag,'chamber-hushed');
  const saved=writeSaveSlot(storage,root,s,1);
  assert.deepEqual(saved.snapshots.reliquary.sequenceSeen.sort(),['forked-echo','silence-path']);
  assert.equal(saved.worldFlags.includes('echo-silenced'),true);
  const loaded=readSaveSlot(storage,root,1);
  assert.equal(loaded.game.sequenceSeen.has('forked-echo'),true);
  assert.equal(loaded.game.sequenceSeen.has('silence-path'),true);
  assert.equal(loaded.worldFlags.has('echo-honored'),false);
  assert.equal(loaded.worldFlags.has('echo-silenced'),true);
  assert.equal(travel(loaded).travelled,true);
  assert.equal(travel(loaded).travelled,true);
  loaded.game.player.x=720;loaded.game.player.y=458;
  assert.equal(nearbyWorldSequence(loaded),null);
  loaded.game.player.x=1060;
  assert.equal(nearbyWorldSequence(loaded),null);
});

test('malformed, duplicate and oversize choice metadata is bounded, never executable',()=>{
  const malformed=normalizeWorldSequences({
    schema:WORLD_SEQUENCE_SCHEMA,tracks:[{
      id:'riddle',title:'Danger',beats:[{title:'Q',text:'A',seconds:1}],
      choices:Array.from({length:6},(_,i)=>({
        id:i?'same':'javascript:bad',label:'A'.repeat(300),
        setFlag:'javascript:alert(1)',onclick:'run()',url:'https://evil.test'
      })),
      unlessFlag:'data:attack'
    }]
  });
  const track=malformed.tracks[0];
  assert.equal(track.choices.length,3);
  assert.equal(new Set(track.choices.map(c=>c.id)).size,3);
  assert.equal(track.choices[0].id,'choice-0');
  assert.equal(track.choices[0].label.length,90);
  assert.equal(track.choices.every(c=>c.setFlag===''),true);
  assert.equal(track.unlessFlag,'');
  assert.equal(track.choices.some(c=>'onclick' in c||'url' in c),false);
  assert.deepEqual(normalizeWorldSequences({
    schema:WORLD_SEQUENCE_SCHEMA,tracks:[{id:'old',beats:[]}]
  }).tracks[0].choices,undefined);
});

test('unknown but syntactically valid prerequisites never silently unlock branches',()=>{
  const root=world(),r=root.atlas.rooms[1];
  const t=r.sequences.tracks.find(x=>x.id==='promise-path');
  t.requiresFlag='future-unknown-flag';
  const session=atFork();
  decision(session,'honor');
  session.game.player.x=1060;session.game.player.y=458;
  assert.equal(nearbyWorldSequence(session),null);
  assert.equal(t.unlessFlag,'echo-silenced');
});

test('old Rung 12 discoveries without choices still finish with no argument',()=>{
  const root=world(),old=root.atlas.rooms[0].sequences.tracks[0];
  assert.equal('choices' in old,false);
  assert.equal('unlessFlag' in old,false);
  const s=createWorldSession(root);
  s.game.player.x=740;s.game.player.y=458;
  assert.equal(stepWorldSession(s,{interactPressed:true}).worldSequence,true);
  assert.equal(worldSequenceChoices(s).length,0);
  assert.equal(completeWorldSequence(s,'honor'),null);
  assert.deepEqual(completeWorldSequence(s),
    {id:'the-stone-archive',flag:'archive-revealed'});
  assert.equal(s.game.sequenceSeen.has('the-stone-archive'),true);
});

test('Studio and Play contain live branching choices and exclusion fields',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const play=readFileSync(new URL('../layer-studio/play.js',import.meta.url),'utf8');
  for(const field of ['sequenceUnlessFlag','sequenceChoiceSelect','sequenceChoiceLabel',
    'sequenceChoiceFlag','addSequenceChoice','removeSequenceChoice'])
    assert.match(html,new RegExp('id="'+field+'"'));
  assert.match(studio,/selectedSequenceChoiceIndex/);
  assert.match(studio,/rewriteSequence\('choice'/);
  assert.match(play,/worldSequenceChoices/);
  assert.match(play,/finishWorldSequence/);
  assert.match(play,/SKIP TO THE DECISION/);
  assert.match(play,/sequence-choice-selected/);
});
