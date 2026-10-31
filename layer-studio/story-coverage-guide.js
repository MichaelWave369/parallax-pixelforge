// PixelForge Rung 19 / Coverage-Guided Scenario Builder.
// Bounded breadth-first search over the EXISTING Rung 15 simulator rules.
// Every suggested action must be individually confirmed by the author.
// This is hypothetical narrative reachability, not gameplay execution.
import {storyPathOptions,advanceStoryPath} from './story-path-simulator.js';
import {analyzeRouteCoverage} from './story-route-coverage.js';
import {createScenarioCatalog} from './story-scenario-catalog.js';

export const ROUTE_GUIDE_SCHEMA='pixelforge.layer-coverage-guide.v1';
export const ROUTE_GUIDE_MAX_STATES=1400;
export const ROUTE_GUIDE_MAX_DEPTH=16;
const encode=value=>encodeURIComponent(String(value));
const targetId=(kind,...values)=>kind+':'+values.map(encode).join(':');
const snapshot=state=>JSON.stringify({
  roomId:state?.roomId||null,flags:[...(state?.flags||[])].sort(),
  seen:[...(state?.seen||[])].sort(),sources:[...(state?.sources||[])].sort(),
  visited:[...(state?.visited||[])].sort(),assumeGates:state?.assumeGates===true,
  historyLength:state?.history?.length||0
});
export function guideStateFingerprint(state){return snapshot(state)}
function stateKey(state){return JSON.stringify({
  roomId:state.roomId,flags:[...state.flags].sort(),
  seen:[...state.seen].sort(),sources:[...state.sources].sort(),
  visited:[...state.visited].sort(),assumeGates:state.assumeGates
})}
function runContains(target,state){
  if(target.kind==='room')
    return (state.visited||[]).some(r=>targetId('room',r)===target.id);
  if(target.kind==='flag')
    return (state.flags||[]).some(flag=>targetId('flag',flag)===target.id);
  for(const entry of state.history||[]){
    const a=entry.action,room=entry.before?.roomId;
    if(!a||!room)continue;
    if(target.kind==='discovery'&&a.type==='discover'&&
       targetId('discovery',room,a.trackId)===target.id)return true;
    if(target.kind==='choice'&&a.type==='discover'&&a.choiceId&&
       targetId('choice',room,a.trackId,a.choiceId)===target.id)return true;
    if(target.kind==='portal'&&a.type==='travel'&&
       targetId('portal',room,a.portalId)===target.id)return true;
    if(target.kind==='source'&&a.type==='source'&&
       targetId('source',room,a.sourceId)===target.id)return true;
  }
  return false;
}
function candidates(atlas,state){
  const options=storyPathOptions(atlas,state),moves=[];
  // Ordering only breaks ties between equal-length valid hypothetical paths.
  // Never insert a flag, inventory item or room directly into a run.
  for(const track of options.tracks){
    if(!track.ready)continue;
    if(track.choices.length){
      for(const choice of track.choices)moves.push({
        type:'discover',trackId:track.id,choiceId:choice.id
      });
    }else moves.push({type:'discover',trackId:track.id});
  }
  for(const portal of options.portals)if(portal.ready)
    moves.push({type:'travel',portalId:portal.id});
  for(const source of options.sources)if(source.ready)
    moves.push({type:'source',sourceId:source.id});
  if(!state.assumeGates&&options.portals.some(p=>
      p.reasons.some(reason=>reason.startsWith('Unverified '))))
    moves.push({type:'assumeGates',value:true});
  return moves;
}
function isAssumption(before,action,options){
  if(action.type==='assumeGates'||action.type==='source')return true;
  if(action.type!=='travel')return false;
  return Boolean(options.portals.find(p=>p.id===action.portalId)
    ?.unverified?.length);
}
function result(status,target,steps,explored,message,{truncated=false}={}){
  return {schema:ROUTE_GUIDE_SCHEMA,status,targetId:target?.id||null,
    targetLabel:target?.label||'',targetKind:target?.kind||null,
    steps,explored,truncated,assumptions:steps.filter(s=>s.assumed).length,
    message,warning:'Narrative simulation only. Source events and non-flag gate checks are assumptions, not tested gameplay.'};
}
export function planCoverageRoute(atlas,state,target,{coverage,maxStates=ROUTE_GUIDE_MAX_STATES,
  maxDepth=ROUTE_GUIDE_MAX_DEPTH}={}){
  if(!atlas?.rooms?.length||!state?.roomId)
    return result('no-atlas',null,[],0,'Load a Room Atlas and start a simulator run.');
  const report=coverage||analyzeRouteCoverage(atlas,createScenarioCatalog());
  const row=report.rows?.find(r=>r.id===target);
  if(!row)return result('invalid-target',null,[],0,
    'The chosen coverage target no longer exists in the authored world.');
  if(runContains(row,state))return result('already-covered',row,[],0,
    'This target has already been exercised in the current hypothetical run.');
  const statesBound=Math.max(1,Math.min(ROUTE_GUIDE_MAX_STATES,
    Number.isFinite(maxStates)?Math.floor(maxStates):ROUTE_GUIDE_MAX_STATES));
  const depthBound=Math.max(0,Math.min(ROUTE_GUIDE_MAX_DEPTH,
    Number.isFinite(maxDepth)?Math.floor(maxDepth):ROUTE_GUIDE_MAX_DEPTH,
    Math.max(0,64-(state.history?.length||0))));
  const queue=[{state,steps:[]}],visited=new Set([stateKey(state)]);
  let explored=0,cutoff=false;
  for(let i=0;i<queue.length&&explored<statesBound;i++){
    const current=queue[i];explored++;
    if(current.steps.length>=depthBound){cutoff=true;continue;}
    const options=storyPathOptions(atlas,current.state);
    for(const action of candidates(atlas,current.state)){
      const next=advanceStoryPath(atlas,current.state,action);
      if(!next.ok)continue; // One existing simulator owns action legality.
      const step={action,label:next.label,fromRoom:current.state.roomId,
        toRoom:next.state.roomId,assumed:isAssumption(current.state,action,options)};
      const steps=[...current.steps,step];
      if(runContains(row,next.state))return result('found',row,steps,
        explored,'Found a '+steps.length+'-step hypothetical route. Apply each step explicitly.');
      const key=stateKey(next.state);
      if(!visited.has(key)){
        visited.add(key);queue.push({state:next.state,steps});
      }
      if(visited.size>statesBound*3){cutoff=true;break;}
    }
    if(visited.size>statesBound*3)break;
  }
  const bounded=cutoff||explored>=statesBound;
  return result(bounded?'search-limited':'no-route',row,[],explored,
    bounded?'No route found within the bounded search. This does NOT prove the story path impossible. Reset the simulator to explore another fork, or try a different target.':
    'No valid hypothetical route found from this simulator state. An earlier exclusive choice may require resetting the preview; real-world geometry is not analyzed.',
    {truncated:bounded});
}
export function guidedCoverageTargets(report,{includeReviewed=true}={}){
  if(!report?.rows)return [];
  const rank={choice:0,discovery:1,portal:2,flag:3,room:4,source:5};
  return report.rows.filter(r=>r.status==='uncovered'||
    (includeReviewed&&r.status==='needs-review'))
    .sort((a,b)=>(rank[a.kind]??9)-(rank[b.kind]??9)||
      (a.status===b.status?0:a.status==='uncovered'?-1:1)||
      (a.roomId||'').localeCompare(b.roomId||'')||
      a.label.localeCompare(b.label));
}
