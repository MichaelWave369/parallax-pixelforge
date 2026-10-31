// PixelForge Rung 22 / Device & Input Test Matrix.
// Independent, author-reported physical platform results for Rung 21 goals.
// This module neither detects a device nor executes gameplay. A hypothetical
// narrative receipt or generic mission pass NEVER populates a device cell.
import {validateTestMissionBook,reviewTestMissionBook,fullTestWorldFingerprint}
  from './story-test-missions.js';

export const DEVICE_MATRIX_SCHEMA='pixelforge.layer-device-input-matrix.v1';
export const DEVICE_MATRIX_KEY='pixelforge.layer-device-input-matrix.v1.local';
export const MAX_DEVICE_MATRIX_BYTES=400000;
export const DEVICE_PROFILES=Object.freeze([
  Object.freeze({id:'desktop-keyboard',name:'Desktop Keyboard + Mouse',
    platform:'desktop browser',input:'keyboard and mouse'}),
  Object.freeze({id:'xbox-controller',name:'Xbox Controller',
    platform:'desktop or console-compatible browser',input:'gamepad'}),
  Object.freeze({id:'mobile-touch',name:'Mobile Touch',
    platform:'phone / tablet browser',input:'touchscreen'}),
  Object.freeze({id:'quest3-webxr',name:'Quest 3 WebXR',
    platform:'Meta Quest 3 browser',input:'tracked VR controllers'})
]);
const STATUS=['passed','failed','blocked'];
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const profileById=id=>DEVICE_PROFILES.find(p=>p.id===id);
const validId=(id,prefix)=>typeof id==='string'&&
  new RegExp('^'+prefix+'-[1-9]\\d{0,7}$').test(id);
