import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {makeStarterAtlas} from '../layer-studio/room-atlas.js';
import {createStoryPathRun,advanceStoryPath} from '../layer-studio/story-path-simulator.js';
import {createScenarioCatalog,addScenario} from '../layer-studio/story-scenario-catalog.js';
import {analyzeRouteCoverage} from '../layer-studio/story-route-coverage.js';
import {
  SCENARIO_RECOMMENDATIONS_SCHEMA,MAX_EXACT_SCENARIOS,
  minimumScenarioSet,recommendScenarioTargets,analyzeScenarioRecommendations,
  suggestScenariosFromAtlas
} from '../layer-studio/story-scenario-recommendations.js';

const copy=value=>JSON.parse(JSON.stringify(value));
function atlas(){
  const scene=createScene();scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene).atlas;
}
function step(a,state,action){
  const r=advanceStoryPath(a,state,action);
  assert.equal(r.ok,true,r.reason||JSON.stringify(action));
  return r.state;
}
function path(a,answer='honor',complete=true){
  let state=createStoryPathRun(a);
  for(const action of [
    {type:'discover',trackId:'the-stone-archive'},
    {type:'assumeGates',value:true},
    {type:'travel',portalId:'vault-to-reliquary'},
    {type:'discover',trackId:'forked-echo',choiceId:answer},
    ...(complete?[{type:'discover',trackId:answer==='honor'?'promise-path':'silence-path'}]:[])
  ])state=step(a,state,action);
  return state;
}
function scenarioSet(a,values=['honor','silence']){
  let catalog=createScenarioCatalog();
  for(const value of values){
    catalog=addScenario(catalog,a,path(a,value),{
      name:value+' route',notes:'hypothetical only'
    });
  }
  return catalog;
}
function synthetic(specs,rows){
  const scenarios=specs.map((x,i)=>({
    id:'scenario-'+(i+1),name:x.name||'S'+(i+1),
    stepCount:x.steps||1,status:x.status||'verified'
  }));
  return {scenarios,rows:rows.map((ids,i)=>({
    id:'target-'+i,kind:'choice',label:'Choice '+i,
    status:ids.length?'verified':'uncovered',roomId:'room-1',
    cells:scenarios.map(s=>({scenarioId:s.id,
      status:ids.includes(s.id)?'verified':'uncovered'})),
    verifiedBy:ids
  }))};
}
test('empty catalog selects zero scenarios and recommends untested authored choices',()=>{
  const a=atlas(),before=JSON.stringify(a);
  const report=analyzeRouteCoverage(a,createScenarioCatalog());
  const result=analyzeScenarioRecommendations(report);
  assert.equal(result.schema,SCENARIO_RECOMMENDATIONS_SCHEMA);
  assert.equal(result.minimum.selectedCount,0);
  assert.equal(result.minimum.eligibleCount,0);
  assert.equal(result.minimum.verifiedTargetsPreserved,0);
  assert.equal(result.summary.uncoveredTargets,report.rows.length);
  assert.equal(result.nextTargets[0].kind,'choice');
  assert.ok(result.nextTargets.some(x=>x.id.includes('silence')));
  assert.match(result.caution,/HYPOTHETICAL/);
  assert.equal(JSON.stringify(a),before);
});
test('two exclusive Forked Echo routes both remain necessary for distinct choices',()=>{
  const a=atlas(),catalog=scenarioSet(a),before=JSON.stringify(catalog);
  const coverage=analyzeRouteCoverage(a,catalog);
  const out=analyzeScenarioRecommendations(coverage);
  assert.equal(out.minimum.selectedCount,2);
  assert.deepEqual(out.minimum.selectedIds,['scenario-1','scenario-2']);
  assert.equal(out.minimum.verifiedTargetsPreserved,coverage.summary.verified);
  assert.equal(out.minimum.remainingUncoveredTargets,coverage.summary.uncovered);
  assert.equal(out.minimum.scenarios.every(x=>x.disposition==='keep'),true);
  assert.ok(out.minimum.scenarios.every(x=>x.uniqueTargetCount>0));
  assert.ok(out.nextTargets.some(x=>x.kind==='source'));
  assert.equal(JSON.stringify(catalog),before);
});
test('duplicate verified routes are omitted without deleting catalog entries',()=>{
  const a=atlas(),catalog=scenarioSet(a,['honor','honor','silence']);
  const result=analyzeScenarioRecommendations(analyzeRouteCoverage(a,catalog));
  assert.equal(result.minimum.eligibleCount,3);
  assert.equal(result.minimum.selectedCount,2);
  assert.equal(result.minimum.omittedCount,1);
  assert.deepEqual(result.minimum.selectedIds,['scenario-1','scenario-3']);
  assert.equal(result.minimum.scenarios.find(x=>x.id==='scenario-2').disposition,'overlap');
  assert.equal(catalog.scenarios.length,3);
});
test('minimum really minimizes number of cases even when several shorter routes exist',()=>{
  const c=synthetic([
    {name:'single combined case',steps:20},
    {name:'only first target',steps:1},
    {name:'only second target',steps:1}
  ],[
    ['scenario-1','scenario-2'],['scenario-1','scenario-3']
  ]);
  const r=minimumScenarioSet(c);
  assert.equal(r.algorithm,'exact-minimum-cardinality-then-fewest-steps');
  assert.deepEqual(r.selectedIds,['scenario-1']);
  assert.equal(r.selectedTotalSteps,20);
  assert.equal(r.omittedCount,2);
});
test('equal-cardinality exact solutions prefer fewer total simulator steps',()=>{
  const c=synthetic([
    {name:'long shared case',steps:20},
    {name:'short pair A',steps:3},
    {name:'short pair B',steps:4}
  ],[
    ['scenario-1','scenario-2'],
    ['scenario-1','scenario-3'],
    ['scenario-2','scenario-3']
  ]);
  const r=minimumScenarioSet(c);
  assert.equal(r.selectedCount,2);
  assert.deepEqual(r.selectedIds,['scenario-2','scenario-3']);
  assert.equal(r.selectedTotalSteps,7);
  assert.equal(r.verifiedTargetsPreserved,3);
});
test('exact search solves counterexample to greedy largest-first selection',()=>{
  // Greedy initially takes A (4 rows), then needs B+C; B+C alone cover all 6.
  const c=synthetic([
    {name:'A tempting four',steps:1},
    {name:'B necessary three',steps:2},
    {name:'C necessary three',steps:2}
  ],[
    ['scenario-1','scenario-2'],
    ['scenario-1','scenario-2'],
    ['scenario-1','scenario-3'],
    ['scenario-1','scenario-3'],
    ['scenario-2'],
    ['scenario-3']
  ]);
  const r=minimumScenarioSet(c);
  assert.deepEqual(r.selectedIds,['scenario-2','scenario-3']);
  assert.equal(r.selectedCount,2);
});
test('expired and invalid receipts cannot contribute to optimized verified coverage',()=>{
  const old=atlas(),catalog=scenarioSet(old,['honor','silence']);
  const changed=copy(old);changed.rooms[1].title='Reliquary Remixed';
  const report=analyzeRouteCoverage(changed,catalog);
  const result=analyzeScenarioRecommendations(report);
  assert.equal(result.minimum.eligibleCount,0);
  assert.equal(result.minimum.selectedCount,0);
  assert.equal(result.minimum.excludedCount,2);
  assert.equal(result.minimum.verifiedTargetsPreserved,0);
  assert.ok(result.nextTargets.some(x=>x.status==='needs-review'));
  assert.ok(result.minimum.scenarios.every(x=>x.disposition==='not-verified'));
});
test('verified and stale scenarios coexist without stale cases helping cover gaps',()=>{
  const old=atlas(),oldCat=scenarioSet(old,['silence']);
  const changed=copy(old);changed.rooms[1].title='New Reliquary';
  const current=addScenario(createScenarioCatalog(),changed,path(changed,'honor'),
    {name:'Fresh Honor'});
  const mixed={...current,scenarios:[...current.scenarios,
    {...oldCat.scenarios[0],id:'scenario-2'}]};
  const report=analyzeRouteCoverage(changed,mixed);
  const result=minimumScenarioSet(report);
  assert.deepEqual(result.selectedIds,['scenario-1']);
  assert.equal(result.excludedCount,1);
  assert.equal(result.verifiedTargetsPreserved,report.summary.verified);
  const stale=result.scenarios.find(x=>x.id==='scenario-2');
  assert.equal(stale.disposition,'not-verified');
});
test('priority recommendations rank missing choice outcomes and respect limit and review gaps',()=>{
  const a=atlas(),c=scenarioSet(a,['honor']);
  const r=analyzeRouteCoverage(a,c);
  const items=recommendScenarioTargets(r,{limit:4});
  assert.equal(items.length,4);
  assert.equal(items[0].kind,'choice');
  assert.equal(items[0].status,'uncovered');
  assert.match(items[0].reason,/exact authored answer/);
  assert.ok(items[0].suggestedName.startsWith('Coverage / '));
  assert.ok(items[0].id.includes('silence'));
  assert.equal(recommendScenarioTargets(r,{limit:0}).length,0);
  assert.ok(recommendScenarioTargets(r,{limit:500}).length<=24);
  assert.deepEqual(recommendScenarioTargets(null),[]);
});
test('a route recommendation is never automatically applied or saved',()=>{
  const a=atlas(),catalog=scenarioSet(a,['honor']);
  const before=JSON.stringify(catalog);
  const report=suggestScenariosFromAtlas(a,catalog);
  assert.equal(report.minimum.selectedCount,1);
  assert.equal(report.nextTargets.some(item=>item.id.includes('silence')),true);
  assert.equal(JSON.stringify(catalog),before);
  assert.equal('game' in report,false);
});
test('bad matrix input and more than 16 verified cases fail closed',()=>{
  assert.throws(()=>minimumScenarioSet(null),/Coverage Matrix/);
  const fake=synthetic(Array(17).fill({steps:1}),[['scenario-1']]);
  assert.throws(()=>minimumScenarioSet(fake),/16 verified scenarios/);
  const broken=synthetic([{steps:1}], [['scenario-1']]);
  broken.rows[0].cells[0].status='uncovered';
  assert.throws(()=>minimumScenarioSet(broken),/no verified scenario evidence/);
});
test('encoded choice targets remain safe and heuristic ordering is deterministic',()=>{
  const a=atlas(),changed=copy(a);
  changed.rooms[0].sequences.tracks.push({
    id:'gate:echo',title:'A new fork',once:true,
    completionFlag:'decision:done',beats:[{title:'Decision',seconds:1}],
    choices:[{id:'x:y',label:'A • B',setFlag:'a:b'}]
  });
  const coverage=analyzeRouteCoverage(changed,createScenarioCatalog());
  const first=analyzeScenarioRecommendations(coverage);
  const second=analyzeScenarioRecommendations(coverage);
  assert.deepEqual(first,second);
  assert.ok(first.nextTargets.some(x=>x.id.includes('x%3Ay')));
  assert.ok(first.nextTargets.every(x=>typeof x.reason==='string'));
});
test('Rung 20 UI shows exact subset and hands targets to existing guided planner',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const editor=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const analyzer=readFileSync(new URL('../layer-studio/story-scenario-recommendations.js',import.meta.url),'utf8');
  for(const id of ['storyRecoSummary','storyRecoExport','storyRecoSelected',
    'storyRecoGaps','storyRecoNote'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(editor,/renderScenarioRecommendations\(atlas,report\)/);
  assert.match(editor,/analyzeScenarioRecommendations/);
  assert.match(editor,/storyGuideTarget/);
  assert.match(editor,/storyGuideFind'\)\.click\(\)/);
  assert.match(editor,/storyRecoExport/);
  assert.match(editor,/routeFileDownload\('pixelforge-scenario-recommendations\.json'/);
  assert.match(editor,/textContent=item\.name/);
  assert.doesNotMatch(analyzer,/localStorage|sessionStorage|fetch\(|eval\(|document\.|innerHTML/);
});
