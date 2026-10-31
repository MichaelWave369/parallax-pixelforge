// Rung 08 / Living Story Events: safe dialogue choices, authored encounters,
// and world-flag-driven visual layers. Data-only, local-only, deterministic.
export const STORY_SCHEMA='pixelforge.layer-story.v1';
const bounded=(n,fallback,min,max)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):fallback;
const safe=(v,def,max=100)=>typeof v==='string'?v.slice(0,max):def;
const flag=(v)=>typeof v==='string'&&/^[a-z0-9][a-z0-9:_-]{0,63}$/.test(v)?v:'';
const tag=(v,def)=>flag(v)||def;
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const unique=(list,prefix)=>{const seen=new Set();return list.map((v,i)=>{
  let id=tag(v.id,prefix+'-'+i);if(seen.has(id))id=prefix+'-'+i;
  let n=1;while(seen.has(id))id=prefix+'-'+i+'-'+n++;
  seen.add(id);return {...v,id};
});};
const zone=(v,i,prefix)=>({
  id:tag(v?.id,prefix+'-'+i),x:bounded(v?.x,250,0,6000),
  y:bounded(v?.y,390,-200,800),w:bounded(v?.w,110,12,900),
  h:bounded(v?.h,120,12,900)
});
export function normalizeStory(source){
  if(source==null)return null; // Do not change pre-Rung-8 room payloads.
  if(!source||typeof source!=='object'||Array.isArray(source)||source.schema!==STORY_SCHEMA)
    throw new Error('Invalid PixelForge Living Story v1 data.');
  const dialogues=unique((Array.isArray(source.dialogues)?source.dialogues:[]).slice(0,12).map((d,i)=>({
    ...zone(d,i,'dialogue'),
    speaker:safe(d?.speaker,'ARCHIVIST',60),text:safe(d?.text,'A forgotten voice speaks.',300),
    requiresFlag:flag(d?.requiresFlag),once:d?.once!==false,
    choices:unique((Array.isArray(d?.choices)?d.choices:[]).slice(0,3).map((c,j)=>({
      id:tag(c?.id,'choice-'+j),label:safe(c?.label,'Continue',90),
      setFlag:flag(c?.setFlag)
    })),'choice')
  })),'dialogue');
  const encounters=unique((Array.isArray(source.encounters)?source.encounters:[]).slice(0,12).map((e,i)=>({
    ...zone(e,i,'encounter'),enemyId:safe(e?.enemyId,'',64),
    requiresFlag:flag(e?.requiresFlag),message:safe(e?.message,'A guardian awakens.',160)
  })),'encounter');
  const variants=unique((Array.isArray(source.variants)?source.variants:[]).slice(0,24).map((v,i)=>({
    id:tag(v?.id,'variant-'+i),
    layerId:safe(v?.layerId,'',64),whenFlag:flag(v?.whenFlag),
    mode:v?.mode==='conceal'?'conceal':'reveal'
  })),'variant');
  return {schema:STORY_SCHEMA,dialogues,encounters,variants};
}
export function storyFlags(atlas){
  const found=new Set();
  for(const room of atlas?.rooms||[]){
    for(const dialogue of room.story?.dialogues||[])
      for(const choice of dialogue.choices||[])if(choice.setFlag)found.add(choice.setFlag);
  }
  return [...found];
}
export function storyFor(session){
  return session.atlas?.rooms.find(r=>r.id===session.roomId)?.story||null;
}
export function nearbyDialogue(session){
  const story=storyFor(session);if(!story)return null;
  return story.dialogues.find(d=>
    (!d.once||!session.game.storySeen?.has(d.id))&&
    (!d.requiresFlag||session.worldFlags.has(d.requiresFlag))&&
    overlaps(session.game.player,d))||null;
}
export function initializeStoryRoom(session){
  const story=storyFor(session);
  session.dialogue=null;
  if(!story)return; // No new state or save shape for legacy rooms.
  const seen=session.game.storySeen??new Set();
  session.game.storySeen=seen;
  for(const e of session.game.enemies){
    e.dormant=Boolean(story?.encounters?.some(enc=>enc.enemyId===e.id&&!seen.has(enc.id)));
  }
}
export function stepStoryEvents(session,input={}){
  const story=storyFor(session);
  if(!story||session.game.status!=='playing')return {storyOpen:false};
  const seen=session.game.storySeen??(session.game.storySeen=new Set());
  for(const enc of story.encounters){
    if(seen.has(enc.id)||(enc.requiresFlag&&!session.worldFlags.has(enc.requiresFlag)))continue;
    if(!overlaps(session.game.player,enc))continue;
    const enemy=session.game.enemies.find(e=>e.id===enc.enemyId);
    // Broken enemy links do not silently mark an encounter as completed.
    if(!enemy)continue;
    enemy.dormant=false;
    seen.add(enc.id);
    session.notice=enc.message;
    session.noticeLeft=4;
    session.storyVersion=(session.storyVersion||0)+1;
  }
  if(session.dialogue)return {storyOpen:true};
  if(!input.interactPressed)return {storyOpen:false};
  const target=nearbyDialogue(session);
  if(!target)return {storyOpen:false};
  session.dialogue={id:target.id,roomId:session.roomId};
  return {storyOpen:true};
}
export function chooseDialogue(session,choiceId){
  const pending=session.dialogue,story=storyFor(session);
  if(!pending||pending.roomId!==session.roomId)throw Error('No active conversation here.');
  const dialogue=story?.dialogues.find(d=>d.id===pending.id);
  const choices=dialogue?.choices.length?dialogue.choices:[{id:'continue',label:'Continue',setFlag:''}];
  const choice=choices.find(c=>c.id===choiceId);
  if(!choice)throw Error('This dialogue choice does not exist.');
  if(dialogue.once)session.game.storySeen.add(dialogue.id);
  // The flag can only be granted by selecting an authored choice.
  if(choice.setFlag)session.worldFlags.add(choice.setFlag);
  session.dialogue=null;
  session.notice=choice.setFlag?'YOUR CHOICE CHANGED THE WORLD.':'THE CONVERSATION ENDS.';
  session.noticeLeft=4;
  session.storyVersion=(session.storyVersion||0)+1;
  return {flag:choice.setFlag||null,dialogueId:dialogue.id};
}
export function storyScene(session){
  const scene=session.scene,story=storyFor(session);
  if(!story?.variants.length)return scene;
  const layers=scene.layers.map(layer=>{
    let hide=false;
    for(const v of story.variants){
      if(v.layerId!==layer.id||!v.whenFlag)continue;
      const present=session.worldFlags.has(v.whenFlag);
      if((v.mode==='reveal'&&!present)||(v.mode==='conceal'&&present))hide=true;
    }
    return hide?{...layer,opacity:0}:layer;
  });
  return {...scene,layers};
}
export function renderStoryGuides(ctx,story,cameraX=0){
  if(!story)return;
  ctx.save();ctx.translate(-Math.round(cameraX),0);
  for(const [zones,stroke] of [[story.dialogues,'#dfc99a'],[story.encounters,'#e77b9b']]){
    ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.setLineDash([6,4]);
    for(const z of zones){ctx.strokeRect(z.x,z.y,z.w,z.h);
      ctx.fillStyle=stroke;ctx.font='11px ui-monospace,monospace';ctx.fillText(z.id,z.x,z.y-6);}
  }
  ctx.restore();
}
