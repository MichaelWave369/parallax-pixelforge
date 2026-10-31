import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {makeStarterAtlas} from '../layer-studio/room-atlas.js';
import {createStoryPathRun,advanceStoryPath} from '../layer-studio/story-path-simulator.js';
import {
  SCENARIO_CATALOG_SCHEMA,SCENARIO_CATALOG_KEY,MAX_SCENARIOS,
  createScenarioCatalog,validateScenarioCatalog,addScenario,removeScenario,
  renameScenario,mergeScenarioCatalog,reviewScenario,reviewScenarioCatalog,
  loadVerifiedScenario
} from '../layer-studio/story-scenario-catalog.js';
import {createRouteReport,verifyRouteReport} from '../layer-studio/story-path-reports.js';

function atlas(){
  const scene=createScene();scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene).atlas;
}
const copy=x=>JSON.parse(JSON.stringify(x));
function step(world,state,action){
  const out=advanceStoryPath(world,state,action);
  assert.equal(out.ok,true,out.reason||JSON.stringify(action));
  return out.state;
}
function path(world,answer='honor',finish=true){
  let s=createStoryPathRun(world);
  for(const a of [
    {type:'discover',trackId:'the-stone-archive'},
    {type:'assumeGates',value:true},
    {type:'travel',portalId:'vault-to-reliquary'},
    {type:'discover',trackId:'forked-echo',choiceId:answer},
    ...(finish?[{type:'discover',trackId:answer==='honor'?'promise-path':'silence-path'}]:[])
  ])s=step(world,s,a);
  return s;
}
function saved(world=atlas(),answer='honor'){
  const run=path(world,answer);
  const catalog=addScenario(createScenarioCatalog(),world,run,
    {name:answer+' branch',notes:'Expect only the selected fork to unlock.'});
  return {world,run,catalog,entry:catalog.scenarios[0]};
}
test('a catalog starts empty with a schema separate from game saves and route reports',()=>{
  assert.deepEqual(createScenarioCatalog(),{
    schema:SCENARIO_CATALOG_SCHEMA,scenarios:[]
  });
  assert.equal(SCENARIO_CATALOG_KEY,'pixelforge.layer-scenario-catalog.v1.local');
  assert.notEqual(SCENARIO_CATALOG_KEY,'pixelforge.layer-scene.v1.local');
  assert.notEqual(SCENARIO_CATALOG_SCHEMA,'pixelforge.layer-route-report.v1');
  assert.equal(MAX_SCENARIOS,16);
});
test('save two named hypothetical fork outcomes as separate reusable regression scenarios',()=>{
  const world=atlas(),before=JSON.stringify(world);
  const a=path(world,'honor'),b=path(world,'silence');
  let catalog=createScenarioCatalog();
  catalog=addScenario(catalog,world,a,{name:'Honor path',notes:'Expect kept promise'});
  catalog=addScenario(catalog,world,b,{name:'Silence path',notes:'Expect hushed chamber'});
  assert.deepEqual(catalog.scenarios.map(x=>x.id),['scenario-1','scenario-2']);
  assert.deepEqual(catalog.scenarios.map(x=>x.name),['Honor path','Silence path']);
  assert.equal(catalog.scenarios[0].report.steps.length,5);
  assert.equal(catalog.scenarios[1].report.steps[3].action.choiceId,'silence');
  assert.equal(verifyRouteReport(world,catalog.scenarios[0].report).ok,true);
  assert.equal(verifyRouteReport(world,catalog.scenarios[1].report).ok,true);
  const summary=reviewScenarioCatalog(world,catalog);
  assert.equal(summary.total,2);
  assert.equal(summary.counts.verified,2);
  assert.equal(summary.entries.every(e=>e.review.status==='verified'),true);
  assert.equal(JSON.stringify(world),before);
  assert.equal('snapshots' in catalog,false);
});
test('load a verified scenario into simulator only, including reversible history',()=>{
  const {world,run,entry}=saved();
  const loaded=loadVerifiedScenario(world,entry);
  assert.notEqual(loaded,run);
  assert.deepEqual(loaded.flags,run.flags);
  assert.equal(loaded.roomId,'reliquary');
  assert.equal(loaded.history.length,run.history.length);
  const undone=step(world,loaded,{type:'undo'});
  assert.equal(undone.flags.includes('promise-kept'),false);
  assert.equal(undone.flags.includes('echo-honored'),true);
});
test('editing unrelated art does not invalidate scenario verification',()=>{
  const {world,entry}=saved();
  const updated=copy(world);
  updated.rooms[0].scene.camera.x=88;
  updated.rooms[0].scene.layers[0].opacity=.18;
  assert.equal(reviewScenario(updated,entry).status,'verified');
});
test('changed story metadata makes an otherwise replayable scenario need review, never green',()=>{
  const {world,entry}=saved();
  const changed=copy(world);
  changed.rooms[1].title='New Reliquary Title';
  const status=reviewScenario(changed,entry);
  assert.equal(status.status,'needs-review');
  assert.match(status.message,/Retest|retesting/i);
  assert.throws(()=>loadVerifiedScenario(changed,entry),/Only verified scenarios/);
});
test('changed world with changed final blocked options requires review',()=>{
  const {world,entry}=saved();
  const changed=copy(world);
  changed.rooms[1].sequences.tracks.push({
    id:'new-mystery',title:'New Mystery',x:300,y:390,w:100,h:100,
    requiresFlag:'missing-flag',completionFlag:'new-mystery-done',
    beats:[{title:'Mystery',text:'Unopened',seconds:2}],once:true,choices:[]
  });
  const status=reviewScenario(changed,entry);
  assert.equal(status.status,'needs-review');
  assert.equal(status.blockersChanged,true);
});
test('changing earned completion reward results in outcome-changed, with actual and expected flags',()=>{
  const {world,entry}=saved();
  const changed=copy(world);
  changed.rooms[1].sequences.tracks.find(t=>t.id==='promise-path')
    .completionFlag='promise-renewed';
  const status=reviewScenario(changed,entry);
  assert.equal(status.status,'outcome-changed');
  assert.ok(status.expectedFlags.includes('promise-kept'));
  assert.ok(status.actualFlags.includes('promise-renewed'));
  assert.ok(!status.actualFlags.includes('promise-kept'));
  assert.throws(()=>loadVerifiedScenario(changed,entry));
});
test('changing a prerequisite can block an old scenario at the exact first failed step',()=>{
  const {world,entry}=saved();
  const changed=copy(world);
  changed.rooms[1].sequences.tracks.find(t=>t.id==='forked-echo')
    .requiresFlag='never-earned';
  const status=reviewScenario(changed,entry);
  assert.equal(status.status,'blocked');
  assert.equal(status.firstBlockedStep,4);
  assert.match(status.message,/Step 4/);
});
test('tampering with a stored route on the same topology is invalid, not verified',()=>{
  const {world,entry}=saved();
  const forged=copy(entry);
  forged.report.final.flags.push('echo-silenced');
  assert.equal(reviewScenario(world,forged).status,'invalid');
  assert.equal(reviewScenario(world,{report:null}).status,'invalid');
});
test('rename and remove are immutable and reject unknown scenario IDs',()=>{
  const {catalog}=saved();
  const revised=renameScenario(catalog,'scenario-1',
    {name:'  Updated Honor  ',notes:'Regression after visual polish'});
  assert.equal(revised.scenarios[0].name,'Updated Honor');
  assert.equal(revised.scenarios[0].notes,'Regression after visual polish');
  assert.equal(catalog.scenarios[0].name,'honor branch');
  const blank=removeScenario(revised,'scenario-1');
  assert.equal(blank.scenarios.length,0);
  assert.equal(catalog.scenarios.length,1);
  assert.throws(()=>renameScenario(catalog,'scenario-x',{name:'bad',notes:''}));
  assert.throws(()=>removeScenario(catalog,'scenario-x'));
  assert.throws(()=>renameScenario(catalog,'scenario-1',{name:'  ',notes:''}));
});
test('portable catalog import merges without duplicate IDs or exact repeated scenarios',()=>{
  const world=atlas();
  const first=addScenario(createScenarioCatalog(),world,path(world,'honor'),
    {name:'Honor',notes:''});
  const second=addScenario(createScenarioCatalog(),world,path(world,'silence'),
    {name:'Silence',notes:''});
  assert.equal(first.scenarios[0].id,'scenario-1');
  assert.equal(second.scenarios[0].id,'scenario-1');
  const merged=mergeScenarioCatalog(first,second);
  assert.equal(merged.imported,1);
  assert.equal(merged.skipped,0);
  assert.deepEqual(merged.catalog.scenarios.map(s=>s.id),['scenario-1','scenario-2']);
  assert.equal(merged.catalog.scenarios[1].report.steps[3].action.choiceId,'silence');
  const again=mergeScenarioCatalog(merged.catalog,second);
  assert.equal(again.imported,0);
  assert.equal(again.skipped,1);
  assert.equal(again.catalog.scenarios.length,2);
  assert.equal(reviewScenarioCatalog(world,merged.catalog).counts.verified,2);
});
test('catalog bounds reject oversized, malformed and duplicate entries',()=>{
  const {world,run,catalog}=saved();
  assert.throws(()=>addScenario(catalog,world,run,{name:'   '}),/name/);
  const duplicated=copy(catalog);
  duplicated.scenarios.push(copy(duplicated.scenarios[0]));
  assert.throws(()=>validateScenarioCatalog(duplicated),/duplicate/);
  assert.throws(()=>validateScenarioCatalog({schema:'legacy',scenarios:[]}),/Unsupported/);
  const invalid=copy(catalog);
  invalid.scenarios[0].report.schema='javascript:fake';
  assert.throws(()=>validateScenarioCatalog(invalid),/Invalid scenario route report/);
  const long=copy(catalog);
  long.scenarios[0].notes='X'.repeat(300);
  assert.throws(()=>validateScenarioCatalog(long));
  const overly=copy(catalog);
  overly.scenarios[0].report.steps=Array(65).fill({action:{type:'reset'}});
  assert.throws(()=>validateScenarioCatalog(overly));
  const huge=copy(catalog);
  huge.scenarios[0].report.extra='Y'.repeat(900100);
  assert.throws(()=>validateScenarioCatalog(huge),/900 KB/);
});
test('catalog caps entries at 16 without changing existing receipts',()=>{
  const world=atlas(),run=createStoryPathRun(world);
  let catalog=createScenarioCatalog();
  for(let i=0;i<16;i++){
    catalog=addScenario(catalog,world,run,{name:'Scenario '+i});
  }
  assert.equal(catalog.scenarios.length,16);
  assert.throws(()=>addScenario(catalog,world,run,{name:'Scenario 17'}),/full/);
  const imported=createScenarioCatalog();
  imported.scenarios.push(...catalog.scenarios);
  assert.throws(()=>mergeScenarioCatalog(catalog,addScenario(
    createScenarioCatalog(),world,run,{name:'Another scenario'})),/16 scenarios/);
});
test('legacy worlds and empty catalogs remain safe',()=>{
  const world=atlas();
  for(const room of world.rooms)delete room.sequences;
  const run=createStoryPathRun(world);
  const catalog=addScenario(createScenarioCatalog(),world,run,
    {name:'Empty legacy regression'});
  assert.equal(reviewScenarioCatalog(world,catalog).counts.verified,1);
  assert.equal(reviewScenarioCatalog(null,catalog).counts['no-world'],1);
  assert.equal(reviewScenarioCatalog(world,createScenarioCatalog()).total,0);
});
test('tests and Studio wire the catalog without reusing Adventure Journal storage',()=>{
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const editor=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const module=readFileSync(new URL('../layer-studio/story-scenario-catalog.js',import.meta.url),'utf8');
  for(const id of ['storyCatalogName','storyCatalogNotes','storyCatalogSave',
    'storyCatalogExport','storyCatalogFile','storyCatalogImport',
    'storyCatalogStatus','storyCatalogList'])
    assert.match(editor,new RegExp('id="'+id+'"'));
  assert.match(studio,/localStorage\.setItem\(SCENARIO_CATALOG_KEY/);
  assert.match(studio,/renderStoryCatalog/);
  assert.match(studio,/loadVerifiedScenario/);
  assert.match(studio,/mergeScenarioCatalog/);
  assert.match(studio,/routeFileDownload/);
  assert.doesNotMatch(module,/localStorage|sessionStorage|fetch\(|eval\(|document\.|innerHTML/);
  assert.match(module,/Only verified scenarios can load/);
});
