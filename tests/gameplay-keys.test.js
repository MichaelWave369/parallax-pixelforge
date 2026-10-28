import test from 'node:test';
import assert from 'node:assert/strict';
import {newWorld,renameWorld} from '../vr-studio/world.js';
import {GAMEPLAY_SCHEMA,createGameplayBlueprint,validateGameplayBlueprint,compileGDevelopVisibilityEvents} from '../vr-studio/gameplay-keys.js';
import {exportGDevelopProject} from '../vr-studio/gdevelop-project.js';

test('portable behavior blueprint is declarative, immutable to source, and has no script payload',()=>{
  const world=newWorld(),initial=JSON.stringify(world);
  const blueprint=createGameplayBlueprint(world,'obj-2','e','hide');
  assert.equal(blueprint.schema,GAMEPLAY_SCHEMA);
  assert.deepEqual(blueprint.rules,[{id:'rule-001',on:'keyReleased',key:'e',targetId:'obj-2',effect:'hide'}]);
  assert.equal(JSON.stringify(world),initial);
  assert.doesNotMatch(JSON.stringify(blueprint),/script|eval|javascript/i);
  const events=compileGDevelopVisibilityEvents(world,blueprint);
  assert.deepEqual(events,[{
    type:'BuiltinCommonInstructions::Standard',
    conditions:[{type:{value:'KeyReleased'},parameters:['','e']}],
    actions:[{type:{value:'Hide'},parameters:['PF_Obj_002']}]
  }]);
  assert.deepEqual(compileGDevelopVisibilityEvents(world,blueprint),events);
});
test('show action compiles through actual GDevelop Show action parameters',()=>{
  const world=newWorld(),blueprint=createGameplayBlueprint(world,'obj-3','f','show');
  assert.deepEqual(compileGDevelopVisibilityEvents(world,blueprint)[0].actions,[
    {type:{value:'Show'},parameters:['PF_Obj_003','']}
  ]);
  const packaged=exportGDevelopProject(world,{behavior:blueprint});
  const scene=packaged.project.layouts[0];
  assert.equal(scene.events.length,1);
  assert.equal(scene.events[0].actions[0].type.value,'Show');
  assert.equal(packaged.report.behaviorCount,1);
  assert.equal(packaged.report.status,'NATIVE_VISIBILITY_EVENTS_EDITOR_UNTESTED');
});
test('plain GDevelop exports retain their empty event sheet unchanged',()=>{
  const plain=exportGDevelopProject(newWorld());
  assert.deepEqual(plain.project.layouts[0].events,[]);
  assert.equal(plain.report.behaviorCount,0);
  assert.equal(plain.report.status,'NATIVE_PROJECT_JSON_GENERATED_GDEVELOP_EDITOR_UNTESTED');
});
test('rejects cross-world, invalid keys/targets, extra fields and conflicting actions',()=>{
  const world=newWorld();
  const good=createGameplayBlueprint(world,'obj-2');
  for(const patch of [
    {schema:'pixelforge.gameplay.future.v2'},
    {worldTitle:'Other world'},
    {script:'evil()'},
    {rules:[{...good.rules[0],key:'Escape'}]},
    {rules:[{...good.rules[0],on:'mouseClick'}]},
    {rules:[{...good.rules[0],effect:'runScript'}]},
    {rules:[{...good.rules[0],targetId:'nonexistent'}]},
    {rules:[good.rules[0],{...good.rules[0],id:'rule-002',effect:'show'}]},
    {rules:Array.from({length:13},(_,i)=>({...good.rules[0],id:'rule-'+String(i+1).padStart(3,'0')}))}
  ])assert.throws(()=>validateGameplayBlueprint(world,{...good,...patch}),/Invalid/);
  assert.throws(()=>createGameplayBlueprint(world,'missing'),/Invalid/);
  assert.throws(()=>validateGameplayBlueprint(renameWorld(world,'Renamed'),good),/mismatched/);
  assert.throws(()=>exportGDevelopProject(world,{behavior:{...good,foo:'x'}}),/Invalid/);
});
