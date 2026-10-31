// PixelForge Rung 14 / World Branch Map.
// Pure, read-only analysis of authored Room Atlas dependencies. No mutation,
// scripts, network, or scene re-normalization. Results are advisory reachability
// checks, not a claim to solve physical navigation or every exclusive-choice run.
const nodeId=(kind,...parts)=>kind+':'+parts.map(x=>encodeURIComponent(String(x))).join(':');

export function analyzeWorldBranches(atlas){
  const empty={nodes:[],edges:[],diagnostics:[],summary:{
    rooms:0,sequences:0,flags:0,connections:0,warnings:0,errors:0,
    potentiallyReachable:0},reachability:{rooms:[],flags:[],tracks:[]}};
  if(!atlas?.rooms?.length)return empty;
  const rooms=atlas.rooms,roomIds=new Set(rooms.map(r=>r.id));
  const nodes=new Map(),edges=[],edgeKeys=new Set();
  const producers=new Map(),sequences=[],sourceFlags=[];
  const flagRefs=[];
  const pushNode=(entry)=>{if(!nodes.has(entry.id))nodes.set(entry.id,entry);return nodes.get(entry.id)};
  const addEdge=(from,to,kind,label='')=>{
    const k=from+'>'+to+'#'+kind+'#'+label;
    if(edgeKeys.has(k))return;
    edgeKeys.add(k);edges.push({from,to,kind,label});
  };
  const flag=(value)=>{
    if(!value)return null;
    return pushNode({id:nodeId('flag',value),kind:'flag',
      label:value,detail:'Persistent world flag',roomId:null});
  };
  const produced=(value,from,kind,label,roomId,required='')=>{
    if(!value)return;
    const f=flag(value);
    addEdge(from,f.id,kind,label);
    if(!producers.has(value))producers.set(value,[]);
    producers.get(value).push({from,roomId,required});
  };
  const consumed=(value,to,kind,label,roomId)=>{
    if(!value)return;
    const f=flag(value);
    addEdge(f.id,to,kind,label);
    flagRefs.push({flag:value,to,roomId,kind,label});
  };
  for(const room of rooms){
    for(const trigger of room.scene?.playable?.director?.triggers||[]){
      if(trigger.kind!=='flag'||!trigger.flagId)continue;
      const id=nodeId('source',room.id,'trigger',trigger.id);
      pushNode({id,kind:'source',label:trigger.id,
        detail:'World Director flag trigger',roomId:room.id});
      produced(trigger.flagId,id,'grant','world trigger',room.id);
      sourceFlags.push({flag:trigger.flagId,roomId:room.id,required:'',from:id});
    }
    for(const dialogue of room.story?.dialogues||[]){
      for(const choice of dialogue.choices||[]){
        if(!choice.setFlag)continue;
        const id=nodeId('source',room.id,'dialogue',dialogue.id,choice.id);
        pushNode({id,kind:'source',label:choice.label||choice.id,
          detail:'Story dialogue choice',roomId:room.id});
        produced(choice.setFlag,id,'choice',dialogue.speaker||'dialogue',room.id,
          dialogue.requiresFlag||'');
        sourceFlags.push({flag:choice.setFlag,roomId:room.id,from:id,
          required:dialogue.requiresFlag||''});
        if(dialogue.requiresFlag)
          consumed(dialogue.requiresFlag,id,'requires','dialogue prerequisite',room.id);
      }
    }
    if(room.boss?.victoryFlag){
      const id=nodeId('source',room.id,'boss',room.boss.id);
      pushNode({id,kind:'source',label:room.boss.name||room.boss.id,
        detail:'Boss defeat',roomId:room.id});
      produced(room.boss.victoryFlag,id,'grant','boss defeated',room.id);
      sourceFlags.push({flag:room.boss.victoryFlag,roomId:room.id,required:'',from:id});
    }
    for(const track of room.sequences?.tracks||[]){
      const id=nodeId('track',room.id,track.id);
      pushNode({id,kind:'track',label:track.title||track.id,
        detail:room.title+' / '+track.id,roomId:room.id,trackId:track.id});
      sequences.push({id,roomId:room.id,track});
      produced(track.completionFlag,id,'grant','complete',room.id);
      for(const choice of track.choices||[]){
        produced(choice.setFlag,id,'choice',choice.label||choice.id,room.id);
      }
      consumed(track.requiresFlag,id,'requires','needs flag',room.id);
      consumed(track.unlessFlag,id,'blocks','locked if flag',room.id);
    }
    for(const portal of room.portals||[]){
      if(!portal.requiresFlag)continue;
      const id=nodeId('gate',room.id,'portal',portal.id);
      pushNode({id,kind:'gate',label:portal.label||portal.id,
        detail:'Portal to '+(portal.targetRoom||'unlinked'),roomId:room.id});
      consumed(portal.requiresFlag,id,'requires','portal gate',room.id);
    }
  }
  for(const quest of atlas.quests||[]){
    for(const objective of quest.objectives||[]){
      if(objective.kind!=='flag'||!objective.target)continue;
      const id=nodeId('gate','quest',quest.id,objective.id);
      pushNode({id,kind:'gate',label:objective.label||objective.id,
        detail:'Quest: '+quest.title,roomId:null});
      consumed(objective.target,id,'requires','quest objective',null);
    }
  }
  const diagnostics=[],warnKeys=new Set();
  const warn=(code,severity,subject,description)=>{
    const key=code+'|'+subject;
    if(warnKeys.has(key))return;
    warnKeys.add(key);
    diagnostics.push({code,severity,subject,description});
  };
  for(const ref of flagRefs){
    if(producers.has(ref.flag))continue;
    if(ref.kind==='blocks'){
      warn('never-blocking-guard','warning',ref.to,
        'Exclusion flag "'+ref.flag+'" has no authored producer. This negative guard may never activate.');
    }else{
      warn('missing-producer','warning',ref.to,
        'Flag "'+ref.flag+'" has no authored producer. '+ref.label+
        ' may remain locked unless external state supplies it.');
    }
  }
  for(const {id,track} of sequences){
    if(track.requiresFlag&&track.requiresFlag===track.unlessFlag){
      warn('contradictory-guard','error',id,
        'This discovery both requires and forbids "'+track.requiresFlag+
        '". It cannot open under these conditions.');
    }
    if(track.requiresFlag&&track.requiresFlag===track.completionFlag&&
      (producers.get(track.requiresFlag)||[]).every(p=>p.from===id)){
      warn('self-dependency','error',id,
        'This discovery requires its own completion flag with no other producer.');
    }
  }
  // Optimistic fixed-point: a branch choice is *possible*, not simultaneously
  // earned with every other choice. The map must never claim all paths are
  // achievable in one playthrough.
  const reachableRooms=new Set([roomIds.has(atlas.startRoom)?
    atlas.startRoom:rooms[0].id]);
  const reachableFlags=new Set(),reachableTracks=new Set();
  const max=rooms.length*16+producers.size+16;
  for(let n=0;n<max;n++){
    const count=reachableRooms.size+reachableFlags.size+reachableTracks.size;
    for(const entry of sourceFlags){
      if(reachableRooms.has(entry.roomId)&&
        (!entry.required||reachableFlags.has(entry.required)))
        reachableFlags.add(entry.flag);
    }
    for(const entry of sequences){
      if(!reachableRooms.has(entry.roomId))continue;
      const t=entry.track;
      if(t.requiresFlag&&!reachableFlags.has(t.requiresFlag))continue;
      if(t.requiresFlag&&t.requiresFlag===t.unlessFlag)continue;
      reachableTracks.add(entry.id);
      if(t.completionFlag)reachableFlags.add(t.completionFlag);
      for(const choice of t.choices||[])if(choice.setFlag)
        reachableFlags.add(choice.setFlag);
    }
    for(const room of rooms){
      if(!reachableRooms.has(room.id))continue;
      for(const portal of room.portals||[]){
        if(!roomIds.has(portal.targetRoom))continue;
        if(portal.requiresFlag&&!reachableFlags.has(portal.requiresFlag))continue;
        reachableRooms.add(portal.targetRoom);
      }
    }
    if(reachableRooms.size+reachableFlags.size+reachableTracks.size===count)break;
  }
  for(const room of rooms){
    if(!reachableRooms.has(room.id)){
      warn('unreachable-room','warning',nodeId('room',room.id),
        'No optimistic portal path reaches "'+room.title+'". Check links and door flags.');
    }
  }
  for(const entry of sequences){
    if(reachableTracks.has(entry.id))continue;
    const t=entry.track;
    warn('unreachable-sequence','warning',entry.id,
      'No known path currently reaches "'+t.title+'". Check its room, required flag'+
      (t.unlessFlag?' and exclusion flag':'')+'.');
  }
  // Dependency cycles in authored *positive prerequisites* may deadlock.
  // Find strongly connected components without conflating negative guards.
  const producerTracks=new Map();
  for(const entry of sequences){
    const outputs=[entry.track.completionFlag,
      ...(entry.track.choices||[]).map(c=>c.setFlag)].filter(Boolean);
    for(const out of outputs){
      if(!producerTracks.has(out))producerTracks.set(out,new Set());
      producerTracks.get(out).add(entry.id);
    }
  }
  const neighbors=new Map(sequences.map(entry=>[entry.id,new Set(
    [...(producerTracks.get(entry.track.requiresFlag)||[])])]));
  let clock=0;const indexes=new Map(),low=new Map(),stack=[],onStack=new Set();
  const visit=(v)=>{
    indexes.set(v,clock);low.set(v,clock);clock++;
    stack.push(v);onStack.add(v);
    for(const w of neighbors.get(v)||[]){
      if(!indexes.has(w)){
        visit(w);low.set(v,Math.min(low.get(v),low.get(w)));
      }else if(onStack.has(w)){
        low.set(v,Math.min(low.get(v),indexes.get(w)));
      }
    }
    if(low.get(v)!==indexes.get(v))return;
    const component=[];let w;
    do{w=stack.pop();onStack.delete(w);component.push(w)}while(w!==v);
    if(component.length>1||(neighbors.get(v)||new Set()).has(v)){
      const labels=component.map(id=>nodes.get(id)?.label||id);
      warn('dependency-cycle','warning',component.slice().sort().join('|'),
        'Cyclic prerequisite chain: '+labels.join(' ↔ ')+
        '. It may deadlock without another independently reachable flag producer.');
    }
  };
  for(const entry of sequences)if(!indexes.has(entry.id))visit(entry.id);
  // A flag can appear optimistically reachable even if it belongs to one of
  // several exclusive choice branches. This is a diagnostic graph, not a solver.
  for(const node of nodes.values()){
    if(node.kind==='track')node.reachable=reachableTracks.has(node.id);
    else if(node.kind==='flag')node.reachable=reachableFlags.has(node.label);
    else if(node.kind==='source')node.reachable=sourceFlags.some(s=>
      s.from===node.id&&reachableRooms.has(s.roomId)&&
      (!s.required||reachableFlags.has(s.required)));
    else node.reachable=true;
  }
  diagnostics.sort((a,b)=>Number(b.severity==='error')-Number(a.severity==='error')||
    a.code.localeCompare(b.code)||a.subject.localeCompare(b.subject));
  const list=[...nodes.values()];
  return {nodes:list,edges,diagnostics,summary:{
    rooms:rooms.length,sequences:sequences.length,
    flags:list.filter(n=>n.kind==='flag').length,
    connections:edges.length,
    errors:diagnostics.filter(d=>d.severity==='error').length,
    warnings:diagnostics.filter(d=>d.severity==='warning').length,
    potentiallyReachable:reachableTracks.size
  },reachability:{rooms:[...reachableRooms],flags:[...reachableFlags],
    tracks:[...reachableTracks]}};
}
