// PixelForge Rung 16 / Branch Route Reports.
// Pure deterministic, local-only report creation and replay verification.
// NOT a signature/authentication mechanism, a save import, or game execution.
import {
  createStoryPathRun,advanceStoryPath,storyPathOptions,storyPathSummary
} from './story-path-simulator.js';

export const ROUTE_REPORT_SCHEMA='pixelforge.layer-route-report.v1';
const WARNING='HYPOTHETICAL ONLY. No physical gameplay, combat, inventory, or quest resolution was verified.';
const arraysEqual=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&
  a.length===b.length&&a.every((v,i)=>v===b[i]);
const plain=(v)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const safe=(s)=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,280);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function routeWorldSignature(atlas){
  if(!atlas?.rooms?.length)return '';
  // Keep identical to the story simulator's topology reset projection:
  // graphics and incidental scene movement do not invalidate route receipts.
  return JSON.stringify({startRoom:atlas.startRoom,rooms:atlas.rooms.map(r=>({
    id:r.id,title:r.title,portals:r.portals,
    tracks:r.sequences?.tracks,
    sources:r.scene?.playable?.director?.triggers
      ?.filter(t=>t.kind==='flag').map(t=>[t.id,t.kind,t.flagId,t.once]),
    dialogues:r.story?.dialogues?.map(d=>[d.id,d.once,d.requiresFlag,d.speaker,d.choices]),
    boss:r.boss?[r.boss.id,r.boss.name,r.boss.victoryFlag]:null
  }))});
}
export function routeWorldFingerprint(atlas){
  const signature=routeWorldSignature(atlas);
  if(!signature)return null;
  // FNV-1a is a stable change detector, NOT a cryptographic seal.
  let hash=2166136261;
  for(let i=0;i<signature.length;i++){
    hash^=signature.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return 'fnv1a32:'+((hash>>>0).toString(16).padStart(8,'0'));
}
function normalAction(action){
  if(!plain(action)||typeof action.type!=='string')return null;
  const id=(v)=>typeof v==='string'&&v.length>0&&v.length<=200?v:null;
  if(action.type==='discover'){
    const trackId=id(action.trackId);
    if(!trackId)return null;
    if(action.choiceId!=null&&!id(action.choiceId))return null;
    return {type:'discover',trackId,
      ...(action.choiceId!=null?{choiceId:action.choiceId}:{})};
  }
  if(action.type==='travel'){
    const portalId=id(action.portalId);
    return portalId?{type:'travel',portalId}:null;
  }
  if(action.type==='source'){
    const sourceId=id(action.sourceId);
    return sourceId?{type:'source',sourceId}:null;
  }
  if(action.type==='assumeGates'&&typeof action.value==='boolean')
    return {type:'assumeGates',value:action.value};
  return null;
}
function sameRun(a,b){
  if(!a||!b)return false;
  return a.roomId===b.roomId&&a.assumeGates===b.assumeGates&&
    ['flags','seen','sources','visited'].every(k=>arraysEqual(a[k],b[k]));
}
function replay(atlas,actions){
  if(!Array.isArray(actions)||actions.length>64)
    return {ok:false,code:'invalid-actions',message:'Report may contain 0–64 actions.'};
  let run=createStoryPathRun(atlas);
  const steps=[];
  for(let i=0;i<actions.length;i++){
    const action=normalAction(actions[i]);
    if(!action)return {ok:false,code:'invalid-action',step:i+1,
      message:'Step '+(i+1)+' contains an unsupported or malformed action.'};
    const before=run;
    const out=advanceStoryPath(atlas,before,action);
    if(!out.ok)return {ok:false,code:'blocked-action',step:i+1,
      message:'Step '+(i+1)+' cannot replay: '+out.reason};
    run=out.state;
    const gained=run.flags.filter(f=>!before.flags.includes(f));
    const portal=action.type==='travel'?
      atlas.rooms.find(r=>r.id===before.roomId)?.portals
        ?.find(p=>p.id===action.portalId):null;
    const assumed=action.type==='travel'&&before.assumeGates?
      [
        ...(portal?.requiresKey?['key']:[]),
        ...(portal?.requiresRelic?['relic '+portal.requiresRelic]:[]),
        ...(portal?.requiresQuest?['quest '+portal.requiresQuest]:[])
      ]:[];
    steps.push({number:i+1,action,label:out.label,
      fromRoom:before.roomId,toRoom:run.roomId,
      gainedFlags:gained,
      ...(assumed.length?{unverifiedGateChecks:assumed}:{})});
  }
  return {ok:true,run,steps};
}
function snapshot(atlas,run,steps){
  const options=storyPathOptions(atlas,run);
  const summary=storyPathSummary(atlas,run);
  const blockers=[
    ...options.tracks.filter(t=>!t.ready).map(t=>({
      kind:'discovery',id:t.id,label:t.title,reasons:t.reasons
    })),
    ...options.portals.filter(p=>!p.ready).map(p=>({
      kind:'portal',id:p.id,label:p.label,reasons:p.reasons
    }))
  ];
  const assumptions=[
    ...steps.filter(s=>s.action.type==='source').map(s=>({
      step:s.number,kind:'authored-event',detail:s.label
    })),
    ...steps.filter(s=>s.unverifiedGateChecks?.length).map(s=>({
      step:s.number,kind:'non-flag-gate',detail:s.unverifiedGateChecks.join(', ')
    }))
  ];
  return {
    schema:ROUTE_REPORT_SCHEMA,
    reportType:'hypothetical-story-path',
    world:{
      fingerprint:routeWorldFingerprint(atlas),
      startRoom:atlas.startRoom,
      roomCount:atlas.rooms.length,
      signatureType:'non-cryptographic topology checksum'
    },
    steps,
    final:{
      roomId:run.roomId,flags:[...run.flags],seen:[...run.seen],
      sources:[...run.sources],visited:[...run.visited],
      assumeGates:run.assumeGates
    },
    summary:{
      earnedFlags:summary.flagCount,
      completedDiscoveries:summary.completed,
      totalDiscoveries:summary.totalTracks,
      visitedRooms:summary.visitedRooms,
      availableDiscoveriesInRoom:summary.currentAvailable,
      blockedItemsInRoom:blockers.length,
      steps:steps.length
    },
    blockers,
    assumptions,
    caution:WARNING
  };
}
export function createRouteReport(atlas,state){
  if(!atlas?.rooms?.length||!state||!Array.isArray(state.history))
    throw Error('A valid Room Atlas and simulated route are required.');
  const out=replay(atlas,state.history.map(h=>h.action));
  if(!out.ok)throw Error('Cannot export route: '+out.message);
  if(!sameRun(out.run,state))
    throw Error('Simulation no longer matches authored actions; reset and replay it.');
  return snapshot(atlas,out.run,out.steps);
}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(plain(value))return Object.fromEntries(
    Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
export function verifyRouteReport(atlas,report){
  if(!atlas?.rooms?.length)return {ok:false,code:'no-atlas',
    message:'Load a Room Atlas before verifying this route.'};
  if(!plain(report)||report.schema!==ROUTE_REPORT_SCHEMA||
      report.reportType!=='hypothetical-story-path'||!plain(report.world)||
      !Array.isArray(report.steps)||report.steps.length>64)
    return {ok:false,code:'invalid-report',
      message:'Not a supported bounded PixelForge Branch Route Report.'};
  if(report.world.fingerprint!==routeWorldFingerprint(atlas))
    return {ok:false,code:'world-mismatch',
      message:'The authored story topology differs from this report. Nothing was applied.'};
  const out=replay(atlas,report.steps.map(s=>s?.action));
  if(!out.ok)return out;
  const expected=snapshot(atlas,out.run,out.steps);
  if(JSON.stringify(canonical(report))!==JSON.stringify(canonical(expected)))
    return {ok:false,code:'receipt-mismatch',
      message:'The route details, outcomes or assumptions do not match a fresh replay.'};
  return {ok:true,code:'verified',message:'All '+out.steps.length+
    ' hypothetical steps replayed against this world. Physical gameplay remains unverified.',
    state:out.run,report:expected};
}
const md=(value)=>safe(value).replace(/[\\\`*_{}\[\]<>#|!]/g,'\\$&');
export function routeReportMarkdown(report){
  if(report?.schema!==ROUTE_REPORT_SCHEMA)
    throw Error('Only PixelForge Branch Route Reports can be formatted.');
  const lines=[
    '# PixelForge Branch Route Report',
    '',
    '**Status:** Hypothetical planning route, not a gameplay completion receipt.',
    '**World topology checksum:** \`'+md(report.world.fingerprint)+'\` (non-cryptographic)',
    '**Start room:** '+md(report.world.startRoom),
    '**Final room:** '+md(report.final.roomId),
    '**Route steps:** '+report.steps.length,
    '',
    '## Reproducible action log',
    ''
  ];
  if(!report.steps.length)lines.push('No hypothetical steps have been taken.');
  for(const step of report.steps){
    lines.push(step.number+'. **'+md(step.label)+'**');
    lines.push('   - Action: \`'+md(JSON.stringify(step.action))+'\`');
    if(step.gainedFlags.length)lines.push('   - Earned flags: '+
      step.gainedFlags.map(f=>'\`'+md(f)+'\`').join(', '));
    if(step.unverifiedGateChecks?.length)lines.push('   - **Unverified gate conditions:** '+
      step.unverifiedGateChecks.map(md).join(', '));
  }
  lines.push('','## Final simulated world flags','');
  if(!report.final.flags.length)lines.push('None earned.');
  else for(const flag of report.final.flags)lines.push('- \`'+md(flag)+'\`');
  lines.push('','## Blocked options in final room','');
  if(!report.blockers.length)lines.push('No known blocked items in this room.');
  else for(const block of report.blockers)
    lines.push('- **'+md(block.kind)+' / '+md(block.label)+':** '+
      block.reasons.map(md).join('; '));
  lines.push('','## Assumptions (not actual gameplay evidence)','');
  if(!report.assumptions.length)lines.push('No explicit source or non-flag travel assumptions used.');
  else for(const a of report.assumptions)
    lines.push('- Step '+a.step+': '+md(a.kind)+': '+md(a.detail));
  lines.push('','## Limits','',md(report.caution),'',
    'The checksum detects ordinary authored-world changes, but is not an authentication or tamper-proof signature.',
    'This file is not an Adventure Journal save and cannot grant game progress.','');
  return lines.join('\n');
}
