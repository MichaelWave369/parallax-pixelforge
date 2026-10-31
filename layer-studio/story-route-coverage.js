// PixelForge Rung 18 / Route Coverage Matrix.
// A read-only, hypothetical coverage report across named Rung 17 scenarios.
// A "verified" cell means the Rung 16 narrative receipt replayed against the
// authored topology; it NEVER means real gameplay or physical route testing.
import {reviewScenarioCatalog} from './story-scenario-catalog.js';
import {analyzeWorldBranches} from './world-branch-map.js';

export const ROUTE_COVERAGE_SCHEMA='pixelforge.layer-route-coverage.v1';
export const COVERAGE_KINDS=[
  {id:'room',label:'Rooms'},
  {id:'discovery',label:'Discoveries'},
  {id:'choice',label:'Choice outcomes'},
  {id:'flag',label:'World flags'},
  {id:'portal',label:'Portal passages'},
  {id:'source',label:'Authored events'}
];
const token=value=>encodeURIComponent(String(value));
const id=(kind,...args)=>kind+':'+args.map(token).join(':');
const add=(rows,kind,key,label,roomId,detail,mapNodeId='')=>
  rows.push({id:key,kind,label,roomId:roomId||null,detail:detail||'',
    mapNodeId});
const authoredTargets=atlas=>{
  const rows=[];
  for(const room of atlas?.rooms||[]){
    const rk=id('room',room.id);
    add(rows,'room',rk,room.title,room.id,'Visited room');
    for(const track of room.sequences?.tracks||[]){
      const tk=id('discovery',room.id,track.id);
      const mapId=id('track',room.id,track.id);
      add(rows,'discovery',tk,track.title,room.id,
        'Discovery '+track.id,mapId);
      for(const choice of track.choices||[]){
        add(rows,'choice',id('choice',room.id,track.id,choice.id),
          choice.label,room.id,'In '+track.title+
          (choice.setFlag?' · '+choice.setFlag:''),
          mapId);
      }
    }
    for(const portal of room.portals||[]){
      add(rows,'portal',id('portal',room.id,portal.id),
        portal.label||portal.id,room.id,
        'To '+(atlas.rooms.find(r=>r.id===portal.targetRoom)?.title||'unlinked')+
        (portal.requiresFlag?' · needs '+portal.requiresFlag:'')+
        (portal.requiresKey?' · key gate':'')+
        (portal.requiresRelic?' · relic gate':'')+
        (portal.requiresQuest?' · quest gate':''),
        id('gate',room.id,'portal',portal.id));
    }
    for(const trigger of room.scene?.playable?.director?.triggers||[]){
      if(trigger.kind!=='flag'||!trigger.flagId)continue;
      add(rows,'source',id('source',room.id,'trigger:'+trigger.id),
        trigger.id,room.id,'Assume World Director flag '+trigger.flagId,
        id('source',room.id,'trigger',trigger.id));
    }
    for(const dialogue of room.story?.dialogues||[]){
      for(const choice of dialogue.choices||[]){
        if(!choice.setFlag)continue;
        const actionId='dialogue:'+dialogue.id+':'+choice.id;
        add(rows,'source',id('source',room.id,actionId),
          (dialogue.speaker||dialogue.id)+' / '+choice.label,room.id,
          'Assume dialogue choice '+choice.setFlag,
          id('source',room.id,'dialogue',dialogue.id,choice.id));
      }
    }
    if(room.boss?.victoryFlag){
      const actionId='boss:'+room.boss.id;
      add(rows,'source',id('source',room.id,actionId),
        room.boss.name||room.boss.id,room.id,
        'Assume boss victory '+room.boss.victoryFlag,
        id('source',room.id,'boss',room.boss.id));
    }
  }
  for(const node of analyzeWorldBranches(atlas).nodes){
    if(node.kind!=='flag')continue;
    add(rows,'flag',id('flag',node.label),node.label,null,
      'World flag earned from an authored hypothetical action',node.id);
  }
  // Uniqueness is required because scenario evidence uses row IDs as keys.
  const found=new Set();
  return rows.filter(row=>{
    if(found.has(row.id))return false;
    found.add(row.id);return true;
  });
};
function evidenceFor(entry,maxSteps){
  const result=new Map();
  const mark=(target,assumed=false)=>{
    const previous=result.get(target);
    result.set(target,{assumed:Boolean(assumed||previous?.assumed)});
  };
  const r=entry.report;
  if(!r?.world)return result;
  mark(id('room',r.world.startRoom));
  for(const step of (r.steps||[]).slice(0,maxSteps)){
    const action=step?.action;
    if(!action||typeof action.type!=='string')continue;
    if(action.type==='travel'){
      mark(id('room',step.fromRoom));
      mark(id('portal',step.fromRoom,action.portalId),
        Boolean(step.unverifiedGateChecks?.length));
      mark(id('room',step.toRoom));
    }else if(action.type==='discover'){
      mark(id('room',step.fromRoom));
      mark(id('discovery',step.fromRoom,action.trackId));
      if(typeof action.choiceId==='string')
        mark(id('choice',step.fromRoom,action.trackId,action.choiceId));
    }else if(action.type==='source'){
      mark(id('room',step.fromRoom));
      mark(id('source',step.fromRoom,action.sourceId),true);
    }
    for(const flag of step.gainedFlags||[]){
      if(typeof flag==='string')mark(id('flag',flag));
    }
  }
  return result;
}
export function analyzeRouteCoverage(atlas,catalog){
  const reviewed=reviewScenarioCatalog(atlas,catalog);
  const targets=authoredTargets(atlas);
  const scenarios=reviewed.entries.map(entry=>({
    id:entry.id,name:entry.name,status:entry.review.status,
    stepCount:entry.report.steps.length
  }));
  const evidence=reviewed.entries.map(entry=>{
    const reviewStatus=entry.review.status;
    // Never count stale, forged, blocked, or mismatched reports as verified.
    // For blocked reports, only show historical evidence BEFORE the first
    // failing step; later outcomes would not even replay in the changed world.
    if(['invalid','no-world'].includes(reviewStatus))return new Map();
    const max=reviewStatus==='blocked'&&entry.review.firstBlockedStep?
      Math.max(0,entry.review.firstBlockedStep-1):entry.report.steps.length;
    return evidenceFor(entry,max);
  });
  const rows=targets.map(target=>{
    const cells=scenarios.map((scenario,i)=>{
      const seen=evidence[i].get(target.id);
      return {scenarioId:scenario.id,status:!seen?'uncovered':
        scenario.status==='verified'?'verified':'needs-review',
        assumed:Boolean(seen?.assumed)};
    });
    const verifiedBy=cells.filter(c=>c.status==='verified').map(c=>c.scenarioId);
    const needsReviewBy=cells.filter(c=>c.status==='needs-review').map(c=>c.scenarioId);
    const status=verifiedBy.length?'verified':
      needsReviewBy.length?'needs-review':'uncovered';
    return {...target,status,cells,verifiedBy,needsReviewBy};
  });
  const dimensions=COVERAGE_KINDS.map(kind=>{
    const items=rows.filter(row=>row.kind===kind.id);
    return {kind:kind.id,label:kind.label,total:items.length,
      verified:items.filter(row=>row.status==='verified').length,
      needsReview:items.filter(row=>row.status==='needs-review').length,
      uncovered:items.filter(row=>row.status==='uncovered').length};
  });
  const verified=rows.filter(row=>row.status==='verified').length;
  const needsReview=rows.filter(row=>row.status==='needs-review').length;
  const uncovered=rows.length-verified-needsReview;
  return {
    schema:ROUTE_COVERAGE_SCHEMA,
    reportType:'hypothetical-story-route-coverage',
    warning:'VERIFIED means narrative receipt replay only; no physical gameplay, geometry, combat, or actual gate collection was tested.',
    scenarios,rows,dimensions,
    summary:{targets:rows.length,verified,needsReview,uncovered,
      coveragePercent:rows.length?Math.round(verified*1000/rows.length)/10:0,
      verifiedScenarios:scenarios.filter(s=>s.status==='verified').length,
      nonverifiedScenarios:scenarios.filter(s=>s.status!=='verified').length}
  };
}
export function filterRouteCoverage(report,{kind='all',status='all'}={}){
  if(!report||!Array.isArray(report.rows))return [];
  return report.rows.filter(row=>
    (kind==='all'||row.kind===kind)&&(status==='all'||row.status===status));
}
