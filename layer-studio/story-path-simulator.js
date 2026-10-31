// PixelForge Rung 15 / Story Path Simulator
// A read-only, local, hypothetical planning sandbox for Rungs 4–14.
// Never calls game runtime, writes saves, edits atlas objects, or grants real flags.
const key=(room,id)=>room+':'+id;
const copy=s=>({
  roomId:s.roomId,flags:[...s.flags],seen:[...s.seen],
  sources:[...s.sources],visited:[...s.visited],assumeGates:s.assumeGates
});
const includes=(values,item)=>values.includes(item);
const roomFor=(atlas,id)=>atlas?.rooms?.find(r=>r.id===id)||null;
const valid=(atlas,state)=>Boolean(roomFor(atlas,state?.roomId));

export function createStoryPathRun(atlas){
  const start=roomFor(atlas,atlas?.startRoom)||atlas?.rooms?.[0];
  return {roomId:start?.id||null,flags:[],seen:[],sources:[],
    visited:start?[start.id]:[],assumeGates:false,history:[]};
}
function sourceActions(room,state){
  const actions=[];
  for(const t of room.scene?.playable?.director?.triggers||[]){
    if(t.kind!=='flag'||!t.flagId||includes(state.flags,t.flagId))continue;
    const token=key(room.id,'trigger:'+t.id);
    if(t.once!==false&&includes(state.sources,token))continue;
    actions.push({id:'trigger:'+t.id,kind:'trigger',
      label:'Assume trigger: '+t.id,flag:t.flagId,ready:true,token});
  }
  for(const dialogue of room.story?.dialogues||[]){
    const token=key(room.id,'dialogue:'+dialogue.id);
    if(dialogue.once!==false&&includes(state.sources,token))continue;
    const ready=!dialogue.requiresFlag||includes(state.flags,dialogue.requiresFlag);
    for(const choice of dialogue.choices||[]){
      if(!choice.setFlag||includes(state.flags,choice.setFlag))continue;
      actions.push({id:'dialogue:'+dialogue.id+':'+choice.id,kind:'dialogue',
        label:'Assume '+dialogue.speaker+': '+choice.label,flag:choice.setFlag,
        ready,reason:ready?'':'Needs '+dialogue.requiresFlag,token});
    }
  }
  if(room.boss?.victoryFlag&&!includes(state.flags,room.boss.victoryFlag)){
    const token=key(room.id,'boss:'+room.boss.id);
    if(!includes(state.sources,token))actions.push({
      id:'boss:'+room.boss.id,kind:'boss',
      label:'Assume boss defeated: '+room.boss.name,
      flag:room.boss.victoryFlag,ready:true,token
    });
  }
  return actions;
}
export function storyPathOptions(atlas,state){
  if(!valid(atlas,state))return {room:null,tracks:[],portals:[],sources:[],
    earnedFlags:[],historyLength:0};
  const room=roomFor(atlas,state.roomId);
  const tracks=(room.sequences?.tracks||[]).map(t=>{
    const reasons=[];
    if(!t.beats?.length)reasons.push('No cinematic beats authored');
    if(t.requiresFlag&&!includes(state.flags,t.requiresFlag))
      reasons.push('Requires '+t.requiresFlag);
    if(t.unlessFlag&&includes(state.flags,t.unlessFlag))
      reasons.push('Blocked by '+t.unlessFlag);
    if(t.once&&includes(state.seen,key(room.id,t.id)))
      reasons.push('Already completed');
    return {id:t.id,title:t.title,choices:t.choices||[],ready:reasons.length===0,
      reasons,completed:includes(state.seen,key(room.id,t.id)),
      completionFlag:t.completionFlag||''};
  });
  const portals=(room.portals||[]).map(p=>{
    const reasons=[],target=roomFor(atlas,p.targetRoom);
    if(!target)reasons.push('No linked destination');
    if(p.requiresFlag&&!includes(state.flags,p.requiresFlag))
      reasons.push('Requires '+p.requiresFlag);
    const unresolved=[];
    if(p.requiresKey)unresolved.push('key');
    if(p.requiresRelic)unresolved.push('relic '+p.requiresRelic);
    if(p.requiresQuest)unresolved.push('quest '+p.requiresQuest);
    if(unresolved.length&&!state.assumeGates)
      reasons.push('Unverified '+unresolved.join(', '));
    return {id:p.id,label:p.label,targetRoom:p.targetRoom,
      destination:target?.title||'Unlinked',ready:reasons.length===0,
      reasons,unverified:unresolved};
  });
  return {room:{id:room.id,title:room.title},tracks,portals,
    sources:sourceActions(room,state),
    earnedFlags:[...state.flags],historyLength:state.history.length};
}

