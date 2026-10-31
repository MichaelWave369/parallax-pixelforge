import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {makeStarterAtlas} from '../layer-studio/room-atlas.js';
import {createStoryPathRun,advanceStoryPath} from '../layer-studio/story-path-simulator.js';
import {createScenarioCatalog,addScenario} from '../layer-studio/story-scenario-catalog.js';
import {analyzeRouteCoverage} from '../layer-studio/story-route-coverage.js';
import {
  createTestMissionBook,addTestMission,addMissionGoal,removeMissionGoal,
  removeTestMission,markMissionPhysicalTest
} from '../layer-studio/story-test-missions.js';
import {
  DEVICE_MATRIX_SCHEMA,DEVICE_MATRIX_KEY,DEVICE_PROFILES,
  createDeviceMatrix,validateDeviceMatrix,recordDeviceTest,
  mergeDeviceMatrix,pruneDeviceMatrixForBook,reviewDeviceMatrix
} from '../layer-studio/story-device-matrix.js';

const copy=x=>JSON.parse(JSON.stringify(x));
function atlas(){
  const scene=createScene();scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene).atlas;
}
function build(){
  const a=atlas();let sim=createStoryPathRun(a);
  for(const action of [
    {type:'discover',trackId:'the-stone-archive'},
    {type:'assumeGates',value:true},
    {type:'travel',portalId:'vault-to-reliquary'},
    {type:'discover',trackId:'forked-echo',choiceId:'honor'},
    {type:'discover',trackId:'promise-path'}
  ]){
    const result=advanceStoryPath(a,sim,action);
    assert.equal(result.ok,true,result.reason||JSON.stringify(action));
    sim=result.state;
  }
  const catalog=addScenario(createScenarioCatalog(),a,sim,{name:'Honor'});
  const coverage=analyzeRouteCoverage(a,catalog);
  const chosen=coverage.rows.find(r=>r.kind==='choice'&&r.id.includes('honor'));
  const other=coverage.rows.find(r=>r.kind==='choice'&&r.id.includes('silence'));
  assert.ok(chosen);assert.ok(other);
  let missions=addTestMission(createTestMissionBook(),{name:'Branch release QA'});
  missions=addMissionGoal(missions,'mission-1',coverage,chosen.id);
  return {a,catalog,coverage,missions,chosen,other};
}
const manual={status:'passed',notes:'Physically tested in the real game using this input method.',
  environment:'Windows 11 / Chrome 156',confirmed:true};
const review=(b,m)=>reviewDeviceMatrix(b.a,b.missions,b.coverage,m);
const goalCell=(r,profile='desktop-keyboard')=>r.missions[0].goals[0].cells
  .find(cell=>cell.profileId===profile);
