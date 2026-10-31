// PixelForge Rung 17 / Playtest Scenario Catalog.
// Reusable hypothetical route receipts, distinct from real Adventure Journal saves.
// Pure data only; the browser editor owns localStorage and file download interactions.
import {
  ROUTE_REPORT_SCHEMA,createRouteReport,verifyRouteReport,routeWorldFingerprint
} from './story-path-reports.js';
import {createStoryPathRun,advanceStoryPath,storyPathOptions} from './story-path-simulator.js';

export const SCENARIO_CATALOG_SCHEMA='pixelforge.layer-scenario-catalog.v1';
export const SCENARIO_CATALOG_KEY='pixelforge.layer-scenario-catalog.v1.local';
export const MAX_SCENARIOS=16;
export const MAX_CATALOG_BYTES=900000;
const validObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const limitName=v=>typeof v==='string'?v.trim().slice(0,80):'';
const limitNotes=v=>typeof v==='string'?v.slice(0,240):'';
export function createScenarioCatalog(){
  return {schema:SCENARIO_CATALOG_SCHEMA,scenarios:[]};
}
export function validateScenarioCatalog(source){
  if(!validObject(source)||source.schema!==SCENARIO_CATALOG_SCHEMA||
     !Array.isArray(source.scenarios)||source.scenarios.length>MAX_SCENARIOS)
    throw Error('Unsupported or oversized scenario catalog.');
  // Reject oversize JSON before doing any repeated graph or replay work.
  const serialized=JSON.stringify(source);
  if(!serialized||serialized.length>MAX_CATALOG_BYTES)
    throw Error('Scenario catalog exceeds its 900 KB limit.');
  const ids=new Set(),scenarios=[];
  for(const entry of source.scenarios){
    if(!validObject(entry)||typeof entry.id!=='string'||
       !/^scenario-[1-9]\d{0,7}$/.test(entry.id)||ids.has(entry.id)||
       typeof entry.name!=='string'||!entry.name.trim()||entry.name.length>80||
       typeof entry.notes!=='string'||entry.notes.length>240)
      throw Error('Invalid or duplicate scenario ID, name or notes.');
    const report=entry.report;
    if(!validObject(report)||report.schema!==ROUTE_REPORT_SCHEMA||
       report.reportType!=='hypothetical-story-path'||!validObject(report.world)||
       typeof report.world.fingerprint!=='string'||
       !/^fnv1a32:[a-f0-9]{8}$/.test(report.world.fingerprint)||
       !Array.isArray(report.steps)||report.steps.length>64||
       !validObject(report.final)||!Array.isArray(report.final.flags))
      throw Error('Invalid scenario route report.');
    ids.add(entry.id);
    // Copy data so callers cannot mutate the existing catalog via an alias.
    scenarios.push({id:entry.id,name:entry.name,
      notes:entry.notes,report:JSON.parse(JSON.stringify(report))});
  }
  return {schema:SCENARIO_CATALOG_SCHEMA,scenarios};
}
const nextId=items=>{
  const ids=new Set(items.map(e=>e.id));
  let n=1;while(ids.has('scenario-'+n))n++;
  return 'scenario-'+n;
};
export function addScenario(catalog,atlas,run,{name='',notes=''}={}){
  const current=validateScenarioCatalog(catalog);
  if(current.scenarios.length>=MAX_SCENARIOS)
    throw Error('Catalog is full (16 scenarios). Remove or export an older entry.');
  const report=createRouteReport(atlas,run);
  const cleanName=limitName(name);
  if(!cleanName)throw Error('Give the playtest scenario a name.');
  const entry={id:nextId(current.scenarios),name:cleanName,
    notes:limitNotes(notes),report};
  return validateScenarioCatalog({...current,scenarios:[...current.scenarios,entry]});
}
export function removeScenario(catalog,id){
  const current=validateScenarioCatalog(catalog);
  if(!current.scenarios.some(s=>s.id===id))
    throw Error('Scenario not found.');
  return {...current,scenarios:current.scenarios.filter(s=>s.id!==id)};
}
export function renameScenario(catalog,id,{name,notes}){
  const current=validateScenarioCatalog(catalog);
  const newName=limitName(name);
  if(!newName)throw Error('Scenario name cannot be empty.');
  if(!current.scenarios.some(s=>s.id===id))
    throw Error('Scenario not found.');
  return {...current,scenarios:current.scenarios.map(s=>s.id!==id?s:
    {...s,name:newName,notes:limitNotes(notes)})};
}
export function mergeScenarioCatalog(catalog,incoming){
  const current=validateScenarioCatalog(catalog);
  const added=validateScenarioCatalog(incoming);
  const scenarios=[...current.scenarios];
  let imported=0,skipped=0;
  for(const item of added.scenarios){
    if(scenarios.some(s=>s.name===item.name&&equal(s.report,item.report))){
      skipped++;continue;
    }
    if(scenarios.length>=MAX_SCENARIOS){
      throw Error('Import exceeds 16 scenarios. Export or remove entries first.');
    }
    scenarios.push({...item,id:nextId(scenarios)});
    imported++;
  }
  return {catalog:validateScenarioCatalog({...current,scenarios}),imported,skipped};
}
function replayCurrent(atlas,report){
  if(!atlas?.rooms?.length)return {ok:false,code:'no-world',
    reason:'Load a Room Atlas first.'};
  let state=createStoryPathRun(atlas);
  for(const [i,step] of (report.steps||[]).entries()){
    const action=step?.action;
    if(!validObject(action)||!['discover','source','travel','assumeGates'].includes(action.type))
      return {ok:false,code:'invalid-action',step:i+1,
        reason:'Step '+(i+1)+' is not a supported hypothetical action.'};
    const result=advanceStoryPath(atlas,state,action);
    if(!result.ok)return {ok:false,code:'blocked',step:i+1,
      reason:'Step '+(i+1)+' cannot replay: '+result.reason};
    state=result.state;
  }
  return {ok:true,state};
}
function sameOutcome(a,b){
  if(!validObject(a)||!validObject(b))return false;
  return a.roomId===b.roomId&&a.assumeGates===b.assumeGates&&
    ['flags','seen','sources','visited'].every(k=>equal(a[k],b[k]));
}
export function reviewScenario(atlas,entry){
  if(!validObject(entry)||!validObject(entry.report))
    return {status:'invalid',message:'Scenario is not a recognized route report.'};
  const report=entry.report;
  if(!atlas?.rooms?.length)return {status:'no-world',message:'Load a Room Atlas first.'};
  const sameTopology=report.world?.fingerprint===routeWorldFingerprint(atlas);
  if(sameTopology){
    const checked=verifyRouteReport(atlas,report);
    return checked.ok?
      {status:'verified',message:'Route verified against this world.',
        run:checked.state,stepCount:report.steps.length,
        flags:[...checked.state.flags]}:
      {status:'invalid',message:'Stored route is inconsistent: '+checked.message};
  }
  const attempted=replayCurrent(atlas,report);
  if(!attempted.ok)return {status:'blocked',message:
    'Changed world; '+attempted.reason,
    ...(attempted.step?{firstBlockedStep:attempted.step}:{})};
  if(!sameOutcome(report.final,attempted.state)){
    return {status:'outcome-changed',
      message:'World changed, and the same actions now produce different progress. Retest this route.',
      expectedFlags:[...(report.final?.flags||[])],
      actualFlags:[...attempted.state.flags],run:attempted.state};
  }
  // A successful replay after a world change is never auto-verified. Other
  // authored paths/geometry may differ and require a human regression check.
  const opts=storyPathOptions(atlas,attempted.state);
  const expectedBlocks=report.blockers||[];
  const currentBlocks=[
    ...opts.tracks.filter(t=>!t.ready).map(t=>({
      kind:'discovery',id:t.id,label:t.title,reasons:t.reasons})),
    ...opts.portals.filter(p=>!p.ready).map(p=>({
      kind:'portal',id:p.id,label:p.label,reasons:p.reasons}))
  ];
  return {status:'needs-review',message:equal(expectedBlocks,currentBlocks)?
    'Story topology changed. Actions and final flags still replay, but physical gameplay needs retesting.':
    'Story topology and available/blocked options changed. Retest before accepting this route.',
    blockersChanged:!equal(expectedBlocks,currentBlocks),
    run:attempted.state};
}
export function reviewScenarioCatalog(atlas,catalog){
  const current=validateScenarioCatalog(catalog);
  const entries=current.scenarios.map(entry=>({
    id:entry.id,name:entry.name,notes:entry.notes,
    report:entry.report,review:reviewScenario(atlas,entry)
  }));
  const counts={verified:0,'needs-review':0,'outcome-changed':0,
    blocked:0,invalid:0,'no-world':0};
  for(const item of entries)counts[item.review.status]++;
  return {entries,counts,total:entries.length};
}
export function loadVerifiedScenario(atlas,entry){
  const result=reviewScenario(atlas,entry);
  if(result.status!=='verified')
    throw Error('Only verified scenarios can load into the preview. '+result.message);
  return result.run;
}
