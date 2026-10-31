// PixelForge Rung 21 / Authoring Test Missions.
// Local author-controlled release checklists over Rung 18 narrative targets.
// Scenario receipts are NOT real gameplay tests. Physical outcomes are explicit
// unverified author reports, tied to a current full-world change detector.
import {routeWorldFingerprint} from './story-path-reports.js';

export const TEST_MISSIONS_SCHEMA='pixelforge.layer-test-missions.v1';
export const TEST_MISSIONS_KEY='pixelforge.layer-test-missions.v1.local';
export const MAX_TEST_MISSIONS=8;
export const MAX_MISSION_GOALS=16;
export const MAX_TEST_MISSIONS_BYTES=160000;
const PHYSICAL_STATUSES=['not-run','passed','failed','blocked'];
const TARGET_KINDS=['room','discovery','choice','flag','portal','source'];
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const clone=value=>JSON.parse(JSON.stringify(value));
const idRegex=(prefix)=>new RegExp('^'+prefix+'-[1-9]\\d{0,7}$');
const clean=(value,size)=>typeof value==='string'?value.trim().slice(0,size):'';
const note=(value,size)=>typeof value==='string'?value.slice(0,size):'';
const freshPhysical=()=>({status:'not-run',notes:'',confirmed:false,worldFingerprint:null});
const nextId=(items,prefix)=>{
  const existing=new Set(items.map(x=>x.id));let i=1;
  while(existing.has(prefix+'-'+i))i++;
  return prefix+'-'+i;
};
export function fullTestWorldFingerprint(atlas){
  if(!atlas?.rooms?.length)return null;
  // Includes artwork/physics/level geometry unlike the narrative-only checksum.
  // Noncryptographic change detector, NOT a gameplay build signature.
  const serialized=JSON.stringify(atlas);
  if(!serialized)return null;
  let hash=2166136261;
  for(let i=0;i<serialized.length;i++){
    hash^=serialized.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return 'fnv1a32:'+((hash>>>0).toString(16).padStart(8,'0'));
}
export function createTestMissionBook(){
  return {schema:TEST_MISSIONS_SCHEMA,missions:[]};
}
export function validateTestMissionBook(book){
  if(!object(book)||book.schema!==TEST_MISSIONS_SCHEMA||
     !Array.isArray(book.missions)||book.missions.length>MAX_TEST_MISSIONS)
    throw Error('Invalid or oversized PixelForge test mission book.');
  const data=JSON.stringify(book);
  if(!data||data.length>MAX_TEST_MISSIONS_BYTES)
    throw Error('Test mission book exceeds 160 KB.');
  const missionIds=new Set();
  const missions=book.missions.map(mission=>{
    if(!object(mission)||typeof mission.id!=='string'||
       !idRegex('mission').test(mission.id)||missionIds.has(mission.id)||
       typeof mission.name!=='string'||!mission.name.trim()||
       mission.name.length>80||typeof mission.notes!=='string'||
       mission.notes.length>240||
       !Array.isArray(mission.goals)||mission.goals.length>MAX_MISSION_GOALS)
      throw Error('Invalid or duplicate mission name, ID or goal list.');
    missionIds.add(mission.id);
    const goalIds=new Set(),targets=new Set();
    const goals=mission.goals.map(goal=>{
      if(!object(goal)||typeof goal.id!=='string'||
         !idRegex('goal').test(goal.id)||goalIds.has(goal.id)||
         typeof goal.targetId!=='string'||goal.targetId.length>300||
         !goal.targetId||targets.has(goal.targetId)||
         !TARGET_KINDS.includes(goal.targetKind)||
         typeof goal.targetLabel!=='string'||!goal.targetLabel.trim()||
         goal.targetLabel.length>160||
         !(goal.roomId===null||typeof goal.roomId==='string'&&goal.roomId.length<=160)||
         !object(goal.physical)||!PHYSICAL_STATUSES.includes(goal.physical.status)||
         typeof goal.physical.notes!=='string'||goal.physical.notes.length>500||
         typeof goal.physical.confirmed!=='boolean')
        throw Error('Invalid or duplicate mission target or field-test record.');
      const p=goal.physical;
      if(p.status==='not-run'){
        if(p.confirmed||p.worldFingerprint!==null||p.notes)
          throw Error('Unrun physical tests cannot retain a confirmed result.');
      }else if(p.confirmed!==true||p.notes.trim().length<8||
         typeof p.worldFingerprint!=='string'||
         !/^fnv1a32:[a-f0-9]{8}$/.test(p.worldFingerprint))
        throw Error('Physical field-test result requires explicit acknowledgement, notes and a world fingerprint.');
      goalIds.add(goal.id);targets.add(goal.targetId);
      return {id:goal.id,targetId:goal.targetId,
        targetKind:goal.targetKind,targetLabel:goal.targetLabel,
        roomId:goal.roomId,
        physical:{status:p.status,notes:p.notes,
          confirmed:p.confirmed,worldFingerprint:p.worldFingerprint}};
    });
    return {id:mission.id,name:mission.name,notes:mission.notes,goals};
  });
  return {schema:TEST_MISSIONS_SCHEMA,missions};
}
export function addTestMission(book,{name='',notes=''}={}){
  const current=validateTestMissionBook(book);
  if(current.missions.length>=MAX_TEST_MISSIONS)
    throw Error('Eight test missions maximum. Export or remove an older mission.');
  const cleanName=clean(name,80);
  if(!cleanName)throw Error('Give the release-test mission a name.');
  const mission={id:nextId(current.missions,'mission'),name:cleanName,
    notes:note(notes,240),goals:[]};
  return validateTestMissionBook({
    ...current,missions:[...current.missions,mission]
  });
}
export function removeTestMission(book,missionId){
  const current=validateTestMissionBook(book);
  if(!current.missions.some(m=>m.id===missionId))
    throw Error('Test mission not found.');
  return {...current,missions:current.missions.filter(m=>m.id!==missionId)};
}
export function addMissionGoal(book,missionId,coverage,targetId){
  const current=validateTestMissionBook(book);
  const mission=current.missions.find(m=>m.id===missionId);
  if(!mission)throw Error('Test mission not found.');
  if(mission.goals.length>=MAX_MISSION_GOALS)
    throw Error('A test mission supports up to 16 goals.');
  if(!coverage||!Array.isArray(coverage.rows))
    throw Error('A current Route Coverage Matrix is required to add a target.');
  const target=coverage.rows.find(r=>r.id===targetId);
  if(!target)throw Error('Target does not exist in the current authored Room Atlas.');
  if(mission.goals.some(g=>g.targetId===targetId))
    throw Error('This authored target is already in the mission.');
  const goal={id:nextId(mission.goals,'goal'),targetId:target.id,
    targetKind:target.kind,targetLabel:clean(target.label,160),
    roomId:target.roomId??null,physical:freshPhysical()};
  return validateTestMissionBook({
    ...current,
    missions:current.missions.map(m=>m.id!==missionId?m:
      {...m,goals:[...m.goals,goal]})
  });
}
export function removeMissionGoal(book,missionId,goalId){
  const current=validateTestMissionBook(book);
  const mission=current.missions.find(m=>m.id===missionId);
  if(!mission||!mission.goals.some(g=>g.id===goalId))
    throw Error('Test mission goal not found.');
  return {...current,missions:current.missions.map(m=>m.id!==missionId?m:
    {...m,goals:m.goals.filter(g=>g.id!==goalId)})};
}
export function markMissionPhysicalTest(book,atlas,missionId,goalId,{
  status='not-run',notes='',confirmed=false
}={}){
  const current=validateTestMissionBook(book);
  const mission=current.missions.find(m=>m.id===missionId);
  if(!mission||!mission.goals.some(g=>g.id===goalId))
    throw Error('Test mission goal not found.');
  if(!PHYSICAL_STATUSES.includes(status))
    throw Error('Unknown manual playtest status.');
  let physical=freshPhysical();
  if(status!=='not-run'){
    if(confirmed!==true)
      throw Error('Explicitly confirm that this result comes from an actual hands-on game playtest.');
    if(typeof notes!=='string'||notes.trim().length<8)
      throw Error('Record at least eight characters of actual playtest notes.');
    const fingerprint=fullTestWorldFingerprint(atlas);
    if(!fingerprint)
      throw Error('Load the authored world before recording a playtest result.');
    physical={status,notes:note(notes,500),confirmed:true,
      worldFingerprint:fingerprint};
  }
  return validateTestMissionBook({
    ...current,missions:current.missions.map(m=>m.id!==missionId?m:{
      ...m,goals:m.goals.map(g=>g.id!==goalId?g:{...g,physical})
    })
  });
}
export function reviewTestMissionBook(atlas,book,coverage){
  const current=validateTestMissionBook(book);
  const rows=new Map((coverage?.rows||[]).map(row=>[row.id,row]));
  const build=fullTestWorldFingerprint(atlas);
  const narrative=routeWorldFingerprint(atlas);
  const missions=current.missions.map(mission=>{
    const goals=mission.goals.map(goal=>{
      const row=rows.get(goal.targetId);
      const narrativeStatus=!atlas?.rooms?.length?'no-world':
        !row?'missing':row.status;
      const physical=goal.physical;
      const playtestStatus=physical.status==='not-run'?'not-run':
        build&&physical.worldFingerprint===build?physical.status:'stale';
      const checked=narrativeStatus==='verified'&&playtestStatus==='passed';
      return {
        ...clone(goal),narrativeStatus,
        playtestStatus,
        narrativeScenarioIds:[...(row?.verifiedBy||[])],
        authoredTargetExists:Boolean(row),checked,
        message:!row?'Target is absent from the current authored world.':
          narrativeStatus!=='verified'?'Hypothetical narrative coverage is missing or needs review.':
          playtestStatus==='stale'?'Manual test notes reference a changed world and must be redone.':
          playtestStatus==='not-run'?'Hands-on gameplay test has not been recorded.':
          playtestStatus==='passed'?'Author-reported manual pass for the current world; not independently verified.':
          playtestStatus==='failed'?'Author-reported physical gameplay failure.':
          'Author-reported physical gameplay blocker.'
      };
    });
    const counts={total:goals.length,narrativeVerified:0,
      manualPassed:0,manualFailed:0,manualBlocked:0,manualStale:0,
      manualNotRun:0,checked:0};
    for(const goal of goals){
      if(goal.narrativeStatus==='verified')counts.narrativeVerified++;
      if(goal.playtestStatus==='passed')counts.manualPassed++;
      if(goal.playtestStatus==='failed')counts.manualFailed++;
      if(goal.playtestStatus==='blocked')counts.manualBlocked++;
      if(goal.playtestStatus==='stale')counts.manualStale++;
      if(goal.playtestStatus==='not-run')counts.manualNotRun++;
      if(goal.checked)counts.checked++;
    }
    return {id:mission.id,name:mission.name,notes:mission.notes,
      goals,counts,status:!goals.length?'empty':
      counts.checked===goals.length?'author-checklist-complete':'needs-work',
      warning:'Checklist completion is based on author-reported manual gameplay and hypothetical narrative verification. It is not independent release certification.'};
  });
  return {
    schema:TEST_MISSIONS_SCHEMA,
    reportType:'author-reported-gameplay-checklist',
    authoredWorldFingerprint:build,
    narrativeWorldFingerprint:narrative,
    missions,
    summary:{
      missions:missions.length,
      goals:missions.reduce((n,m)=>n+m.counts.total,0),
      checked:missions.reduce((n,m)=>n+m.counts.checked,0),
      completeMissions:missions.filter(m=>m.status==='author-checklist-complete').length,
      remainingMissions:missions.filter(m=>m.status!=='author-checklist-complete').length
    },
    warning:'This is a self-reported author checklist. Verified route receipts are hypothetical. Physical results are unverified statements, not telemetry or certification.'
  };
}
