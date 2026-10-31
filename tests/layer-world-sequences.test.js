import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {createWorldSession,makeStarterAtlas,stepWorldSession} from '../layer-studio/room-atlas.js';
import {knownWorldFlags,evaluateQuestLine,refreshQuestProgress} from '../layer-studio/quest-world.js';
import {stepBossTimeline} from '../layer-studio/boss-stage.js';
import {createCinematicDirector,stepCinematicDirector} from '../layer-studio/cinematic-director.js';
import {captureSave,restoreSave,writeSaveSlot,readSaveSlot,worldFingerprint} from '../layer-studio/adventure-journal.js';
import {
  WORLD_SEQUENCE_SCHEMA,normalizeWorldSequences,worldSequenceFlags,tracksFor,
  initializeSequenceRoom,nearbyWorldSequence,tryOpenWorldSequence,
  activeWorldTrack,createWorldTimeline,completeWorldSequence,
  cancelWorldSequence,renderSequenceGuides
} from '../layer-studio/world-sequences.js';

function world(){
  const scene=createScene();scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene);
}
const memoryStore=()=>{
  const entries=new Map();
  return {getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,String(v)),
    removeItem:k=>entries.delete(k)};
};
function atArchive(root=world()){
  const session=createWorldSession(root);
  session.game.player.x=740;session.game.player.y=458;session.game.player.grounded=true;
  return session;
}
test('starter Stone Archive is authored in Lantern Vault and contributes a quest world flag',()=>{
  const root=world(),room=root.atlas.rooms[0];
  assert.equal(room.sequences.schema,WORLD_SEQUENCE_SCHEMA);
  assert.equal(room.sequences.tracks.length,1);
  assert.equal(room.sequences.tracks[0].id,'the-stone-archive');
  assert.equal(room.sequences.tracks[0].beats.length,3);
  assert.equal(room.sequences.tracks[0].beats[1].focusX,1320);
  assert.deepEqual(worldSequenceFlags(root.atlas),['archive-revealed']);
  assert.equal(knownWorldFlags(root.atlas).includes('archive-revealed'),true);
  assert.deepEqual(normalizeScene(JSON.parse(JSON.stringify(root))).atlas,root.atlas);
});
test('interacting with a discovery opens a pause-worthy timeline without awarding the flag',()=>{
  const s=atArchive();
  assert.equal(nearbyWorldSequence(s)?.id,'the-stone-archive');
  assert.equal(stepWorldSession(s,{interactPressed:true}).worldSequence,true);
  assert.equal(activeWorldTrack(s)?.id,'the-stone-archive');
  assert.equal(s.worldFlags.has('archive-revealed'),false);
  assert.equal(s.game.sequenceSeen.has('the-stone-archive'),false);
  const timeline=createWorldTimeline(s);
  assert.equal(timeline.kind,'world');
  assert.equal(timeline.beats.length,3);
  assert.equal(timeline.beats[1].focusX,1320);
  for(let i=0;i<150;i++)stepBossTimeline(timeline,.1);
  assert.equal(timeline.finished,true);
  assert.equal(s.worldFlags.has('archive-revealed'),false);
  assert.equal(s.game.player.x>700,true);
});
test('cancelled discoveries never award completion; replay allows a legitimate finish',()=>{
  const s=atArchive();
  assert.equal(tryOpenWorldSequence(s,{interactPressed:true}),true);
  cancelWorldSequence(s);
  assert.equal(s.activeWorldSequence,null);
  assert.equal(s.worldFlags.size,0);
  assert.equal(s.game.sequenceSeen.size,0);
  assert.equal(tryOpenWorldSequence(s,{interactPressed:true}),true);
  assert.deepEqual(completeWorldSequence(s),{id:'the-stone-archive',flag:'archive-revealed'});
  assert.equal(s.activeWorldSequence,null);
  assert.equal(s.worldFlags.has('archive-revealed'),true);
  assert.equal(s.game.sequenceSeen.has('the-stone-archive'),true);
  assert.equal(nearbyWorldSequence(s),null);
  assert.equal(completeWorldSequence(s),null);
  assert.equal(s.sequenceVersion,1);
});
test('a sequence flag can satisfy quest objectives and guard existing Room Atlas doors',()=>{
  const root=world();
  root.atlas.quests.push({id:'archive-keeper',title:'Awaken the Archive',
    description:'Read the vault inscription.',objectives:[
      {id:'read',kind:'flag',target:'archive-revealed',label:'Reveal the inscription'}]});
  root.atlas.rooms[0].portals[0].requiresFlag='archive-revealed';
  const s=atArchive(normalizeScene(root));
  const door=s.atlas.rooms[0].portals[0];
  s.game.keyCollected=true;
  s.game.player.x=door.x+4;s.game.player.y=door.y+door.h-42;
  assert.equal(stepWorldSession(s,{interactPressed:true}).denied,'flag');
  s.game.player.x=740;s.game.player.y=458;
  assert.equal(stepWorldSession(s,{interactPressed:true}).worldSequence,true);
  assert.equal(evaluateQuestLine(s.atlas,s).find(q=>q.id==='archive-keeper').done,false);
  completeWorldSequence(s);refreshQuestProgress(s);
  assert.equal(evaluateQuestLine(s.atlas,s).find(q=>q.id==='archive-keeper').done,true);
  assert.equal(s.completedQuests.has('archive-keeper'),true);
  s.game.player.x=door.x+4;s.game.player.y=door.y+door.h-42;
  assert.equal(stepWorldSession(s,{interactPressed:true}).travelled,true);
});
test('camera and lighting for world discoveries can focus a precise world X without moving the player',()=>{
  const s=atArchive();
  tryOpenWorldSequence(s,{interactPressed:true});
  const playback=createWorldTimeline(s);
  const director=createCinematicDirector(s,playback,0);
  const playerX=s.game.player.x;
  playback.index=1;
  stepCinematicDirector(director,s,.01,{reducedMotion:true});
  const target=Math.min(s.game.puzzle.worldWidth-s.scene.width,
    Math.max(0,1320-s.scene.width/2));
  assert.equal(director.cameraX,target);
  assert.equal(director.ambient,.63);
  assert.equal(director.cue,'THE FAR CHAMBER STIRS');
  assert.equal(s.game.player.x,playerX);
  assert.equal(s.game.health,3);
});
test('discovery receipts survive save/reload and returning to the vault',()=>{
  const root=world(),s=atArchive(root),storage=memoryStore();
  tryOpenWorldSequence(s,{interactPressed:true});
  completeWorldSequence(s);
  const saved=writeSaveSlot(storage,root,s,2);
  assert.deepEqual(saved.snapshots['lantern-vault'].sequenceSeen,['the-stone-archive']);
  assert.ok(saved.worldFlags.includes('archive-revealed'));
  const resumed=readSaveSlot(storage,root,2);
  assert.equal(resumed.worldFlags.has('archive-revealed'),true);
  assert.equal(resumed.game.sequenceSeen.has('the-stone-archive'),true);
  assert.equal(nearbyWorldSequence(resumed),null);
  const gate=resumed.atlas.rooms[0].portals[0];
  resumed.game.keyCollected=true;
  resumed.game.player.x=gate.x+4;resumed.game.player.y=gate.y+gate.h-42;
  assert.equal(stepWorldSession(resumed,{interactPressed:true}).travelled,true);
  const back=resumed.atlas.rooms[1].portals[0];
  resumed.game.player.x=back.x+4;resumed.game.player.y=back.y+back.h-42;
  assert.equal(stepWorldSession(resumed,{interactPressed:true}).travelled,true);
  assert.equal(resumed.game.sequenceSeen.has('the-stone-archive'),true);
  assert.equal(resumed.worldFlags.has('archive-revealed'),true);
});
test('loading a forged discovery receipt validates it against actual authored tracks',()=>{
  const root=world(),s=atArchive(root),record=captureSave(root,s,1);
  record.snapshots['lantern-vault'].sequenceSeen=['fake-event','the-stone-archive','evil'];
  record.worldFlags=['fake-completion','archive-revealed'];
  const loaded=restoreSave(root,record);
  assert.deepEqual([...loaded.game.sequenceSeen],['the-stone-archive']);
  assert.deepEqual([...loaded.worldFlags],['archive-revealed']);
  record.snapshots['lantern-vault'].sequenceSeen='bad type';
  const cleaned=restoreSave(root,record);
  assert.equal(cleaned.game.sequenceSeen.size,0);
});
test('unknown flags, invalid sequences and empty beats cannot open a discovery',()=>{
  const root=world(),r=root.atlas.rooms[0];
  r.sequences.tracks[0].requiresFlag='never-earned';
  const s=atArchive(root);
  assert.equal(nearbyWorldSequence(s),null);
  assert.equal(tryOpenWorldSequence(s,{interactPressed:true}),false);
  r.sequences.tracks[0].requiresFlag='';
  r.sequences.tracks[0].beats=[];
  assert.equal(nearbyWorldSequence(s),null);
  assert.throws(()=>normalizeWorldSequences({schema:'invalid'}),/Invalid PixelForge/);
  assert.equal(normalizeWorldSequences(null),null);
  assert.deepEqual(normalizeWorldSequences({schema:WORLD_SEQUENCE_SCHEMA}),{
    schema:WORLD_SEQUENCE_SCHEMA,tracks:[]
  });
});
test('imported sequence data is bounded and scripting/URLs are discarded',()=>{
  const raw={schema:WORLD_SEQUENCE_SCHEMA,tracks:Array.from({length:50},(_,i)=>({
    id:'seq-'+i,title:'T'.repeat(400),x:1e12,y:-1e12,w:5000,h:-90,
    requiresFlag:'window.hijack(1)',completionFlag:'javascript:bad',onclick:'run()',
    beats:Array.from({length:9},()=>({
      title:'X'.repeat(300),text:'Y'.repeat(4000),seconds:-900,
      camera:'https://site.test',ambient:42,focusX:1e12,cue:'Z'.repeat(700),
      href:'javascript:evil()'
    }))
  }))};
  const normalized=normalizeWorldSequences(raw);
  assert.equal(normalized.tracks.length,8);
  const t=normalized.tracks[0];
  assert.equal(t.title.length,80);assert.equal(t.x,6000);
  assert.equal(t.y,-200);assert.equal(t.w,800);assert.equal(t.h,16);
  assert.equal(t.requiresFlag,'');assert.equal(t.completionFlag,'');
  assert.equal('onclick' in t,false);
  assert.equal(t.beats.length,4);
  assert.equal(t.beats[0].seconds,.7);assert.equal(t.beats[0].ambient,.8);
  assert.equal(t.beats[0].focusX,6000);assert.equal(t.beats[0].cue.length,80);
  assert.equal('href' in t.beats[0],false);
});
test('legacy worlds without sequences retain original payload shape and save logic',()=>{
  const single=createWorldSession(createScene());
  assert.equal('sequenceSeen' in single.game,false);
  assert.equal(tracksFor(single).length,0);
  initializeSequenceRoom(single);
  assert.equal('sequenceSeen' in single.game,false);
  const root=world();
  for(const room of root.atlas.rooms)delete room.sequences;
  const normalized=normalizeScene(root);
  assert.equal('sequences' in normalized.atlas.rooms[0],false);
  const session=createWorldSession(normalized);
  assert.equal('sequenceSeen' in session.game,false);
  assert.ok(worldFingerprint(normalized));
  const raw=captureSave(normalized,session,1);
  assert.equal('sequenceSeen' in raw.snapshots['lantern-vault'],false);
});
test('world sequence guides use Canvas rendering and editor/player controls are wired',()=>{
  const room=world().atlas.rooms[0];let rectangles=0;
  const ctx=new Proxy({},{
    get(obj,k){
      if(k in obj)return obj[k];
      if(k==='strokeRect')return ()=>{rectangles++};
      return ()=>{};
    },set(obj,k,v){obj[k]=v;return true;}
  });
  renderSequenceGuides(ctx,room,0);
  assert.equal(rectangles,1);
  const editor=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const player=readFileSync(new URL('../layer-studio/play.js',import.meta.url),'utf8');
  for(const id of ['sequenceSelect','sequenceTitle','sequenceX','sequenceY','sequenceW',
    'sequenceH','sequenceRequiresFlag','sequenceCompletionFlag','sequenceOnce',
    'sequenceBeatSelect','sequenceBeatTitle','sequenceBeatText','sequenceBeatSeconds',
    'sequenceBeatCamera','sequenceBeatFocusX','sequenceBeatAmbient','sequenceBeatCue',
    'addSequence','removeSequence','addSequenceBeat','removeSequenceBeat',
    'sequenceGuides','sequenceStatus'])assert.match(editor,new RegExp('id="'+id+'"'));
  assert.match(studio,/syncSequenceControls/);
  assert.match(player,/createWorldTimeline/);
  assert.match(player,/completeWorldSequence/);
  assert.match(player,/cancelWorldSequence/);
  assert.match(player,/world-sequence/);
});
