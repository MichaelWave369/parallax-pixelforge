// PixelForge Layer Studio / Rung 7: declarative quests and global world flags.
// All quest evaluation is derived from already-earned state: no custom code or remote actions.
import {storyFlags} from './living-story.js';
import {bossFlags} from './boss-stage.js';
export const QUEST_SCHEMA='pixelforge.layer-quests.v1';
export const OBJECTIVE_KINDS=['relic','visit','flag'];
const safe=(v,fallback,max=96)=>typeof v==='string'&&v.trim()?v.trim().slice(0,max):fallback;
const id=(v,fallback)=>typeof v==='string'&&/^[a-z0-9][a-z0-9:_-]{0,63}$/.test(v)?v:fallback;
const unique=(items,prefix)=>{
  const seen=new Set();
  return items.map((value,i)=>{
    const item={...value};
    let candidate=item.id||prefix+'-'+i;
    if(seen.has(candidate))candidate=prefix+'-'+i;
    let n=1;while(seen.has(candidate))candidate=prefix+'-'+i+'-'+(n++);
    item.id=candidate;seen.add(candidate);return item;
  });
};
export function knownWorldFlags(atlas){
  if(!atlas)return [];
  const out=new Set();
  for(const room of atlas.rooms||[])
    for(const trigger of room.scene?.playable?.director?.triggers||[])
      if(trigger.kind==='flag'&&id(trigger.flagId,'')!=='')out.add(trigger.flagId);
  for(const storyFlag of storyFlags(atlas))out.add(storyFlag);
  for(const defeatedFlag of bossFlags(atlas))out.add(defeatedFlag);
  return [...out];
}
export function normalizeQuestLine(source){
  // Invalid or missing quest lists are empty; unknown objectives can never auto-complete.
  const raw=Array.isArray(source)?source.slice(0,12):[];
  return unique(raw.map((q,i)=>({
    id:id(q?.id,'quest-'+i),
    title:safe(q?.title,'Untitled quest',80),
    description:safe(q?.description,'Discover what this world remembers.',220),
    objectives:unique((Array.isArray(q?.objectives)?q.objectives:[]).slice(0,6)
      .map((o,j)=>({
        id:id(o?.id,'objective-'+j),
        kind:OBJECTIVE_KINDS.includes(o?.kind)?o.kind:'invalid',
        target:safe(o?.target,'',130),
        label:safe(o?.label,'Complete an objective',100)
      })),'objective')
  })),'quest');
}
export function evaluateQuestLine(atlas,session){
  if(!atlas)return [];
  const relics=new Set((atlas.rooms||[]).flatMap(r=>
    (r.relics||[]).map(relic=>r.id+':'+relic.id)));
  const rooms=new Set((atlas.rooms||[]).map(r=>r.id));
  const flags=new Set(knownWorldFlags(atlas));
  return (atlas.quests||[]).map(q=>{
    const objectives=q.objectives.map(o=>{
      const valid=o.kind==='relic'?relics.has(o.target):
        o.kind==='visit'?rooms.has(o.target):
        o.kind==='flag'?flags.has(o.target):false;
      const achieved=valid&&(o.kind==='relic'?session.inventory.has(o.target):
        o.kind==='visit'?session.visitedRooms.has(o.target):
        session.worldFlags.has(o.target));
      return {...o,done:Boolean(achieved)};
    });
    const done=objectives.length>0&&objectives.every(o=>o.done);
    return {id:q.id,title:q.title,description:q.description,objectives,
      done,completed:objectives.filter(o=>o.done).length,total:objectives.length};
  });
}
export function refreshQuestProgress(session,{silent=false}={}){
  if(!session.atlas)return [];
  const progress=evaluateQuestLine(session.atlas,session);
  if(!(session.completedQuests instanceof Set))session.completedQuests=new Set();
  for(const quest of progress){
    if(!quest.done||session.completedQuests.has(quest.id))continue;
    session.completedQuests.add(quest.id);
    if(!silent){
      session.notice='QUEST COMPLETE: '+quest.title.toUpperCase();
      session.noticeLeft=5;
      session.questVersion=(session.questVersion||0)+1;
    }
  }
  return progress;
}
export function consumeWorldEvents(session){
  const events=session.game.directorEvents||[];
  if(!session.atlas){events.length=0;return false;}
  const valid=new Set(knownWorldFlags(session.atlas));
  let changed=false;
  for(const event of events){
    if(event.kind!=='flag'||!valid.has(event.flagId)||
       session.worldFlags.has(event.flagId))continue;
    session.worldFlags.add(event.flagId);changed=true;
    session.notice='WORLD CHANGED: '+event.flagId.replace(/[-_:]/g,' ').toUpperCase();
    session.noticeLeft=4;
    session.flagVersion=(session.flagVersion||0)+1;
  }
  events.length=0;
  return changed;
}
