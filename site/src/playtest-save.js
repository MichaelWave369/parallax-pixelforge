// PixelForge v6 Rung 9: world-bound, data-only local playtest saves.
// These saves are editable user data, not anti-cheat proofs or signed recordings.
// No network, scripts, storage side effects or authoring-world mutation here.
import {validatePlayableWorld} from './playable-world.js';
import {advanceGameplaySession,newGameplaySession} from './gameplay-rules.js';

export const PLAYTEST_SAVE_FORMAT='pixelforge.playtest-save.v1';
export const PLAYTEST_SAVE_PREFIX='pixelforge.v6.playtest.v1.';
export const PLAYTEST_MAX_BYTES=64000;
export const PLAYTEST_MAX_FRAMES=80;
const SHA=/^[a-f0-9]{64}$/;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const pos=v=>Array.isArray(v)&&v.length===3&&v.every(n=>finite(n)&&n>=-100&&n<=100);
const eventId=/^(collect|trigger|switch|secret|door|win):(pickup|trigger|switch|secret|door|goal)-[1-9][0-9]{0,3}$/;
function exact(value,keys){
  if(!plain(value)||Object.keys(value).some(k=>!keys.includes(k))||
    keys.some(k=>!Object.hasOwn(value,k)))
    throw Error('Playtest save has unsupported or missing fields.');
}
function checkPosition(position){
  if(!pos(position))throw Error('Saved position must be three bounded finite numbers.');
  return [...position];
}
function checkDigest(hash){
  if(typeof hash!=='string'||!SHA.test(hash))throw Error('Invalid playable-world digest.');
  return hash;
}
function checkFrame(frame){
  exact(frame,['position','interact','event_ids']);
  const position=checkPosition(frame.position);
  if(typeof frame.interact!=='boolean'||!Array.isArray(frame.event_ids)||
    frame.event_ids.length<1||frame.event_ids.length>60||
    frame.event_ids.some(id=>typeof id!=='string'||!eventId.test(id)))
    throw Error('Invalid recorded gameplay event frame.');
  return {position,interact:frame.interact,event_ids:[...frame.event_ids]};
}
export function playtestStorageKey(worldDigest){
  return PLAYTEST_SAVE_PREFIX+checkDigest(worldDigest);
}
export async function digestPlayableWorld(world){
  // A source SHA in an imported JSON document is unverified metadata. The
  // actual validated world content, including geometry and all rules, is hashed.
  const normalized=validatePlayableWorld(world);
  if(!globalThis.crypto?.subtle)throw Error('Secure SHA-256 digest unavailable in this browser.');
  const bytes=new TextEncoder().encode(JSON.stringify(normalized));
  const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function appendPlaytestFrame(frames,position,interact,events){
  if(!Array.isArray(frames)||frames.length>=PLAYTEST_MAX_FRAMES)throw Error('Playtest event trace is full.');
  if(!Array.isArray(events)||!events.length)throw Error('Only gameplay events are recorded.');
  const event_ids=events.map(event=>{
    if(!plain(event)||typeof event.type!=='string'||typeof event.id!=='string')
      throw Error('Invalid event for playtest trace.');
    return event.type+':'+event.id;
  });
  return [...frames,checkFrame({position,interact,event_ids})];
}
function sameProgress(a,b){
  const keys=['collected','triggered','activated','openedDoors'];
  return keys.every(key=>Array.isArray(a[key])&&Array.isArray(b[key])&&
      a[key].length===b[key].length&&a[key].every((id,i)=>id===b[key][i]))
    &&a.won===b.won;
}
export function replayPlaytestTrace(world,frames){
  const manifest=validatePlayableWorld(world);
  if(!Array.isArray(frames)||frames.length>PLAYTEST_MAX_FRAMES)
    throw Error('Playtest trace has too many frames.');
  if(!manifest.gameplay&&frames.length)throw Error('Exploration-only world cannot contain gameplay events.');
  let progress=newGameplaySession();
  const timeline=[];
  for(const [index,raw] of frames.entries()){
    const frame=checkFrame(raw);
    if(progress.won)throw Error('Playtest trace continues after world completion.');
    const result=advanceGameplaySession(manifest.gameplay,progress,frame.position,{interact:frame.interact});
    const actual=result.events.map(e=>e.type+':'+e.id);
    if(actual.length!==frame.event_ids.length||
      actual.some((id,i)=>id!==frame.event_ids[i]))
      throw Error('Playtest event trace cannot be reproduced for this world.');
    progress=result.session;
    timeline.push({index,position:[...frame.position],interact:frame.interact,
      events:result.events.map(e=>({...e})),progress:{
        collected:[...progress.collected],triggered:[...progress.triggered],
        activated:[...progress.activated],openedDoors:[...progress.openedDoors],
        won:progress.won
      }});
  }
  return {progress,timeline};
}
export function createPlaytestSave(world,worldDigest,position,frames,savedAt=Date.now()){
  checkDigest(worldDigest);
  const current=checkPosition(position);
  const {progress}=replayPlaytestTrace(world,frames);
  return validatePlaytestSave({
    format:PLAYTEST_SAVE_FORMAT,world_sha256:worldDigest,saved_at:savedAt,
    position:current,progress,frames
  },world,worldDigest);
}
export function validatePlaytestSave(value,world,worldDigest){
  exact(value,['format','world_sha256','saved_at','position','progress','frames']);
  if(value.format!==PLAYTEST_SAVE_FORMAT)throw Error('Unsupported playtest save format.');
  if(value.world_sha256!==checkDigest(worldDigest))
    throw Error('Save belongs to a different playable world or revision.');
  if(!Number.isSafeInteger(value.saved_at)||value.saved_at<0)
    throw Error('Invalid playtest save timestamp.');
  const position=checkPosition(value.position);
  if(!Array.isArray(value.frames)||value.frames.length>PLAYTEST_MAX_FRAMES)
    throw Error('Playtest event trace limit exceeded.');
  const frames=value.frames.map(checkFrame);
  const result=replayPlaytestTrace(world,frames);
  exact(value.progress,['collected','triggered','activated','openedDoors','won']);
  if(!sameProgress(value.progress,result.progress))
    throw Error('Saved objective state does not match its replayable event trace.');
  return {format:PLAYTEST_SAVE_FORMAT,world_sha256:worldDigest,
    saved_at:value.saved_at,position,progress:result.progress,frames};
}
export function parsePlaytestSave(raw,world,worldDigest){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>PLAYTEST_MAX_BYTES)
    throw Error('Save file exceeds 64 KB limit.');
  return validatePlaytestSave(JSON.parse(raw),world,worldDigest);
}
export function listPlaytestCheckpoints(world,frames){
  const {timeline}=replayPlaytestTrace(world,frames);
  const names=new Map((world.gameplay?.triggers||[]).map(x=>[x.id,x.name]));
  return timeline.flatMap(frame=>frame.events
    .filter(event=>event.type==='trigger')
    .map(event=>({
      id:event.id,name:names.get(event.id)||event.id,
      frameIndex:frame.index,position:[...frame.position]
    })));
}
export function playtestCheckpointAt(world,frames,frameIndex){
  if(!Number.isSafeInteger(frameIndex)||frameIndex<0)
    throw Error('Select an activated checkpoint in this run.');
  const {timeline}=replayPlaytestTrace(world,frames);
  const step=timeline[frameIndex];
  const trigger=step?.events.find(event=>event.type==='trigger');
  if(!trigger)throw Error('Selected event is not an activated checkpoint.');
  return {
    id:trigger.id,
    frameIndex:step.index,
    position:[...step.position],
    frames:frames.slice(0,step.index+1).map(checkFrame),
    progress:step.progress
  };
}
export function lastPlaytestCheckpoint(world,frames){
  const all=listPlaytestCheckpoints(world,frames);
  return all.length?playtestCheckpointAt(world,frames,all[all.length-1].frameIndex):null;
}