test('device matrix owns four independent fixed input profiles and its own data key',()=>{
  assert.equal(DEVICE_MATRIX_SCHEMA,'pixelforge.layer-device-input-matrix.v1');
  assert.equal(DEVICE_MATRIX_KEY,'pixelforge.layer-device-input-matrix.v1.local');
  assert.equal(DEVICE_PROFILES.length,4);
  assert.deepEqual(DEVICE_PROFILES.map(x=>x.id),[
    'desktop-keyboard','xbox-controller','mobile-touch','quest3-webxr'
  ]);
  assert.deepEqual(createDeviceMatrix(),{schema:DEVICE_MATRIX_SCHEMA,records:[]});
  assert.equal(new Set(DEVICE_PROFILES.map(x=>x.id)).size,4);
});
test('fresh matrix has 4 not-run cells even if Honor narrative scenario verifies',()=>{
  const b=build(),matrix=createDeviceMatrix(),r=review(b,matrix);
  assert.equal(r.summary.goals,1);
  assert.equal(r.summary.goalProfiles,4);
  assert.equal(r.summary.simVerified,1);
  assert.equal(r.summary.authorPassed,0);
  assert.equal(r.summary.notRun,4);
  assert.equal(r.summary.completeCells,0);
  assert.equal(goalCell(r).simStatus,'verified');
  assert.equal(goalCell(r).deviceStatus,'not-run');
  assert.equal(goalCell(r).ready,false);
});
test('a generic Rung 21 hands-on pass NEVER populates a specific platform',()=>{
  const b=build();const prior=JSON.stringify(b.missions);
  b.missions=markMissionPhysicalTest(b.missions,b.a,'mission-1','goal-1',{
    status:'passed',notes:'Played the game and verified the Honor choice.',confirmed:true
  });
  assert.notEqual(JSON.stringify(b.missions),prior);
  const r=review(b,createDeviceMatrix());
  assert.equal(r.summary.notRun,4);
  assert.equal(r.summary.completeCells,0);
  assert.equal(r.missions[0].goals[0].cells.every(c=>c.deviceStatus==='not-run'),true);
});
test('one Xbox pass does not imply keyboard, touch or Quest 3 passes',()=>{
  const b=build(),original=JSON.stringify(b.a);
  const saved=recordDeviceTest(createDeviceMatrix(),b.missions,b.a,
    'mission-1','goal-1','xbox-controller',{
      ...manual,environment:'Xbox Series X controller / Chrome'
    });
  const result=review(b,saved);
  assert.equal(saved.records.length,1);
  assert.equal(saved.records[0].targetId,b.chosen.id);
  assert.equal(result.summary.authorPassed,1);
  assert.equal(result.summary.completeCells,1);
  assert.equal(result.summary.notRun,3);
  assert.equal(goalCell(result,'xbox-controller').ready,true);
  for(const id of ['desktop-keyboard','mobile-touch','quest3-webxr']){
    assert.equal(goalCell(result,id).deviceStatus,'not-run');
    assert.equal(goalCell(result,id).ready,false);
  }
  assert.equal(JSON.stringify(b.a),original);
});
test('each physical record needs a deliberate human attestation, notes and environment',()=>{
  const b=build(),fresh=createDeviceMatrix();
  const save=extra=>recordDeviceTest(fresh,b.missions,b.a,
    'mission-1','goal-1','quest3-webxr',{...manual,...extra});
  assert.throws(()=>save({confirmed:false}),/personally tested/);
  assert.throws(()=>save({notes:'short'}),/8 to 500/);
  assert.throws(()=>save({environment:'x'}),/operating system/);
  assert.throws(()=>save({status:'automated-pass'}),/Unknown author-reported/);
  assert.throws(()=>recordDeviceTest(fresh,b.missions,null,
    'mission-1','goal-1','quest3-webxr',manual),/Load the authored world/);
  assert.throws(()=>recordDeviceTest(fresh,b.missions,b.a,
    'mission-1','goal-1','unknown-profile',manual),/Unknown device/);
  assert.throws(()=>recordDeviceTest(fresh,b.missions,b.a,
    'mission-3','goal-1','quest3-webxr',manual),/current authoring mission goal/);
});
test('failed and blocked Quest results remain distinct from pass and do not complete',()=>{
  const b=build();
  for(const status of ['failed','blocked']){
    const matrix=recordDeviceTest(createDeviceMatrix(),b.missions,b.a,
      'mission-1','goal-1','quest3-webxr',{...manual,status});
    const result=review(b,matrix);
    assert.equal(goalCell(result,'quest3-webxr').deviceStatus,status);
    assert.equal(goalCell(result,'quest3-webxr').ready,false);
    assert.equal(result.summary.completeCells,0);
    assert.equal(result.summary[status==='failed'?'authorFailed':'authorBlocked'],1);
  }
});
test('a new full authored world fingerprint stales only recorded observations',()=>{
  const b=build(),matrix=recordDeviceTest(createDeviceMatrix(),b.missions,b.a,
    'mission-1','goal-1','mobile-touch',{...manual,
      environment:'Android 16 / Chrome touch'});
  const visual=copy(b.a);visual.rooms[0].scene.layers[0].opacity=.1;
  const c=analyzeRouteCoverage(visual,b.catalog);
  const reviewed=reviewDeviceMatrix(visual,b.missions,c,matrix);
  assert.equal(goalCell(reviewed,'mobile-touch').simStatus,'verified');
  assert.equal(goalCell(reviewed,'mobile-touch').deviceStatus,'stale');
  assert.equal(goalCell(reviewed,'mobile-touch').ready,false);
  assert.equal(reviewed.summary.stale,1);
  assert.equal(reviewed.summary.notRun,3);
  assert.equal(matrix.records[0].status,'passed');
});
test('a recorded real pass with no verified hypothetical route stays pending',()=>{
  const b=build(),matrix=recordDeviceTest(createDeviceMatrix(),b.missions,b.a,
    'mission-1','goal-1','desktop-keyboard',manual);
  const current=analyzeRouteCoverage(b.a,createScenarioCatalog());
  const result=reviewDeviceMatrix(b.a,b.missions,current,matrix);
  assert.equal(goalCell(result).deviceStatus,'passed');
  assert.equal(goalCell(result).simStatus,'uncovered');
  assert.equal(goalCell(result).ready,false);
  assert.equal(result.summary.completeCells,0);
});
test('records for deleted or retargeted goals never inherit a new target',()=>{
  const b=build(),matrix=recordDeviceTest(createDeviceMatrix(),b.missions,b.a,
    'mission-1','goal-1','desktop-keyboard',manual);
  const without=removeMissionGoal(b.missions,'mission-1','goal-1');
  const newGoal=addMissionGoal(without,'mission-1',b.coverage,b.other.id);
  assert.equal(newGoal.missions[0].goals[0].id,'goal-1');
  const result=reviewDeviceMatrix(b.a,newGoal,b.coverage,matrix);
  assert.equal(result.summary.orphanRecords,1);
  assert.equal(result.summary.authorPassed,0);
  assert.equal(goalCell(result).deviceStatus,'not-run');
  const cleaned=pruneDeviceMatrixForBook(matrix,newGoal);
  assert.equal(cleaned.records.length,0);
  const deleted=removeTestMission(b.missions,'mission-1');
  assert.equal(pruneDeviceMatrixForBook(matrix,deleted).records.length,0);
});
test('explicit clearing of a particular profile leaves other input records untouched',()=>{
  const b=build();let matrix=createDeviceMatrix();
  for(const profile of ['desktop-keyboard','xbox-controller']){
    matrix=recordDeviceTest(matrix,b.missions,b.a,'mission-1','goal-1',
      profile,manual);
  }
  matrix=recordDeviceTest(matrix,b.missions,b.a,'mission-1','goal-1',
    'xbox-controller',{status:'not-run'});
  assert.equal(matrix.records.length,1);
  assert.equal(matrix.records[0].profileId,'desktop-keyboard');
  const result=review(b,matrix);
  assert.equal(result.summary.completeCells,1);
  assert.equal(goalCell(result,'xbox-controller').deviceStatus,'not-run');
});
test('portable merge preserves local record on conflict and imports independent device reports',()=>{
  const b=build();
  const base=recordDeviceTest(createDeviceMatrix(),b.missions,b.a,
    'mission-1','goal-1','xbox-controller',manual);
  const other=recordDeviceTest(createDeviceMatrix(),b.missions,b.a,
    'mission-1','goal-1','quest3-webxr',{
      ...manual,status:'blocked',environment:'Meta Quest 3 / Meta Browser'
    });
  const merged=mergeDeviceMatrix(base,other);
  assert.equal(merged.imported,1);
  assert.equal(merged.skipped,0);
  assert.equal(merged.matrix.records.length,2);
  const same=mergeDeviceMatrix(merged.matrix,other);
  assert.equal(same.imported,0);
  assert.equal(same.skipped,1);
  assert.equal(same.matrix.records[1].status,'blocked');
  assert.equal(JSON.stringify(validateDeviceMatrix(same.matrix)),
    JSON.stringify(same.matrix));
});
test('strict schema rejects fake confirmations, invalid targets, duplicate reports and oversized data',()=>{
  const b=build(),matrix=recordDeviceTest(createDeviceMatrix(),b.missions,b.a,
    'mission-1','goal-1','desktop-keyboard',manual);
  const bad=copy(matrix);bad.records[0].confirmed=false;
  assert.throws(()=>validateDeviceMatrix(bad),/attestation/);
  const unknown=copy(matrix);unknown.records[0].profileId='some-vr';
  assert.throws(()=>validateDeviceMatrix(unknown));
  const missing=copy(matrix);delete missing.records[0].targetId;
  assert.throws(()=>validateDeviceMatrix(missing));
  const duplicate=copy(matrix);duplicate.records.push(copy(duplicate.records[0]));
  assert.throws(()=>validateDeviceMatrix(duplicate),/Duplicate/);
  const large=copy(matrix);large.extra='x'.repeat(400001);
  assert.throws(()=>validateDeviceMatrix(large),/400 KB/);
  assert.throws(()=>validateDeviceMatrix({schema:'legacy',records:[]}));
});
test('all four device profiles can be author-reported but never become release certification',()=>{
  const b=build();let matrix=createDeviceMatrix();
  for(const profile of DEVICE_PROFILES)
    matrix=recordDeviceTest(matrix,b.missions,b.a,
      'mission-1','goal-1',profile.id,{
        ...manual,environment:profile.name+' / test hardware'
      });
  const reviewed=review(b,matrix);
  assert.equal(reviewed.summary.completeCells,4);
  assert.equal(reviewed.summary.allProfileGoals,1);
  assert.equal(reviewed.summary.authorPassed,4);
  assert.match(reviewed.warning,/not telemetry/i);
  assert.match(reviewed.warning,/do NOT prove compatibility/);
  assert.equal(reviewed.reportType,'author-reported-device-input-test-matrix');
});
test('no-world and empty missions remain safe; orphan import records cannot green any goal',()=>{
  const b=build(),m=recordDeviceTest(createDeviceMatrix(),b.missions,b.a,
    'mission-1','goal-1','quest3-webxr',manual);
  const cleared=reviewDeviceMatrix(null,b.missions,null,m);
  assert.equal(cleared.summary.completeCells,0);
  assert.equal(cleared.summary.stale,1);
  const empty=reviewDeviceMatrix(b.a,createTestMissionBook(),b.coverage,m);
  assert.equal(empty.summary.goals,0);
  assert.equal(empty.summary.orphanRecords,1);
});
test('Rung 22 UI uses independent storage and never copies generic simulation statuses into device results',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const module=readFileSync(new URL('../layer-studio/story-device-matrix.js',import.meta.url),'utf8');
  for(const id of ['deviceMatrixSummary','deviceMatrixHead','deviceMatrixBody',
    'deviceMatrixGoal','deviceMatrixProfile','deviceMatrixOutcome',
    'deviceMatrixEnvironment','deviceMatrixNotes','deviceMatrixConfirm',
    'deviceMatrixRecord','deviceMatrixExport','deviceMatrixFile',
    'deviceMatrixImport','deviceMatrixNote'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(studio,/localStorage\.setItem\(DEVICE_MATRIX_KEY/);
  assert.match(studio,/recordDeviceTest\(deviceMatrix,testMissionBook/);
  assert.match(studio,/confirmed:\$\('deviceMatrixConfirm'\)\.checked/);
  assert.match(studio,/mergeDeviceMatrix/);
  assert.match(studio,/pruneDeviceMatrixForBook/);
  assert.match(studio,/routeFileDownload\('pixelforge-device-input-matrix\.json'/);
  assert.doesNotMatch(module,/localStorage|sessionStorage|fetch\(|eval\(|document\.|innerHTML/);
});
