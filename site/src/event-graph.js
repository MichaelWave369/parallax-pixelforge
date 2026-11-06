// Rung 7: bounded declarative dependency graph. No scripts, expressions or URLs.
// Directed edges are the validated requires.ids references, not executable actions.
export const EVENT_GRAPH_FORMAT='pixelforge.event-graph.v1';
export const MAX_GRAPH_NODES=12;
export const MAX_GRAPH_DOORS=8;
export const MAX_GRAPH_EDGES=8;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const validVec=a=>Array.isArray(a)&&a.length===3&&a.every(v=>finite(v)&&v>=-100&&v<=100);
const idPattern=/^(pickup|trigger|switch|secret)-[1-9][0-9]{0,3}$/;
const doorPattern=/^door-[1-9][0-9]{0,3}$/;
function strict(obj,keys){
  if(!plain(obj)||Object.keys(obj).some(k=>!keys.includes(k)))
    throw Error('Invalid or unsupported event graph field.');
}
function txt(v,max=180){
  if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Invalid event graph text.');
  return v;
}
function cond(c,ids,requireNonempty=false){
  strict(c,['mode','ids']);
  if(!['all','any'].includes(c.mode)||!Array.isArray(c.ids)||
      c.ids.length>MAX_GRAPH_EDGES||(requireNonempty&&!c.ids.length))
    throw Error('Invalid event graph dependency condition.');
  const used=new Set();
  for(const id of c.ids){
    if(typeof id!=='string'||!ids.has(id)||used.has(id))
      throw Error('Unknown or repeated event graph dependency.');
    used.add(id);
  }
  return {mode:c.mode,ids:[...c.ids]};
}
export function emptyCondition(){return {mode:'all',ids:[]};}
export function newEventGraph(){return {format:EVENT_GRAPH_FORMAT,nodes:[],doors:[],goalRequires:null};}
export function validateEventGraph(value,markerIds=[]){
  strict(value,['format','nodes','doors','goalRequires']);
  if(value.format!==EVENT_GRAPH_FORMAT)throw Error('Unsupported event graph version.');
  if(!Array.isArray(value.nodes)||value.nodes.length>MAX_GRAPH_NODES||
    !Array.isArray(value.doors)||value.doors.length>MAX_GRAPH_DOORS)
    throw Error('Event graph size limit exceeded.');
  const ids=new Set(markerIds),nodeIds=new Set(),doorIds=new Set(),targetIds=new Set();
  const nodes=value.nodes.map(n=>{
    strict(n,['id','kind','name','position','radius','message','requires']);
    if(!['switch','secret'].includes(n.kind)||typeof n.id!=='string'||
        !new RegExp('^'+n.kind+'-[1-9][0-9]{0,3}$').test(n.id)||
        ids.has(n.id)||nodeIds.has(n.id))throw Error('Invalid or duplicate event graph node.');
    nodeIds.add(n.id);
    if(!validVec(n.position)||!finite(n.radius)||n.radius<.3||n.radius>4)
      throw Error('Invalid event graph node position/radius.');
    return {id:n.id,kind:n.kind,name:txt(n.name,60),position:[...n.position],
      radius:n.radius,message:txt(n.message),requires:n.requires};
  });
  for(const id of nodeIds)ids.add(id);
  const checkedNodes=nodes.map(n=>({...n,requires:cond(n.requires,ids)}));
  const doors=value.doors.map(d=>{
    strict(d,['id','objectId','name','message','requires']);
    if(typeof d.id!=='string'||!doorPattern.test(d.id)||doorIds.has(d.id)||
      typeof d.objectId!=='string'||!(/^(obj-[1-9][0-9]{0,8}|placed-[1-9][0-9]{0,5})$/).test(d.objectId)||
      targetIds.has(d.objectId))throw Error('Invalid or duplicate event graph door/target.');
    doorIds.add(d.id);targetIds.add(d.objectId);
    return {id:d.id,objectId:d.objectId,name:txt(d.name,60),
      message:txt(d.message),requires:cond(d.requires,ids,true)};
  });
  const goalRequires=value.goalRequires===null?null:cond(value.goalRequires,ids,true);
  // Cycles are forbidden. A secret can depend on a switch, but neither can
  // mutually depend on the other, which would make both permanently unreachable.
  const map=new Map(checkedNodes.map(n=>[n.id,n]));
  const active=new Set(),done=new Set();
  function visit(id){
    if(active.has(id))throw Error('Cyclic event graph dependency.');
    if(done.has(id))return;
    active.add(id);
    for(const dep of map.get(id).requires.ids)if(map.has(dep))visit(dep);
    active.delete(id);done.add(id);
  }
  for(const id of map.keys())visit(id);
  return {format:EVENT_GRAPH_FORMAT,nodes:checkedNodes,doors,goalRequires};
}
export function validateEventGraphTargets(graph,objects){
  const ids=new Map(objects.map(o=>[o.id,o]));
  for(const door of graph.doors){
    const obj=ids.get(door.objectId);
    if(!obj||obj.body!=='fixed'||!['block','pillar','platform'].includes(obj.kind))
      throw Error('Event graph door must reference a fixed solid block, pillar or platform.');
  }
  return graph;
}
function next(records,prefix){
  const ids=new Set(records.map(n=>n.id));
  for(let i=1;i<=9999;i++){const id=prefix+'-'+i;if(!ids.has(id))return id;}
  throw Error('Event graph ID limit reached.');
}
export function addEventNode(graph,markers,kind,position,name){
  const g=validateEventGraph(graph,markers);
  if(!['switch','secret'].includes(kind))throw Error('Unsupported event node kind.');
  if(g.nodes.length>=MAX_GRAPH_NODES)throw Error('Event node capacity reached.');
  const id=next(g.nodes.filter(n=>n.kind===kind),kind);
  const item={id,kind,name:txt(name,60),position,radius:1.4,
    message:kind==='switch'?'Switch activated.':'Secret discovered.',requires:emptyCondition()};
  return validateEventGraph({...g,nodes:[...g.nodes,item]},markers);
}
export function addEventDoor(graph,markers,objectId,name,requireId){
  const g=validateEventGraph(graph,markers);
  if(g.doors.length>=MAX_GRAPH_DOORS)throw Error('Door capacity reached.');
  const door={id:next(g.doors,'door'),objectId,name:txt(name,60),message:'Door unlocked.',
    requires:{mode:'all',ids:[requireId]}};
  return validateEventGraph({...g,doors:[...g.doors,door]},markers);
}
export function updateEventNode(graph,markers,id,patch){
  const g=validateEventGraph(graph,markers);
  strict(patch,['name','position','radius','message','requires','goalRequires']);
  if(id==='goal'){
    if(Object.keys(patch).some(k=>k!=='goalRequires'))throw Error('Invalid goal graph edit.');
    return validateEventGraph({...g,goalRequires:patch.goalRequires},markers);
  }
  let touched=false;
  const nodes=g.nodes.map(n=>n.id===id?(touched=true,{...n,...patch}):n);
  const doors=g.doors.map(d=>d.id===id?(touched=true,{...d,...patch}):d);
  if(!touched)throw Error('Event graph node not found.');
  return validateEventGraph({...g,nodes,doors},markers);
}
export function removeEventNode(graph,markers,id){
  const g=validateEventGraph(graph,markers);
  if(!g.nodes.some(n=>n.id===id)&&!g.doors.some(d=>d.id===id))
    throw Error('Event graph node not found.');
  const prune=c=>c?{mode:c.mode,ids:c.ids.filter(x=>x!==id)}:null;
  // A dependent door with no prerequisites after pruning would be invalid
  // and therefore must be removed with its deleted key.
  const nodes=g.nodes.filter(n=>n.id!==id).map(n=>({...n,requires:prune(n.requires)}));
  const doors=g.doors.filter(d=>d.id!==id).map(d=>({...d,requires:prune(d.requires)}))
    .filter(d=>d.requires.ids.length>0);
  const goalRequires=prune(g.goalRequires);
  return validateEventGraph({...g,nodes,doors,
    goalRequires:goalRequires&&!goalRequires.ids.length?null:goalRequires},markers);
}
export function dependenciesMet(condition,active){
  if(!condition)return true;
  if(!condition.ids.length)return true;
  return condition.mode==='all'?condition.ids.every(id=>active.has(id)):
    condition.ids.some(id=>active.has(id));
}
const near=(player,m)=>Math.hypot(...player.map((v,i)=>v-m.position[i]))<=m.radius;
export function advanceEventGraph(graph,session,position,interact=false){
  const active=new Set([...session.collected,...session.triggered,...(session.activated||[])]);
  const newly=[],events=[];
  // Bounded fixed-point pass resolves authored DAGs even when the nodes appear
  // in reverse dependency order. No arbitrary evaluation or recursive actions.
  for(let i=0;i<graph.nodes.length;i++){
    let progress=false;
    for(const node of graph.nodes){
      if(active.has(node.id)||!dependenciesMet(node.requires,active)||!near(position,node)||
        (node.kind==='switch'&&!interact))continue;
      active.add(node.id);newly.push(node.id);progress=true;
      events.push({type:node.kind,id:node.id,text:node.message});
    }
    if(!progress)break;
  }
  const open=new Set(session.openedDoors||[]);
  for(const door of graph.doors){
    if(!open.has(door.id)&&dependenciesMet(door.requires,active)){
      open.add(door.id);events.push({type:'door',id:door.id,text:door.message});
    }
  }
  return {activated:[...(session.activated||[]),...newly],
    openedDoors:[...open],active,events};
}
