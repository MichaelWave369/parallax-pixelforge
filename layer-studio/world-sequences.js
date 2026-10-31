// PixelForge Rung 12 / World Sequence Tracks.
// Reusable, data-only discoveries outside boss fights. All progress is earned
// through interaction and completion; cinematic playback never changes physics.
import {normalizeCinematicCue} from './cinematic-director.js';

export const WORLD_SEQUENCE_SCHEMA='pixelforge.layer-world-sequences.v1';
const finite=(n,f,min,max)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):f;
const text=(v,f,max)=>typeof v==='string'?v.slice(0,max):f;
const id=(v,f)=>typeof v==='string'&&/^[a-z0-9][a-z0-9:_-]{0,63}$/.test(v)&&
  !/^(?:javascript|vbscript|data|file|https?):/i.test(v)?v:f;
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function normalizeWorldSequences(value){
  if(value==null)return null; // Additive opt-in, old rooms stay byte-identical.
  if(!value||typeof value!=='object'||Array.isArray(value)||value.schema!==WORLD_SEQUENCE_SCHEMA)
    throw Error('Invalid PixelForge World Sequence Tracks v1 payload.');
  const used=new Set();
  const tracks=(Array.isArray(value.tracks)?value.tracks:[]).slice(0,8).map((t,i)=>{
    let trackId=id(t?.id,'sequence-'+i);
    if(used.has(trackId))trackId='sequence-'+i;
    let n=1;while(used.has(trackId))trackId='sequence-'+i+'-'+n++;
    used.add(trackId);
    const beats=(Array.isArray(t?.beats)?t.beats:[]).slice(0,4).map((b,j)=>({
      title:text(b?.title,'BEAT '+(j+1),70),
      text:text(b?.text,'The world remembers.',220),
      seconds:finite(b?.seconds,2,.7,7),
      ...normalizeCinematicCue(b)
    }));
    return {
      id:trackId,title:text(t?.title,'Unknown discovery',80),
      x:finite(t?.x,500,0,6000),y:finite(t?.y,360,-200,900),
      w:finite(t?.w,130,16,800),h:finite(t?.h,130,16,800),
      requiresFlag:id(t?.requiresFlag,''),completionFlag:id(t?.completionFlag,''),
      once:t?.once!==false,beats
    };
  });
  return {schema:WORLD_SEQUENCE_SCHEMA,tracks};
}
export function worldSequenceFlags(atlas){
  return [...new Set((atlas?.rooms||[]).flatMap(room=>
    (room.sequences?.tracks||[]).map(t=>t.completionFlag).filter(Boolean)))];
}
export function tracksFor(session){
  return session.atlas?.rooms.find(r=>r.id===session.roomId)?.sequences?.tracks||[];
}
export function initializeSequenceRoom(session){
  if(!tracksFor(session).length)return;
  session.game.sequenceSeen??=new Set();
  session.activeWorldSequence=null;
}
export function nearbyWorldSequence(session){
  if(!session.atlas||session.game.status!=='playing')return null;
  return tracksFor(session).find(t=>t.beats.length&&
    (!t.requiresFlag||session.worldFlags.has(t.requiresFlag))&&
    (!t.once||!session.game.sequenceSeen?.has(t.id))&&
    overlap(session.game.player,t))||null;
}
export function tryOpenWorldSequence(session,input={}){
  if(!input.interactPressed||session.activeWorldSequence)return false;
  const track=nearbyWorldSequence(session);if(!track)return false;
  session.activeWorldSequence={roomId:session.roomId,id:track.id};
  return true;
}
export function activeWorldTrack(session){
  if(!session.activeWorldSequence||session.activeWorldSequence.roomId!==session.roomId)return null;
  return tracksFor(session).find(t=>t.id===session.activeWorldSequence.id)||null;
}
export function createWorldTimeline(session){
  const track=activeWorldTrack(session);
  if(!track||!track.beats.length)throw Error('No active world sequence.');
  return {kind:'world',beats:track.beats,index:0,elapsed:0,finished:false};
}
export function completeWorldSequence(session){
  const track=activeWorldTrack(session);
  if(!track)return null;
  session.game.sequenceSeen??=new Set();
  if(track.once)session.game.sequenceSeen.add(track.id);
  if(track.completionFlag)session.worldFlags.add(track.completionFlag);
  session.activeWorldSequence=null;
  session.sequenceVersion=(session.sequenceVersion||0)+1;
  session.notice='DISCOVERED: '+track.title.toUpperCase();
  session.noticeLeft=4;
  return {id:track.id,flag:track.completionFlag||null};
}
export function cancelWorldSequence(session){
  session.activeWorldSequence=null; // No completion flag or seen receipt.
}
export function renderSequenceGuides(ctx,room,cameraX=0){
  if(!room?.sequences?.tracks?.length)return;
  ctx.save();ctx.translate(-Math.round(cameraX),0);
  ctx.lineWidth=2;ctx.strokeStyle='#bba7ef';ctx.fillStyle='#d6c7f0';
  ctx.setLineDash([7,4]);ctx.font='11px ui-monospace,monospace';
  for(const t of room.sequences.tracks){
    ctx.strokeRect(t.x,t.y,t.w,t.h);ctx.fillText(t.title,t.x,t.y-8);
  }
  ctx.restore();
}
