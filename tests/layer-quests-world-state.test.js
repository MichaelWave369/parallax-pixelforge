import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {
  createWorldSession,makeStarterAtlas,stepWorldSession
} from '../layer-studio/room-atlas.js';
import {normalizeDirector} from '../layer-studio/world-director.js';
import {
  OBJECTIVE_KINDS,knownWorldFlags,normalizeQuestLine,evaluateQuestLine,
  refreshQuestProgress,consumeWorldEvents
} from '../layer-studio/quest-world.js';
import {
  captureSave,restoreSave,writeSaveSlot,readSaveSlot
} from '../layer-studio/adventure-journal.js';

const world=()=>{
  const scene=createScene();scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene);
};
const store=()=>{
  const map=new Map();
  return {getItem:key=>map.get(key)??null,setItem:(key,val)=>map.set(key,String(val)),
    removeItem:key=>map.delete(key)};
};
function entrance(session){
  const portal=session.atlas.rooms.find(room=>room.id===session.roomId).portals[0];
  session.game.player.x=portal.x+3;
  session.game.player.y=portal.y+portal.h-42;
  session.game.player.grounded=true;
  return stepWorldSession(session,{interactPressed:true});
}
function awaken(session){
  session.game.player.x=243;session.game.player.y=458;
  session.game.player.grounded=true;
  stepWorldSession(session);
}
test('starter quest requires a relic, visiting Reliquary and a real World Director flag',()=>{
  const root=world(),session=createWorldSession(root);
  assert.deepEqual(knownWorldFlags(root.atlas),['reliquary-awakened']);
  assert.equal(root.atlas.quests.length,1);
  assert.equal(root.atlas.quests[0].objectives.length,3);
  assert.deepEqual(root.atlas.quests[0].objectives.map(o=>o.kind),['relic','visit','flag']);
  assert.equal(session.completedQuests.size,0);
  assert.equal(evaluateQuestLine(root.atlas,session)[0].completed,0);
});
test('quest advances in world-space events; unlocked flags and quest completion remain across backtracking',()=>{
  const session=createWorldSession(world());
  session.game.player.x=312;session.game.player.y=335;
  stepWorldSession(session);
  assert.equal(session.inventory.has('lantern-vault:lantern-shard'),true);
  assert.equal(evaluateQuestLine(session.atlas,session)[0].completed,1);
  session.game.keyCollected=true;
  assert.equal(entrance(session).travelled,true);
  assert.equal(evaluateQuestLine(session.atlas,session)[0].completed,2);
  awaken(session);
  assert.equal(session.worldFlags.has('reliquary-awakened'),true);
  assert.equal(session.completedQuests.has('oath-of-the-reliquary'),true);
  assert.equal(session.questVersion,1);
  assert.equal(evaluateQuestLine(session.atlas,session)[0].completed,3);
  assert.equal(evaluateQuestLine(session.atlas,session)[0].done,true);
  awaken(session);
  assert.equal(session.flagVersion,1);
  assert.equal(session.questVersion,1);
  assert.equal(entrance(session).travelled,true);
  assert.equal(session.worldFlags.has('reliquary-awakened'),true);
  assert.equal(session.completedQuests.has('oath-of-the-reliquary'),true);
});
test('authored doors fail closed on missing flags and quests then unlock after legitimate progress',()=>{
  const root=world();
  const portal=root.atlas.rooms[0].portals[0];
  portal.requiresFlag='reliquary-awakened';
  portal.requiresQuest='oath-of-the-reliquary';
  // This demo door is intentionally impossible until the player has visited the other room.
  const session=createWorldSession(root);
  session.game.keyCollected=true;
  assert.equal(entrance(session).denied,'flag');
  session.worldFlags.add('reliquary-awakened');
  assert.equal(entrance(session).denied,'quest');
  // The only way to satisfy the authored quest is to collect and visit / activate.
  session.inventory.add('lantern-vault:lantern-shard');
  session.visitedRooms.add('reliquary');
  refreshQuestProgress(session);
  assert.equal(session.completedQuests.has('oath-of-the-reliquary'),true);
  assert.equal(entrance(session).travelled,true);
});
test('unknown quest/flag conditions never unlock; invalid objectives cannot auto-complete',()=>{
  const root=world();
  root.atlas.rooms[0].portals[0].requiresQuest='nonexistent';
  const session=createWorldSession(root);
  session.game.keyCollected=true;
  assert.equal(entrance(session).denied,'quest');
  root.atlas.rooms[0].portals[0].requiresQuest='';
  root.atlas.rooms[0].portals[0].requiresFlag='never-emitted';
  assert.equal(entrance(session).denied,'flag');
  root.atlas.quests=normalizeQuestLine([{id:'wrong',title:'Bad objective',objectives:[
    {kind:'eval',target:'untrusted code',label:'Run script'},
    {kind:'flag',target:'nonexistent-flag',label:'Never emit'}
  ]}]);
  refreshQuestProgress(session);
  const q=evaluateQuestLine(root.atlas,session)[0];
  assert.equal(q.done,false);
  assert.equal(q.completed,0);
  assert.equal(q.objectives[0].kind,'invalid');
});
test('untrusted trigger flag IDs and quest text/limits are normalized as plain data',()=>{
  const source={schema:'pixelforge.layer-director.v1',ambient:0,triggers:[
    {id:'evil',kind:'flag',flagId:'window.location.href',message:'M'.repeat(500),x:0,y:0,w:100,h:100},
    {id:'real',kind:'flag',flagId:'vault-awake',x:0,y:0,w:100,h:100}
  ]};
  const director=normalizeDirector(source);
  assert.equal(director.triggers[0].flagId,'');
  assert.equal(director.triggers[0].message.length,180);
  assert.equal(director.triggers[1].flagId,'vault-awake');
  const quests=normalizeQuestLine(Array.from({length:30},(_,i)=>({
    id:'quest-'+i,title:'T'.repeat(200),description:'D'.repeat(500),
    objectives:Array.from({length:20},(_,j)=>({
      id:'objective-'+j,kind:'visit',target:'room',label:'L'.repeat(200)
    }))
  })));
  assert.deepEqual(OBJECTIVE_KINDS,['relic','visit','flag']);
  assert.equal(quests.length,12);assert.equal(quests[0].objectives.length,6);
  assert.equal(quests[0].title.length,80);
  assert.equal(quests[0].description.length,220);
  assert.equal(quests[0].objectives[0].label.length,100);
  assert.equal(normalizeQuestLine(null).length,0);
  assert.equal(evaluateQuestLine(null,createWorldSession(createScene())).length,0);
});
test('save slots persist known global flags and derive quest completion after loading',()=>{
  const root=world(),session=createWorldSession(root),storage=store();
  session.game.player.x=312;session.game.player.y=335;stepWorldSession(session);
  session.game.keyCollected=true;
  assert.equal(entrance(session).travelled,true);
  awaken(session);
  const saved=writeSaveSlot(storage,root,session,2);
  assert.deepEqual(saved.worldFlags,['reliquary-awakened']);
  const resumed=readSaveSlot(storage,root,2);
  assert.equal(resumed.roomId,'reliquary');
  assert.equal(resumed.worldFlags.has('reliquary-awakened'),true);
  assert.equal(resumed.completedQuests.has('oath-of-the-reliquary'),true);
  assert.equal(resumed.questVersion,0); // derived silently, without replaying reward notices
  assert.equal(entrance(resumed).travelled,true);
  assert.equal(resumed.completedQuests.size,1);
});
test('forged save flags are removed and cannot fabricate quest completion',()=>{
  const root=world(),session=createWorldSession(root);
  const data=captureSave(root,session,1);
  data.worldFlags=['nonexistent','window.alert(1)','reliquary-awakened'];
  data.completedQuests=['oath-of-the-reliquary'];
  const loaded=restoreSave(root,data);
  assert.deepEqual([...loaded.worldFlags],['reliquary-awakened']);
  assert.equal(loaded.completedQuests.size,0);
  data.worldFlags='not-an-array';
  const second=restoreSave(root,data);
  assert.equal(second.worldFlags.size,0);
});
test('legacy single-room gameplay and historical Room Atlas without quests remain valid',()=>{
  const single=createWorldSession(createScene());
  assert.equal(single.atlas,null);
  assert.equal(single.completedQuests.size,0);
  single.game.directorEvents=[{kind:'flag',flagId:'evil'}];
  assert.equal(consumeWorldEvents(single),false);
  assert.equal(single.game.directorEvents.length,0);
  const old=world();delete old.atlas.quests;
  const normalized=normalizeScene(old);
  assert.deepEqual(normalized.atlas.quests,[]);
  const restored=createWorldSession(normalized);
  assert.equal(restored.completedQuests.size,0);
});
test('quest editor, world director and play journal include live controls',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const playHtml=readFileSync(new URL('../layer-studio/play.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const player=readFileSync(new URL('../layer-studio/play.js',import.meta.url),'utf8');
  for(const name of ['questSelect','questTitle','questDescription','objectiveSelect',
    'objectiveKind','objectiveTarget','objectiveLabel','addQuest','removeQuest',
    'addObjective','removeObjective','portalRequiresFlag','portalRequiresQuest',
    'directorFlagId','addFlag'])assert.match(html,new RegExp('id="'+name+'"'));
  assert.match(playHtml,/id="questButton"/);
  assert.match(player,/evaluateQuestLine/);
  assert.match(player,/KeyQ/);
  assert.match(studio,/knownWorldFlags/);
  assert.match(studio,/syncQuestControls/);
});
