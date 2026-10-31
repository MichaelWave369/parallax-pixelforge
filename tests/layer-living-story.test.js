import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {startPuzzle,stepPuzzle} from '../layer-studio/puzzle.js';
import {makeStarterAtlas,createWorldSession,stepWorldSession} from '../layer-studio/room-atlas.js';
import {knownWorldFlags} from '../layer-studio/quest-world.js';
import {worldFingerprint,writeSaveSlot,readSaveSlot,captureSave,restoreSave}
  from '../layer-studio/adventure-journal.js';
import {
  STORY_SCHEMA,normalizeStory,storyFlags,storyFor,nearbyDialogue,
  initializeStoryRoom,stepStoryEvents,chooseDialogue,storyScene,renderStoryGuides
} from '../layer-studio/living-story.js';

const rootWorld=()=>{
  const scene=createScene();scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene);
};
function moveToDoor(s){
  const room=s.atlas.rooms.find(r=>r.id===s.roomId),door=room.portals[0];
  s.game.player.x=door.x+3;s.game.player.y=door.y+door.h-42;
  s.game.player.grounded=true;return stepWorldSession(s,{interactPressed:true},1/60);
}
function enterReliquary(){
  const s=createWorldSession(rootWorld());
  s.game.keyCollected=true;
  assert.equal(moveToDoor(s).travelled,true);
  return s;
}
const storage=()=>{
  const map=new Map();
  return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),
    removeItem:k=>map.delete(k)};
};
test('Rung 8 starter scene has Echo Keeper, two choices, a guardian and reactive arches',()=>{
  const root=rootWorld();
  const vault=root.atlas.rooms[0],room=root.atlas.rooms[1];
  assert.equal('story' in vault,false);
  assert.equal(room.story.schema,STORY_SCHEMA);
  assert.equal(room.story.dialogues.length,1);
  assert.equal(room.story.dialogues[0].speaker,'ECHO KEEPER');
  assert.equal(room.story.dialogues[0].choices.length,2);
  assert.equal(room.story.encounters[0].enemyId,'hall-wraith');
  assert.equal(room.story.variants[0].mode,'reveal');
  assert.deepEqual(storyFlags(root.atlas),['reliquary-lit','reliquary-silent']);
  assert.ok(knownWorldFlags(root.atlas).includes('reliquary-lit'));
  assert.deepEqual(normalizeScene(JSON.parse(JSON.stringify(root))).atlas,root.atlas);
});
test('interacting with a dialogue pauses travel, validates a choice and sets an authored flag',()=>{
  const session=enterReliquary();
  session.game.player.x=485;session.game.player.y=458;
  assert.equal(nearbyDialogue(session)?.id,'keeper-choice');
  const result=stepWorldSession(session,{interactPressed:true},1/60);
  assert.equal(result.storyOpen,true);
  assert.equal(result.travelled,false);
  assert.equal(session.dialogue.roomId,'reliquary');
  assert.throws(()=>chooseDialogue(session,'not-a-choice'),/does not exist/);
  assert.equal(session.worldFlags.size,0);
  const outcome=chooseDialogue(session,'restore');
  assert.equal(outcome.flag,'reliquary-lit');
  assert.equal(session.dialogue,null);
  assert.equal(session.worldFlags.has('reliquary-lit'),true);
  assert.equal(session.game.storySeen.has('keeper-choice'),true);
  assert.equal(session.storyVersion,1);
  assert.equal(nearbyDialogue(session),null);
});
test('both dialogue branches are valid but cannot be selected together in a once-only conversation',()=>{
  const session=enterReliquary();
  session.game.player.x=485;session.game.player.y=458;
  assert.equal(stepWorldSession(session,{interactPressed:true}).storyOpen,true);
  assert.equal(chooseDialogue(session,'quiet').flag,'reliquary-silent');
  assert.equal(stepWorldSession(session,{interactPressed:true}).storyOpen,undefined);
  assert.equal(session.worldFlags.has('reliquary-silent'),true);
  assert.equal(session.worldFlags.has('reliquary-lit'),false);
});
test('world-state scenic changes do not mutate authored layer data or gameplay collisions',()=>{
  const session=enterReliquary();
  const original=session.scene,variant=original.layers.find(l=>l.id===storyFor(session).variants[0].layerId);
  assert.ok(variant);
  assert.equal(storyScene(session).layers.find(l=>l.id===variant.id).opacity,0);
  session.worldFlags.add('reliquary-lit');
  assert.equal(storyScene(session).layers.find(l=>l.id===variant.id).opacity,variant.opacity);
  assert.equal(original.layers.find(l=>l.id===variant.id).opacity,variant.opacity);
  assert.strictEqual(storyScene(session).playable,original.playable);
});
test('encounter guardian sleeps until the authored zone is entered, then fights normally',()=>{
  const session=enterReliquary();
  const guardian=session.game.enemies.find(e=>e.id==='hall-wraith');
  assert.equal(guardian.dormant,true);
  // While dormant, direct overlap with its hitbox cannot damage the hero.
  session.game.player.x=guardian.x;session.game.player.y=guardian.y;
  session.game.player.grounded=true;session.game.player.invulnerable=0;
  stepPuzzle(session.game);
  assert.equal(session.game.health,3);
  // Encounter starts only after the session controller evaluates its zone.
  const result=stepWorldSession(session);
  assert.equal(result.travelled,false);
  assert.equal(guardian.dormant,false);
  assert.equal(session.game.storySeen.has('hall-guardian'),true);
  assert.match(session.notice,/GUARDIAN/);
  assert.equal(session.storyVersion,1);
  stepWorldSession(session);
  assert.equal(session.storyVersion,1); // exactly-once encounter receipt
});
test('save/restore remembers spoken choices and awakened guardians across backtracking',()=>{
  const root=rootWorld(),s=createWorldSession(root),store=storage();
  s.game.keyCollected=true;assert.equal(moveToDoor(s).travelled,true);
  s.game.player.x=485;s.game.player.y=458;
  assert.equal(stepWorldSession(s,{interactPressed:true}).storyOpen,true);
  chooseDialogue(s,'restore');
  s.game.player.x=950;s.game.player.y=458;
  stepWorldSession(s);
  assert.equal(s.game.storySeen.has('hall-guardian'),true);
  s.game.player.x=260;s.game.player.y=458;
  const saved=writeSaveSlot(store,root,s,2);
  assert.ok(saved.worldFlags.includes('reliquary-lit'));
  assert.deepEqual(saved.snapshots.reliquary.storySeen.sort(),['hall-guardian','keeper-choice']);
  const restored=readSaveSlot(store,root,2);
  assert.equal(restored.roomId,'reliquary');
  assert.equal(restored.worldFlags.has('reliquary-lit'),true);
  assert.equal(restored.game.storySeen.has('keeper-choice'),true);
  assert.equal(restored.game.storySeen.has('hall-guardian'),true);
  assert.equal(restored.game.enemies.find(e=>e.id==='hall-wraith').dormant,false);
  assert.equal(moveToDoor(restored).travelled,true);
  assert.equal(moveToDoor(restored).travelled,true);
  assert.equal(restored.game.storySeen.has('keeper-choice'),true);
});
test('save restoration discards invented story receipts and unregistered world flags',()=>{
  const root=rootWorld(),s=enterReliquary(),record=captureSave(root,s,1);
  record.snapshots.reliquary.storySeen=['keeper-choice','phantom-event','hall-guardian'];
  record.worldFlags=['reliquary-lit','hijacked-superpower'];
  const restored=restoreSave(root,record);
  assert.deepEqual([...restored.game.storySeen].sort(),['hall-guardian','keeper-choice']);
  assert.deepEqual([...restored.worldFlags],['reliquary-lit']);
  assert.equal(restored.game.enemies.find(e=>e.id==='hall-wraith').dormant,false);
});
test('malicious or malformed story metadata is tightly bounded and never executed',()=>{
  assert.throws(()=>normalizeStory({schema:'other'}),/Invalid PixelForge/);
  assert.equal(normalizeStory(null),null);
  const raw={schema:STORY_SCHEMA,dialogues:Array.from({length:40},(_,i)=>({
    id:'talk'+i,speaker:'S'.repeat(200),text:'T'.repeat(9000),
    x:1e12,y:-1e12,w:99999,h:-9,once:true,
    choices:Array.from({length:6},(_,j)=>({id:'choice'+j,
      label:'L'.repeat(900),setFlag:'javascript:alert(1)'})),
    code:'throw new Error("never execute")'
  })),encounters:Array.from({length:50},(_,i)=>({
    id:'e'+i,enemyId:'missing',requiresFlag:'window.x=1'
  })),variants:Array.from({length:50},(_,i)=>({
    id:'v'+i,layerId:'unknown',whenFlag:'invalid flag',
    mode:'execute-code'
  }))};
  const story=normalizeStory(raw);
  assert.equal(story.dialogues.length,12);
  assert.equal(story.dialogues[0].choices.length,3);
  assert.equal(story.dialogues[0].speaker.length,60);
  assert.equal(story.dialogues[0].text.length,300);
  assert.equal(story.dialogues[0].w,900);
  assert.equal(story.dialogues[0].h,12);
  assert.equal(story.dialogues[0].choices[0].setFlag,'');
  assert.equal('code' in story.dialogues[0],false);
  assert.equal(story.encounters.length,12);
  assert.equal(story.variants.length,24);
  assert.equal(story.variants[0].mode,'reveal');
  assert.deepEqual(normalizeStory({schema:STORY_SCHEMA}),{
    schema:STORY_SCHEMA,dialogues:[],encounters:[],variants:[]
  });
});
test('missing story or unlinked enemy cannot falsely trigger a story event',()=>{
  const legacy=createWorldSession(createScene());
  assert.equal(storyFor(legacy),null);
  assert.equal(nearbyDialogue(legacy),null);
  assert.equal(stepStoryEvents(legacy,{interactPressed:true}).storyOpen,false);
  assert.equal('storySeen' in legacy.game,false);
  const root=rootWorld();
  root.atlas.rooms[1].story.encounters[0].enemyId='unregistered';
  const session=createWorldSession(root);
  session.game.keyCollected=true;assert.equal(moveToDoor(session).travelled,true);
  session.game.player.x=950;session.game.player.y=458;
  stepWorldSession(session);
  assert.equal(session.game.storySeen.has('hall-guardian'),false);
});
test('existing Studio and Play controls expose live story editor and choice UI',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const play=readFileSync(new URL('../layer-studio/play.js',import.meta.url),'utf8');
  const ids=['storyDialogue','storySpeaker','storyText','storyX','storyY','storyW','storyH',
    'storyRequiresFlag','storyOnce','storyChoiceA','storyChoiceAFlag','storyChoiceB',
    'storyChoiceBFlag','addStoryDialogue','removeStoryDialogue',
    'storyEncounter','storyEncounterEnemy','storyEncounterFlag',
    'storyEncounterMessage','storyEncounterX','storyEncounterY',
    'storyEncounterW','storyEncounterH','addStoryEncounter','removeStoryEncounter',
    'storyVariant','storyVariantLayer','storyVariantFlag','storyVariantMode',
    'storyPreviewFlag','storyShowGuides','addStoryVariant','removeStoryVariant'];
  for(const id of ids)assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(studio,/syncStoryControls/);
  assert.match(studio,/storyScene/);
  assert.match(play,/chooseDialogue/);
  assert.match(play,/storyOpen/);
  assert.match(play,/storyScene/);
});
