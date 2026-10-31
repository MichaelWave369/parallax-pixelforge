import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {makeStarterAtlas} from '../layer-studio/room-atlas.js';
import {createStoryPathRun,advanceStoryPath} from '../layer-studio/story-path-simulator.js';
import {createScenarioCatalog,addScenario} from '../layer-studio/story-scenario-catalog.js';
import {analyzeRouteCoverage} from '../layer-studio/story-route-coverage.js';
import {routeWorldFingerprint} from '../layer-studio/story-path-reports.js';
import {
  TEST_MISSIONS_SCHEMA,TEST_MISSIONS_KEY,MAX_TEST_MISSIONS,MAX_MISSION_GOALS,
  createTestMissionBook,validateTestMissionBook,addTestMission,removeTestMission,
  addMissionGoal,removeMissionGoal,markMissionPhysicalTest,reviewTestMissionBook,
  fullTestWorldFingerprint
} from '../layer-studio/story-test-missions.js';

const copy=v=>JSON.parse(JSON.stringify(v));
function atlas(){
  const scene=createScene();scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene).atlas;
}
function run(a,choice='honor'){
  let state=createStoryPathRun(a);
  for(const action of [
    {type:'discover',trackId:'the-stone-archive'},
    {type:'assumeGates',value:true},
    {type:'travel',portalId:'vault-to-reliquary'},
    {type:'discover',trackId:'forked-echo',choiceId:choice},
    {type:'discover',trackId:choice==='honor'?'promise-path':'silence-path'}
  ]){
    const result=advanceStoryPath(a,state,action);
    assert.equal(result.ok,true,result.reason||JSON.stringify(action));
    state=result.state;
  }
  return state;
}
function coverage(a,choices=[]){
  let c=createScenarioCatalog();
  for(const choice of choices)
    c=addScenario(c,a,run(a,choice),{name:choice+' path'});
  return analyzeRouteCoverage(a,c);
}
function target(report,kind,needle){
  const row=report.rows.find(r=>r.kind===kind&&r.id.includes(needle));
  assert.ok(row,'Target missing: '+kind+' '+needle);
  return row;
}
function missionWithGoal(a=atlas(),choices=[]){
  const matrix=coverage(a,choices);
  let book=addTestMission(createTestMissionBook(),{
    name:'Chapter 1 release review',notes:'Check fork behavior'
  });
  book=addMissionGoal(book,'mission-1',matrix,target(matrix,'choice','honor').id);
  return {a,book,matrix};
}
test('test missions are their own versioned local-only artifact, not game or scenario saves',()=>{
  assert.deepEqual(createTestMissionBook(),{
    schema:TEST_MISSIONS_SCHEMA,missions:[]
  });
  assert.equal(TEST_MISSIONS_KEY,'pixelforge.layer-test-missions.v1.local');
  assert.notEqual(TEST_MISSIONS_KEY,'pixelforge.layer-scene.v1.local');
  assert.notEqual(TEST_MISSIONS_KEY,'pixelforge.layer-scenario-catalog.v1.local');
  assert.equal(MAX_TEST_MISSIONS,8);
  assert.equal(MAX_MISSION_GOALS,16);
  assert.deepEqual(reviewTestMissionBook(null,createTestMissionBook(),null).summary,
    {missions:0,goals:0,checked:0,completeMissions:0,remainingMissions:0});
});
test('a mission can group distinct authored outcomes as independent test goals',()=>{
  const a=atlas(),original=JSON.stringify(a),matrix=coverage(a,['honor','silence']);
  let book=addTestMission(createTestMissionBook(),{
    name:'  Fork regression  ',notes:'Honor and silence both required'
  });
  book=addMissionGoal(book,'mission-1',matrix,target(matrix,'choice','honor').id);
  book=addMissionGoal(book,'mission-1',matrix,target(matrix,'choice','silence').id);
  const review=reviewTestMissionBook(a,book,matrix);
  assert.equal(book.missions[0].name,'Fork regression');
  assert.equal(book.missions[0].goals.length,2);
  assert.deepEqual(book.missions[0].goals.map(g=>g.targetKind),['choice','choice']);
  assert.equal(review.summary.checked,0);
  assert.equal(review.missions[0].counts.narrativeVerified,2);
  assert.equal(review.missions[0].counts.manualNotRun,2);
  assert.equal(review.missions[0].status,'needs-work');
  assert.equal(JSON.stringify(a),original);
});
test('a verified hypothetical route by itself NEVER checks off hands-on gameplay',()=>{
  const {a,book,matrix}=missionWithGoal(atlas(),['honor']);
  const reviewed=reviewTestMissionBook(a,book,matrix);
  const item=reviewed.missions[0].goals[0];
  assert.equal(item.narrativeStatus,'verified');
  assert.equal(item.playtestStatus,'not-run');
  assert.equal(item.checked,false);
  assert.equal(reviewed.summary.completeMissions,0);
});
test('manual pass requires explicit actual-game confirmation and meaningful notes',()=>{
  const {a,book,matrix}=missionWithGoal(atlas(),['honor']);
  const args=['mission-1','goal-1'];
  assert.throws(()=>markMissionPhysicalTest(book,a,...args,{
    status:'passed',notes:'Played game and passed.'
  }),/Explicitly confirm/);
  assert.throws(()=>markMissionPhysicalTest(book,a,...args,{
    status:'passed',notes:'short',confirmed:true
  }),/at least eight/);
  assert.throws(()=>markMissionPhysicalTest(book,null,...args,{
    status:'passed',notes:'Real game passed this route.',confirmed:true
  }),/Load the authored world/);
  const updated=markMissionPhysicalTest(book,a,...args,{
    status:'passed',notes:'Physically played the chapter and confirmed both controls.',confirmed:true
  });
  assert.equal(book.missions[0].goals[0].physical.status,'not-run');
  const goal=updated.missions[0].goals[0];
  assert.equal(goal.physical.status,'passed');
  assert.equal(goal.physical.confirmed,true);
  assert.equal(goal.physical.worldFingerprint,fullTestWorldFingerprint(a));
  const review=reviewTestMissionBook(a,updated,matrix);
  assert.equal(review.missions[0].goals[0].playtestStatus,'passed');
  assert.equal(review.missions[0].goals[0].checked,true);
  assert.equal(review.missions[0].status,'author-checklist-complete');
  assert.match(review.warning,/self-reported author checklist/i);
  assert.match(review.missions[0].warning,/not independent release certification/);
});
test('self-reported physical pass with uncovered narrative target does not complete checklist',()=>{
  const {a,book,matrix}=missionWithGoal();
  const updated=markMissionPhysicalTest(book,a,'mission-1','goal-1',{
    status:'passed',notes:'Ran the real game and saw the Honor decision.',confirmed:true
  });
  const review=reviewTestMissionBook(a,updated,matrix);
  assert.equal(review.missions[0].goals[0].narrativeStatus,'uncovered');
  assert.equal(review.missions[0].goals[0].playtestStatus,'passed');
  assert.equal(review.missions[0].goals[0].checked,false);
  assert.equal(review.missions[0].status,'needs-work');
});
test('self-reported failed and blocked tests remain actionable, never counted complete',()=>{
  const {a,book,matrix}=missionWithGoal(atlas(),['honor']);
  for(const status of ['failed','blocked']){
    const updated=markMissionPhysicalTest(book,a,'mission-1','goal-1',{
      status,notes:'Actual gameplay route could not complete.',confirmed:true
    });
    const review=reviewTestMissionBook(a,updated,matrix);
    assert.equal(review.missions[0].goals[0].playtestStatus,status);
    assert.equal(review.missions[0].goals[0].checked,false);
    assert.equal(review.missions[0].counts['manual'+status[0].toUpperCase()+status.slice(1)],1);
  }
});
test('visual-only world editing leaves hypothetical replay verified but makes manual evidence stale',()=>{
  const {a,book}=missionWithGoal(atlas(),['honor']);
  const updated=markMissionPhysicalTest(book,a,'mission-1','goal-1',{
    status:'passed',notes:'Real physical gameplay confirmed before the art edit.',confirmed:true
  });
  const next=copy(a);next.rooms[0].scene.layers[0].opacity=.17;
  assert.equal(routeWorldFingerprint(next),routeWorldFingerprint(a));
  assert.notEqual(fullTestWorldFingerprint(next),fullTestWorldFingerprint(a));
  const latest=reviewTestMissionBook(next,updated,coverage(next,['honor']));
  const item=latest.missions[0].goals[0];
  assert.equal(item.narrativeStatus,'verified');
  assert.equal(item.playtestStatus,'stale');
  assert.equal(item.checked,false);
  assert.equal(latest.missions[0].counts.manualStale,1);
  assert.equal(updated.missions[0].goals[0].physical.status,'passed');
});
test('changed story logic invalidates both old narrative scenarios and old manual signoff',()=>{
  const {a,book}=missionWithGoal(atlas(),['honor']);
  const updated=markMissionPhysicalTest(book,a,'mission-1','goal-1',{
    status:'passed',notes:'Earlier build real gameplay completed this path.',confirmed:true
  });
  const changed=copy(a);changed.rooms[1].title='Reliquary Revised';
  const latest=reviewTestMissionBook(changed,updated,coverage(changed,['honor']));
  // A fresh scenario against new authoring can restore narrative coverage,
  // but author-reported manual testing remains stale on the edited world.
  assert.equal(latest.missions[0].goals[0].narrativeStatus,'verified');
  assert.equal(latest.missions[0].goals[0].playtestStatus,'stale');
  assert.equal(latest.summary.checked,0);
});
test('missing authoring targets and no-world state never pass with old manual notes',()=>{
  const {a,book}=missionWithGoal(atlas(),['honor']);
  const updated=markMissionPhysicalTest(book,a,'mission-1','goal-1',{
    status:'passed',notes:'Real gameplay checked on original authored story.',confirmed:true
  });
  const altered=copy(a);
  const fork=altered.rooms[1].sequences.tracks.find(t=>t.id==='forked-echo');
  fork.choices=fork.choices.filter(c=>c.id!=='honor');
  const review=reviewTestMissionBook(altered,updated,coverage(altered));
  assert.equal(review.missions[0].goals[0].narrativeStatus,'missing');
  assert.equal(review.missions[0].goals[0].checked,false);
  const noWorld=reviewTestMissionBook(null,updated,null);
  assert.equal(noWorld.missions[0].goals[0].narrativeStatus,'no-world');
  assert.equal(noWorld.missions[0].goals[0].playtestStatus,'stale');
});
test('clearing physical test result explicitly resets evidence rather than preserving pass',()=>{
  const {a,book}=missionWithGoal(atlas(),['honor']);
  const passed=markMissionPhysicalTest(book,a,'mission-1','goal-1',{
    status:'passed',notes:'Physically completed the actual game.',confirmed:true
  });
  const clear=markMissionPhysicalTest(passed,a,'mission-1','goal-1',{
    status:'not-run',notes:'ignored',confirmed:true
  });
  assert.deepEqual(clear.missions[0].goals[0].physical,{
    status:'not-run',notes:'',confirmed:false,worldFingerprint:null
  });
});
test('mission records are immutable with unique goal IDs and no duplicate target entries',()=>{
  const {a,book,matrix}=missionWithGoal();
  const copyBook=copy(book);
  assert.throws(()=>addMissionGoal(book,'mission-1',matrix,
    target(matrix,'choice','honor').id),/already in the mission/);
  assert.throws(()=>addMissionGoal(book,'missing',matrix,
    target(matrix,'choice','silence').id),/not found/);
  assert.throws(()=>addMissionGoal(book,'mission-1',matrix,'choice:nonexistent'),/does not exist/);
  const second=addMissionGoal(book,'mission-1',matrix,
    target(matrix,'choice','silence').id);
  assert.deepEqual(second.missions[0].goals.map(g=>g.id),['goal-1','goal-2']);
  const removed=removeMissionGoal(second,'mission-1','goal-1');
  assert.equal(removed.missions[0].goals.length,1);
  assert.equal(copyBook.missions[0].goals.length,1);
  assert.throws(()=>removeMissionGoal(book,'mission-1','goal-x'));
  const missing=removeTestMission(book,'mission-1');
  assert.equal(missing.missions.length,0);
  assert.throws(()=>removeTestMission(book,'missing'));
  assert.equal(a.rooms.length,2);
});
test('mission limits are enforced and empty missions are NEVER complete',()=>{
  const a=atlas(),matrix=coverage(a);
  let book=createTestMissionBook();
  for(let i=0;i<MAX_TEST_MISSIONS;i++)
    book=addTestMission(book,{name:'Mission '+i});
  assert.equal(book.missions.length,8);
  assert.throws(()=>addTestMission(book,{name:'Ninth mission'}),/Eight test missions/);
  assert.equal(reviewTestMissionBook(a,book,matrix).summary.completeMissions,0);
  assert.equal(reviewTestMissionBook(a,book,matrix).summary.remainingMissions,8);
  let goals=createTestMissionBook();
  goals=addTestMission(goals,{name:'All targets'});
  for(const row of matrix.rows.slice(0,16))
    goals=addMissionGoal(goals,'mission-1',matrix,row.id);
  assert.equal(goals.missions[0].goals.length,16);
  assert.throws(()=>addMissionGoal(goals,'mission-1',matrix,matrix.rows[16].id),
    /up to 16 goals/);
  assert.throws(()=>addTestMission(goals,{name:''}),/name/);
});
test('tampered and malformed field-test books fail closed',()=>{
  const {a,book}=missionWithGoal();
  const forged=copy(book);forged.missions[0].goals[0].physical={
    status:'passed',notes:'Fake successful gameplay',confirmed:false,
    worldFingerprint:fullTestWorldFingerprint(a)
  };
  assert.throws(()=>validateTestMissionBook(forged),/explicit acknowledgement/);
  const short=copy(forged);
  short.missions[0].goals[0].physical.confirmed=true;
  short.missions[0].goals[0].physical.notes='short';
  assert.throws(()=>validateTestMissionBook(short),/explicit acknowledgement/);
  const corrupt=copy(book);
  corrupt.missions[0].goals[0].physical.status='super-approved';
  assert.throws(()=>validateTestMissionBook(corrupt),/Invalid or duplicate/);
  const dup=copy(book);
  dup.missions[0].goals.push(copy(dup.missions[0].goals[0]));
  assert.throws(()=>validateTestMissionBook(dup),/duplicate/);
  const oversized=copy(book);
  oversized.junk='X'.repeat(160001);
  assert.throws(()=>validateTestMissionBook(oversized),/160 KB/);
  assert.throws(()=>validateTestMissionBook({schema:'wrong',missions:[]}));
  assert.throws(()=>markMissionPhysicalTest(book,a,'mission-1','goal-1',{
    status:'certified',notes:'Completed this physical test',confirmed:true
  }),/Unknown manual/);
});
test('mission result labels stay separate from scenario receipts with no implicit local file mutation',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const module=readFileSync(new URL('../layer-studio/story-test-missions.js',import.meta.url),'utf8');
  for(const id of ['testMissionName','testMissionNotes','testMissionCreate',
    'testMissionSelect','testMissionRemove','testMissionExport','testMissionTarget',
    'testMissionAddGoal','testMissionSummary','testMissionGoals'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(studio,/localStorage\.setItem\(TEST_MISSIONS_KEY/);
  assert.match(studio,/markMissionPhysicalTest/);
  assert.match(studio,/reviewTestMissionBook/);
  assert.match(studio,/confirmed:ack\.checked/);
  assert.match(studio,/author-reported/);
  assert.match(studio,/routeFileDownload\('pixelforge-authoring-test-missions\.json'/);
  assert.doesNotMatch(module,/localStorage|sessionStorage|fetch\(|eval\(|document\.|innerHTML/);
  assert.match(module,/fullTestWorldFingerprint/);
});