export function advanceStoryPath(atlas,state,action){
  if(!valid(atlas,state))return {ok:false,reason:'No valid Room Atlas or simulation room.',state};
  if(action?.type==='reset')
    return {ok:true,state:createStoryPathRun(atlas),label:'Simulation reset'};
  if(action?.type==='undo'){
    if(!state.history.length)return {ok:false,reason:'No step to undo.',state};
    const previous=state.history[state.history.length-1];
    return {ok:true,label:'Undid '+previous.label,state:{
      ...copy(previous.before),history:state.history.slice(0,-1)
    }};
  }
  if(state.history.length>=64)return {ok:false,reason:'64-step simulation limit; undo or reset.',state};
  const room=roomFor(atlas,state.roomId);
  const before=copy(state),next={...copy(state),history:state.history.slice()};
  let label='';
  if(action?.type==='assumeGates'){
    if(typeof action.value!=='boolean')return {ok:false,reason:'Invalid gate assumption.',state};
    if(next.assumeGates===action.value)return {ok:false,reason:'Assumption already set.',state};
    next.assumeGates=action.value;
    label=action.value?'Assume key/relic/quest checks passed':'Stop assuming other gate checks';
  }else if(action?.type==='travel'){
    const selected=storyPathOptions(atlas,state).portals
      .find(p=>p.id===action.portalId);
    if(!selected||!selected.ready)
      return {ok:false,reason:'Portal is locked, unlinked or not in the current room.',state};
    next.roomId=selected.targetRoom;
    if(!includes(next.visited,next.roomId))next.visited.push(next.roomId);
    label='Travel: '+room.title+' → '+selected.destination+
      (selected.unverified.length?' (non-flag checks assumed)':'');
  }else if(action?.type==='discover'){
    const track=room.sequences?.tracks?.find(t=>t.id===action.trackId);
    const available=storyPathOptions(atlas,state).tracks
      .find(t=>t.id===action.trackId);
    if(!track||!available?.ready)
      return {ok:false,reason:'Discovery is blocked or unavailable.',state};
    const choices=track.choices||[];
    const selected=choices.length?choices.find(c=>c.id===action.choiceId):null;
    if(choices.length&&!selected)
      return {ok:false,reason:'Choose an authored answer to finish this branch.',state};
    if(!choices.length&&action.choiceId!=null)
      return {ok:false,reason:'This discovery has no authored answer.',state};
    if(track.once)next.seen.push(key(room.id,track.id));
    if(track.completionFlag&&!includes(next.flags,track.completionFlag))
      next.flags.push(track.completionFlag);
    if(selected?.setFlag&&!includes(next.flags,selected.setFlag))
      next.flags.push(selected.setFlag);
    label='Discover: '+track.title+
      (selected?' / '+selected.label:'');
  }else if(action?.type==='source'){
    const event=sourceActions(room,state).find(e=>e.id===action.sourceId);
    if(!event?.ready)return {ok:false,reason:'Authored source unavailable or gated.',state};
    if(!includes(next.flags,event.flag))next.flags.push(event.flag);
    if(!includes(next.sources,event.token))next.sources.push(event.token);
    label=event.label;
  }else return {ok:false,reason:'Unknown simulator action.',state};
  // Keep a minimal replayable action receipt. Undo discards the action as well as
  // its state; these receipts exist only in memory until explicitly exported.
  const record=action.type==='assumeGates'?
    {type:'assumeGates',value:action.value}:action.type==='travel'?
    {type:'travel',portalId:action.portalId}:action.type==='source'?
    {type:'source',sourceId:action.sourceId}:{
      type:'discover',trackId:action.trackId,
      ...(action.choiceId!=null?{choiceId:action.choiceId}:{})
    };
  next.history.push({before,label,action:record});
  return {ok:true,state:next,label};
}
export function storyPathSummary(atlas,state){
  const rooms=atlas?.rooms||[];
  const all=rooms.flatMap(room=>(room.sequences?.tracks||[])
    .map(track=>({...track,roomId:room.id})));
  const current=storyPathOptions(atlas,state);
  const earned=new Set(state?.flags||[]);
  const finished=all.filter(t=>t.once&&includes(state.seen,key(t.roomId,t.id)));
  const paths=all.filter(t=>
    (!t.requiresFlag||earned.has(t.requiresFlag))&&
    (!t.unlessFlag||!earned.has(t.unlessFlag))&&
    (!t.once||!includes(state.seen,key(t.roomId,t.id)))&&
    t.beats?.length);
  return {room:current.room,flagCount:earned.size,completed:finished.length,
    totalTracks:all.length,currentAvailable:current.tracks.filter(t=>t.ready).length,
    currentlyEligible:paths.length,historyLength:state?.history?.length||0,
    visitedRooms:[...(state?.visited||[])],flags:[...(state?.flags||[])]};
}