const key=(m,g,p)=>[m,g,p].join(':');
export function createDeviceMatrix(){return {schema:DEVICE_MATRIX_SCHEMA,records:[]}}
export function validateDeviceMatrix(matrix){
  if(!object(matrix)||matrix.schema!==DEVICE_MATRIX_SCHEMA||
    !Array.isArray(matrix.records)||matrix.records.length>512)
    throw Error('Unsupported or oversized device test matrix.');
  const data=JSON.stringify(matrix);
  if(!data||data.length>MAX_DEVICE_MATRIX_BYTES)
    throw Error('Device matrix exceeds the 400 KB limit.');
  const keys=new Set(),records=[];
  for(const r of matrix.records){
    if(!object(r)||!validId(r.missionId,'mission')||
      !validId(r.goalId,'goal')||typeof r.targetId!=='string'||
      !r.targetId||r.targetId.length>300||!profileById(r.profileId)||
      !STATUS.includes(r.status)||r.confirmed!==true||
      typeof r.notes!=='string'||r.notes.trim().length<8||
      r.notes.length>500||typeof r.environment!=='string'||
      r.environment.trim().length<3||r.environment.length>120||
      typeof r.worldFingerprint!=='string'||
      !/^fnv1a32:[a-f0-9]{8}$/.test(r.worldFingerprint))
      throw Error('Invalid device result. An author attestation, environment, notes and world fingerprint are required.');
    const id=key(r.missionId,r.goalId,r.profileId);
    if(keys.has(id))throw Error('Duplicate device/goal record.');
    keys.add(id);
    records.push({missionId:r.missionId,goalId:r.goalId,targetId:r.targetId,
      profileId:r.profileId,
      status:r.status,notes:r.notes,environment:r.environment,
      confirmed:true,worldFingerprint:r.worldFingerprint});
  }
  return {schema:DEVICE_MATRIX_SCHEMA,records};
}
function knownGoal(book,missionId,goalId){
  const current=validateTestMissionBook(book);
  const goal=current.missions.find(m=>m.id===missionId)
    ?.goals.find(g=>g.id===goalId);
  if(!goal)throw Error('Device result must belong to a current authoring mission goal.');
  return goal;
}
export function recordDeviceTest(matrix,book,atlas,missionId,goalId,profileId,{
  status='not-run',notes='',environment='',confirmed=false
}={}){
  const current=validateDeviceMatrix(matrix);
  const goal=knownGoal(book,missionId,goalId);
  if(!profileById(profileId))throw Error('Unknown device/input profile.');
  const prior=current.records.filter(r=>key(r.missionId,r.goalId,r.profileId)!==
    key(missionId,goalId,profileId));
  if(status==='not-run')
    return validateDeviceMatrix({...current,records:prior});
  if(!STATUS.includes(status))throw Error('Unknown author-reported gameplay result.');
  if(confirmed!==true)
    throw Error('Confirm you personally tested this input on this device in the actual game.');
  if(typeof notes!=='string'||notes.trim().length<8||notes.length>500)
    throw Error('Record 8 to 500 characters describing the actual device playtest.');
  if(typeof environment!=='string'||environment.trim().length<3||
    environment.length>120)
    throw Error('Describe the actual operating system, browser or device build (3 to 120 characters).');
  const fingerprint=fullTestWorldFingerprint(atlas);
  if(!fingerprint)throw Error('Load the authored world before recording gameplay evidence.');
  const record={missionId,goalId,targetId:goal.targetId,profileId,status,notes,
    environment:environment.trim(),confirmed:true,worldFingerprint:fingerprint};
  return validateDeviceMatrix({...current,records:[...prior,record]});
}
export function mergeDeviceMatrix(current,incoming){
  const a=validateDeviceMatrix(current),b=validateDeviceMatrix(incoming);
  const out=[...a.records],ids=new Set(out.map(r=>
    key(r.missionId,r.goalId,r.profileId)));
  let imported=0,skipped=0;
  for(const r of b.records){
    const id=key(r.missionId,r.goalId,r.profileId);
    if(ids.has(id)){skipped++;continue}
    out.push(r);ids.add(id);imported++;
  }
  return {matrix:validateDeviceMatrix({...a,records:out}),imported,skipped};
}
export function pruneDeviceMatrixForBook(matrix,book){
  const current=validateDeviceMatrix(matrix);
  const missions=validateTestMissionBook(book).missions;
  const live=new Set(missions.flatMap(m=>m.goals.map(g=>
    [m.id,g.id,g.targetId].join(':'))));
  return validateDeviceMatrix({...current,records:current.records.filter(r=>
    live.has([r.missionId,r.goalId,r.targetId].join(':')))});
}
export function reviewDeviceMatrix(atlas,book,coverage,matrix){
  const current=validateDeviceMatrix(matrix);
  const missionReview=reviewTestMissionBook(atlas,book,coverage);
  const fingerprint=fullTestWorldFingerprint(atlas);
  const records=new Map(current.records.map(r=>[
    key(r.missionId,r.goalId,r.profileId),r]));
  const used=new Set(),missions=[];
  const totals={missions:missionReview.missions.length,
    goals:0,goalProfiles:0,simVerified:0,authorPassed:0,
    authorFailed:0,authorBlocked:0,stale:0,notRun:0,
    completeCells:0,allProfileGoals:0,orphanRecords:0};
  for(const mission of missionReview.missions){
    const goals=[];
    for(const goal of mission.goals){
      totals.goals++;
      if(goal.narrativeStatus==='verified')totals.simVerified++;
      const cells=DEVICE_PROFILES.map(profile=>{
        const id=key(mission.id,goal.id,profile.id);
        const found=records.get(id);
        const record=found?.targetId===goal.targetId?found:null;
        if(record)used.add(id);
        const deviceStatus=!record?'not-run':
          fingerprint&&record.worldFingerprint===fingerprint?
            record.status:'stale';
        const ready=goal.narrativeStatus==='verified'&&deviceStatus==='passed';
        totals.goalProfiles++;
        if(ready)totals.completeCells++;
        if(deviceStatus==='passed')totals.authorPassed++;
        else if(deviceStatus==='failed')totals.authorFailed++;
        else if(deviceStatus==='blocked')totals.authorBlocked++;
        else if(deviceStatus==='stale')totals.stale++;
        else totals.notRun++;
        return {profileId:profile.id,profileName:profile.name,
          deviceStatus,simStatus:goal.narrativeStatus,
          ready,notes:record?.notes||'',
          environment:record?.environment||'',
          confirmed:Boolean(record?.confirmed),
          recordedWorldFingerprint:record?.worldFingerprint||null,
          message:deviceStatus==='not-run'?
            'Not tested on this device/input combination.':
            deviceStatus==='stale'?
            'Prior author report refers to a different authored world. Retest required.':
            'Author-reported '+deviceStatus+' on '+profile.name+
              '. Not independently verified.'};
      });
      if(cells.every(c=>c.ready))totals.allProfileGoals++;
      goals.push({id:goal.id,label:goal.targetLabel,kind:goal.targetKind,
        roomId:goal.roomId,simStatus:goal.narrativeStatus,cells});
    }
    missions.push({id:mission.id,name:mission.name,
      goalCount:goals.length,goals});
  }
  totals.orphanRecords=current.records.length-used.size;
  return {schema:DEVICE_MATRIX_SCHEMA,
    reportType:'author-reported-device-input-test-matrix',
    profiles:DEVICE_PROFILES.map(p=>({...p})),
    missions,summary:totals,
    warning:'All device results are self-reported by the author and are not telemetry. Verified hypothetical story routes and generic mission passes do NOT prove compatibility on another platform. World fingerprints detect some edits but do not authenticate builds or physical gameplay.'};
}
