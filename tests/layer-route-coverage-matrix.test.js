import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {makeStarterAtlas} from '../layer-studio/room-atlas.js';
import {createStoryPathRun,advanceStoryPath} from '../layer-studio/story-path-simulator.js';
import {
  createScenarioCatalog,addScenario
} from '../layer-studio/story-scenario-catalog.js';
import {
  ROUTE_COVERAGE_SCHEMA,COVERAGE_KINDS,analyzeRouteCoverage,filterRouteCoverage
} from '../layer-studio/story-route-coverage.js';

function atlas(){
  const scene=createScene();scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene).atlas;
}
const copy=x=>JSON.parse(JSON.stringify(x));
function step(a,s,action){
  const next=advanceStoryPath(a,s,action);
  assert.equal(next.ok,true,next.reason||JSON.stringify(action));
  return next.state;
}
function route(a,choice='honor',{finish=true,source=false}={}){
  let s=createStoryPathRun(a);
  for(const action of [
    {type:'discover',trackId:'the-stone-archive'},
    {type:'assumeGates',value:true},
    {type:'travel',portalId:'vault-to-reliquary'},
    {type:'discover',trackId:'forked-echo',choiceId:choice},
    ...(finish?[{type:'discover',trackId:choice==='honor'?'promise-path':'silence-path'}]:[]),
    ...(source?[{type:'source',sourceId:'dialogue:keeper-choice:restore'}]:[])
  ])s=step(a,s,action);
  return s;
}
function catalog(a,choices=['honor']){
  let c=createScenarioCatalog();
  for(const choice of choices){
    c=addScenario(c,a,route(a,choice),{name:choice+' route',notes:'Hypothetical'});
  }
  return c;
}
const row=(r,kind,fragment)=>r.rows.find(x=>x.kind===kind&&x.id.includes(fragment));
test('coverage starts with all authored targets uncovered when no scenarios exist',()=>{
  const a=atlas(),original=JSON.stringify(a);
  const r=analyzeRouteCoverage(a,createScenarioCatalog());
  assert.equal(r.schema,ROUTE_COVERAGE_SCHEMA);
  assert.equal(r.reportType,'hypothetical-story-route-coverage');
  assert.equal(r.summary.verified,0);
  assert.equal(r.summary.needsReview,0);
  assert.equal(r.summary.uncovered,r.summary.targets);
  assert.equal(r.summary.coveragePercent,0);
  assert.equal(r.scenarios.length,0);
  assert.equal(r.rows.length,r.summary.targets);
  assert.equal(r.dimensions.length,COVERAGE_KINDS.length);
  for(const kind of COVERAGE_KINDS){
    assert.ok(r.dimensions.some(d=>d.kind===kind.id));
  }
  assert.deepEqual(r.rows.find(x=>x.kind==='room').cells,[]);
  assert.equal(JSON.stringify(a),original);
});
test('honor route covers actual rooms, visited passage, chosen branch, flags and tracks',()=>{
  const a=atlas(),original=JSON.stringify(a),c=catalog(a,['honor']);
  const report=analyzeRouteCoverage(a,c);
  assert.equal(report.summary.verifiedScenarios,1);
  assert.equal(report.scenarios[0].status,'verified');
  const room=row(report,'room','reliquary');
  const archive=row(report,'discovery','the-stone-archive');
  const fork=row(report,'discovery','forked-echo');
  const honored=row(report,'choice','honor');
  const silence=row(report,'choice','silence');
  const kept=row(report,'discovery','promise-path');
  const hushed=row(report,'discovery','silence-path');
  const flag=row(report,'flag','echo-honored');
  const gate=row(report,'portal','vault-to-reliquary');
  for(const target of [room,archive,fork,honored,kept,flag,gate])
    assert.equal(target.status,'verified',target.id);
  for(const target of [silence,hushed])
    assert.equal(target.status,'uncovered',target.id);
  assert.deepEqual(honored.verifiedBy,[c.scenarios[0].id]);
  assert.equal(gate.cells[0].assumed,true);
  assert.match(report.warning,/no physical gameplay/i);
  assert.equal(JSON.stringify(a),original);
});
test('the opposite branch is uncovered until a second separately verified scenario is saved',()=>{
  const a=atlas();
  const one=analyzeRouteCoverage(a,catalog(a,['honor']));
  const both=analyzeRouteCoverage(a,catalog(a,['honor','silence']));
  assert.equal(one.scenarios.length,1);
  assert.equal(both.scenarios.length,2);
  assert.ok(both.summary.verified>one.summary.verified);
  const honored=row(both,'choice','honor'),silence=row(both,'choice','silence');
  assert.equal(honored.status,'verified');
  assert.equal(silence.status,'verified');
  assert.deepEqual(honored.cells.map(x=>x.status),['verified','uncovered']);
  assert.deepEqual(silence.cells.map(x=>x.status),['uncovered','verified']);
  assert.equal(both.summary.uncovered>0,true);
  assert.ok(both.rows.some(x=>x.kind==='flag'&&x.label==='reliquary-lit'&&x.status==='uncovered'));
  assert.ok(both.rows.every(x=>x.cells.length===2));
});
test('a changed world does not allow stale scenarios to make any target green',()=>{
  const old=atlas(),c=catalog(old,['honor']),updated=copy(old);
  updated.rooms[1].title='Reliquary Revamped';
  const result=analyzeRouteCoverage(updated,c);
  assert.equal(result.summary.verifiedScenarios,0);
  assert.equal(result.summary.nonverifiedScenarios,1);
  assert.equal(result.summary.verified,0);
  assert.ok(result.summary.needsReview>0);
  assert.equal(row(result,'choice','honor').status,'needs-review');
  assert.equal(row(result,'choice','silence').status,'uncovered');
  assert.deepEqual(row(result,'choice','honor').verifiedBy,[]);
});
test('a blocked replay only marks historical evidence before the first failing step',()=>{
  const old=atlas(),c=catalog(old,['honor']),updated=copy(old);
  updated.rooms[1].sequences.tracks.find(t=>t.id==='forked-echo')
    .requiresFlag='missing-new-prerequisite';
  const r=analyzeRouteCoverage(updated,c);
  assert.equal(r.scenarios[0].status,'blocked');
  assert.equal(row(r,'discovery','the-stone-archive').status,'needs-review');
  assert.equal(row(r,'room','reliquary').status,'needs-review');
  assert.equal(row(r,'discovery','forked-echo').status,'uncovered');
  assert.equal(row(r,'choice','honor').status,'uncovered');
  assert.equal(row(r,'flag','echo-honored').status,'uncovered');
});
test('invalid/forged receipts never contribute either verified or historical coverage',()=>{
  const a=atlas(),c=catalog(a,['honor']);
  const corrupt=copy(c);
  corrupt.scenarios[0].report.final.flags.push('echo-silenced');
  const r=analyzeRouteCoverage(a,corrupt);
  assert.equal(r.scenarios[0].status,'invalid');
  assert.equal(r.summary.verified,0);
  assert.equal(r.summary.needsReview,0);
  assert.equal(r.summary.uncovered,r.summary.targets);
});
test('a mixed catalog credits verified routes and isolates historical rows needing review',()=>{
  const old=atlas(),c=catalog(old,['honor','silence']);
  const changed=copy(old);
  changed.rooms[1].title='Revised Reliquary';
  // Build one verified scenario against the changed world, retain older cases.
  const newest=addScenario(createScenarioCatalog(),changed,route(changed,'honor'),
    {name:'fresh honor'});
  const mixed={...newest,scenarios:[...newest.scenarios,
    {...c.scenarios[1],id:'scenario-2'}]};
  const result=analyzeRouteCoverage(changed,mixed);
  assert.equal(result.summary.verifiedScenarios,1);
  assert.equal(result.summary.nonverifiedScenarios,1);
  assert.equal(row(result,'choice','honor').status,'verified');
  assert.equal(row(result,'choice','silence').status,'needs-review');
  assert.deepEqual(row(result,'choice','honor').cells.map(x=>x.status),
    ['verified','uncovered']);
  assert.deepEqual(row(result,'choice','silence').cells.map(x=>x.status),
    ['uncovered','needs-review']);
});
test('source assumptions never count as real player actions and remain marked assumed',()=>{
  const a=atlas(),run=route(a,'honor',{source:true});
  const saved=addScenario(createScenarioCatalog(),a,run,{name:'Keeper assumption'});
  const result=analyzeRouteCoverage(a,saved);
  const source=result.rows.find(x=>x.kind==='source'&&x.id.includes('keeper-choice'));
  assert.ok(source);
  assert.equal(source.status,'verified');
  assert.equal(source.cells[0].assumed,true);
  assert.equal(row(result,'flag','reliquary-lit').status,'verified');
  assert.equal(row(result,'source','ash-warden').status,'uncovered');
});
test('portal passage coverage is distinct from simply having its gate flag',()=>{
  const a=atlas();let s=createStoryPathRun(a);
  s=step(a,s,{type:'discover',trackId:'the-stone-archive'});
  const c=addScenario(createScenarioCatalog(),a,s,{name:'Archive only'});
  const report=analyzeRouteCoverage(a,c);
  assert.equal(row(report,'flag','archive-revealed').status,'verified');
  assert.equal(row(report,'portal','vault-to-reliquary').status,'uncovered');
  assert.equal(row(report,'room','reliquary').status,'uncovered');
});
test('undo history excludes abandoned alternatives from coverage targets',()=>{
  const a=atlas();let s=route(a,'honor',{finish:false});
  s=step(a,s,{type:'undo'});
  s=step(a,s,{type:'discover',trackId:'forked-echo',choiceId:'silence'});
  const c=addScenario(createScenarioCatalog(),a,s,{name:'Undo then silence'});
  const report=analyzeRouteCoverage(a,c);
  assert.equal(row(report,'choice','honor').status,'uncovered');
  assert.equal(row(report,'choice','silence').status,'verified');
  assert.equal(row(report,'flag','echo-honored').status,'uncovered');
});
test('dimension totals and overall totals agree with row statuses',()=>{
  const a=atlas(),r=analyzeRouteCoverage(a,catalog(a,['honor','silence']));
  assert.equal(r.dimensions.reduce((sum,x)=>sum+x.total,0),r.summary.targets);
  assert.equal(r.dimensions.reduce((sum,x)=>sum+x.verified,0),r.summary.verified);
  assert.equal(r.dimensions.reduce((sum,x)=>sum+x.needsReview,0),r.summary.needsReview);
  assert.equal(r.summary.verified+r.summary.needsReview+r.summary.uncovered,
    r.summary.targets);
  assert.ok(r.summary.coveragePercent>=0&&r.summary.coveragePercent<=100);
  assert.deepEqual(filterRouteCoverage(r,{kind:'choice',status:'uncovered'})
    .every(x=>x.kind==='choice'&&x.status==='uncovered'),true);
  assert.equal(filterRouteCoverage(r,{kind:'bogus'}).length,0);
  assert.deepEqual(filterRouteCoverage(null),[]);
});
test('room IDs and choice IDs containing colons remain collision-safe',()=>{
  const a=atlas(),altered=copy(a);
  const r=altered.rooms[0];
  r.sequences.tracks.push({
    id:'deep:echo',title:'Deep Echo',completionFlag:'deep:done',
    beats:[{title:'1',seconds:1}],choices:[{id:'a:b',label:'A:B',setFlag:'a:b'}]
  });
  const graph=analyzeRouteCoverage(altered,createScenarioCatalog());
  assert.ok(graph.rows.some(x=>x.id.includes('deep%3Aecho')));
  assert.ok(graph.rows.some(x=>x.id.includes('a%3Ab')));
  assert.equal(new Set(graph.rows.map(x=>x.id)).size,graph.rows.length);
});
test('empty and no-world catalogs never fabricate coverage',()=>{
  const c=createScenarioCatalog();
  const r=analyzeRouteCoverage(null,c);
  assert.equal(r.summary.targets,0);
  assert.equal(r.summary.coveragePercent,0);
  assert.equal(r.rows.length,0);
  assert.equal(r.scenarios.length,0);
  const a=atlas(),c2=catalog(a,['honor']);
  const absent=analyzeRouteCoverage(null,c2);
  assert.equal(absent.summary.verified,0);
  assert.equal(absent.summary.targets,0);
  assert.equal(absent.summary.nonverifiedScenarios,1);
});
test('editor has dynamic table, filters, export and safe text-based rendering',()=>{
  const editor=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const module=readFileSync(new URL('../layer-studio/story-route-coverage.js',import.meta.url),'utf8');
  for(const id of ['storyCoverageSummary','storyCoverageBreakdown','storyCoverageKind',
    'storyCoverageStatus','storyCoverageExport','storyCoverageHead','storyCoverageBody',
    'storyCoverageNote'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(editor,/analyzeRouteCoverage/);
  assert.match(editor,/filterRouteCoverage/);
  assert.match(editor,/renderRouteCoverage/);
  assert.match(editor,/routeFileDownload\('pixelforge-route-coverage\.json'/);
  assert.match(editor,/textContent=code/);
  assert.match(editor,/branchMapSelected=row\.mapNodeId/);
  assert.doesNotMatch(module,/localStorage|sessionStorage|fetch\(|eval\(|document\.|innerHTML/);
});
