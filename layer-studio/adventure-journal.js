// Rung 6 / Adventure Journal: three browser-local save slots for a fixed authored world.
// Explicit save/load only. No background persistence, network calls or executable data.
import {createWorldSession,availableRelicKeys,snapshotRoom,restoreRoom} from './room-atlas.js';
import {knownWorldFlags,refreshQuestProgress} from './quest-world.js';
import {initializeStoryRoom} from './living-story.js';
export const SAVE_SCHEMA='pixelforge.layer-save.v1';
export const SLOT_COUNT=3;
const clamp=(value,fallback,min,max)=>{
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
};
const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
function validSlot(slot){
  const n=Number(slot);
  if(!Number.isInteger(n)||n<1||n>SLOT_COUNT)throw Error('Choose save slot 1, 2, or 3.');
  return n;
}
// Lightweight identity marker. Detects changed authoring data, NOT a security signature.
export function worldFingerprint(rootScene){
  // Preserve Rung 6 save-slot fingerprints for pre-quest worlds. The new empty
  // editor defaults are non-behavioral, so omit them from the canonical hash.
  const source=JSON.stringify(rootScene,(key,value)=>{
    if((key==='flagId'||key==='requiresFlag'||key==='requiresQuest')&&value==='')return undefined;
    if(key==='quests'&&Array.isArray(value)&&value.length===0)return undefined;
    return value;
  });
  let hash=2166136261;
  for(let i=0;i<source.length;i++){
    hash^=source.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0).toString(16).padStart(8,'0')+'-'+source.length;
}
export function slotStorageKey(rootScene,slot){
  return 'pixelforge.layer-save.v1.'+worldFingerprint(rootScene)+'.'+validSlot(slot);
}
function validIds(rootScene){
  return new Set(rootScene.atlas?.rooms.map(r=>r.id)||['single']);
}
function roomScene(rootScene,id){
  return rootScene.atlas?rootScene.atlas.rooms.find(r=>r.id===id)?.scene:rootScene;
}
function limitProgress(rootScene,id,data){
  const scene=roomScene(rootScene,id);
  if(!scene||!isObject(data))return null;
  const puzzle=scene.playable;
  const story=rootScene.atlas?.rooms.find(r=>r.id===id)?.story;
  const authoredStoryIds=new Set([...(story?.dialogues||[]),...(story?.encounters||[])].map(x=>x.id));
  const enemyIds=new Set(puzzle.enemies.map(e=>e.id));
  const triggerIds=new Set(puzzle.director?.triggers.map(t=>t.id)||[]);
  const checkpointIds=new Set((puzzle.director?.triggers||[]).filter(t=>t.kind==='checkpoint').map(t=>t.id));
  const point=isObject(data.checkpoint)?data.checkpoint:null;
  return {
    keyCollected:data.keyCollected===true,
    stones:(Array.isArray(data.stones)?data.stones:[]).filter(v=>typeof v==='string'&&enemyIds.has(v)).slice(0,32),
    seen:(Array.isArray(data.seen)?data.seen:[]).filter(v=>typeof v==='string'&&triggerIds.has(v)).slice(0,32),
    ...(story?{storySeen:(Array.isArray(data.storySeen)?data.storySeen:[])
      .filter(v=>typeof v==='string'&&authoredStoryIds.has(v)).slice(0,24)}:{}),
    checkpoint:point&&typeof point.id==='string'&&checkpointIds.has(point.id)?{
      id:point.id,x:clamp(point.x,puzzle.spawn.x,0,puzzle.worldWidth-28),
      y:clamp(point.y,puzzle.spawn.y,-200,750)
    }:null
  };
}
export function captureSave(rootScene,session,slot,now=Date.now()){
  const n=validSlot(slot);
  const rooms=validIds(rootScene);
  const roomId=session.atlas?session.roomId:'single';
  if(!rooms.has(roomId))throw Error('Current room does not belong to the open adventure.');
  const all={...session.snapshots,[roomId]:snapshotRoom(session.game)};
  const snapshots={};
  for(const id of rooms){
    const safe=limitProgress(rootScene,id,all[id]);
    if(safe)snapshots[id]=safe;
  }
  const allowedRelics=new Set(availableRelicKeys(rootScene.atlas));
  const visited=[...(session.visitedRooms||[])].filter(id=>rooms.has(id));
  const p=session.game.player;
  const date=clamp(now,Date.now(),0,4102444800000);
  return {
    schema:SAVE_SCHEMA,slot:n,fingerprint:worldFingerprint(rootScene),timestamp:date,
    roomId,worldTitle:String(rootScene.title||'Adventure').slice(0,80),
    status:session.game.status==='won'?'won':'playing',
    health:clamp(session.game.health,3,1,3),deaths:clamp(session.game.deaths,0,0,100000),
    transitions:clamp(session.transitions,0,0,100000),
    visited,inventory:[...(session.inventory||[])].filter(k=>allowedRelics.has(k)),
    worldFlags:[...(session.worldFlags||[])].filter(f=>knownWorldFlags(rootScene.atlas).includes(f)), 
    snapshots,player:{x:clamp(p.x,0,0,session.game.puzzle.worldWidth-p.w),
      y:clamp(p.y,458,-200,750)}
  };
}
export function restoreSave(rootScene,data){
  if(!isObject(data)||data.schema!==SAVE_SCHEMA)throw Error('Unsupported save format.');
  if(data.fingerprint!==worldFingerprint(rootScene))
    throw Error('This save belongs to a different version of the adventure.');
  validSlot(data.slot);
  const ids=validIds(rootScene);
  if(!ids.has(data.roomId))throw Error('Save room is missing from this adventure.');
  const session=createWorldSession(rootScene);
  const safe={};
  for(const id of ids){
    const progress=limitProgress(rootScene,id,data.snapshots?.[id]);
    if(progress)safe[id]=progress;
  }
  session.snapshots=safe;
  session.inventory=new Set((Array.isArray(data.inventory)?data.inventory:[])
    .filter(id=>typeof id==='string'&&availableRelicKeys(rootScene.atlas).includes(id)));
  session.visitedRooms=new Set((Array.isArray(data.visited)?data.visited:[])
    .filter(id=>ids.has(id)));
  const allowedFlags=new Set(knownWorldFlags(rootScene.atlas));
  session.worldFlags=new Set((Array.isArray(data.worldFlags)?data.worldFlags:[])
    .filter(f=>typeof f==='string'&&allowedFlags.has(f)));
  if(session.atlas){
    const target=session.atlas.rooms.find(r=>r.id===data.roomId);
    session.roomId=target.id;session.scene=target.scene;
  }
  session.game=createWorldSession(session.scene).game;
  session.game.worldTravel=Boolean(session.atlas);
  restoreRoom(session.game,safe[data.roomId]);
  initializeStoryRoom(session); // Reactivate only encounters earned in this room.
  session.game.health=clamp(data.health,3,1,3);
  session.game.deaths=clamp(data.deaths,0,0,100000);
  session.game.status=!session.atlas&&data.status==='won'?'won':'playing';
  session.transitions=clamp(data.transitions,0,0,100000);
  session.visitedRooms.add(data.roomId);
  // Completed quests are always derived, never trusted as writable save claims.
  refreshQuestProgress(session,{silent:true});
  session.game.player.x=clamp(data.player?.x,session.game.puzzle.spawn.x,0,
    session.game.puzzle.worldWidth-session.game.player.w);
  session.game.player.y=clamp(data.player?.y,session.game.puzzle.spawn.y,-200,750);
  session.game.player.vx=0;session.game.player.vy=0;
  session.game.player.grounded=false;session.game.player.invulnerable=1;
  session.notice='JOURNAL RESTORED.';
  session.noticeLeft=4;
  return session;
}
export function writeSaveSlot(storage,rootScene,session,slot){
  const record=captureSave(rootScene,session,slot);
  const data=JSON.stringify(record);
  if(data.length>200_000)throw Error('Save progress is too large for a local slot.');
  storage.setItem(slotStorageKey(rootScene,slot),data);
  return record;
}
export function readSaveSlot(storage,rootScene,slot){
  const raw=storage.getItem(slotStorageKey(rootScene,slot));
  if(raw==null)return null;
  if(raw.length>200_000)throw Error('Save slot exceeds the permitted size.');
  let data;
  try{data=JSON.parse(raw);}
  catch{throw Error('Save slot is corrupt.');}
  return restoreSave(rootScene,data);
}
export function inspectSaveSlot(storage,rootScene,slot){
  const raw=storage.getItem(slotStorageKey(rootScene,slot));
  if(raw==null)return null;
  try{
    const data=JSON.parse(raw);
    if(data?.schema!==SAVE_SCHEMA||data?.fingerprint!==worldFingerprint(rootScene))
      throw Error('Invalid save metadata');
    const ids=validIds(rootScene);
    if(!ids.has(data.roomId))throw Error('Unknown saved room');
    return {slot:validSlot(slot),roomId:data.roomId,
      when:clamp(data.timestamp,0,0,4102444800000),
      relics:Array.isArray(data.inventory)?data.inventory.length:0};
  }catch{return {slot:validSlot(slot),corrupt:true};}
}
export function deleteSaveSlot(storage,rootScene,slot){
  storage.removeItem(slotStorageKey(rootScene,slot));
}
