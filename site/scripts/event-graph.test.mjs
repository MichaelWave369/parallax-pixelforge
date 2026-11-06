import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleVrWorld,fingerprintVrWorld,newPhysicsProfile} from '../src/vr-physics-bridge.js';
import {buildPlayableWorld,createSamplePlayableWorld,validatePlayableWorld,parsePlayableWorld} from '../src/playable-world.js';
import {newGameplayRules,validateGameplayRules,addGameplayMarker,
  removeGameplayMarker,newGameplaySession,advanceGameplaySession} from '../src/gameplay-rules.js';
import {newEventGraph,validateEventGraph,validateEventGraphTargets,
  addEventNode,addEventDoor,updateEventNode,removeEventNode,dependenciesMet} from '../src/event-graph.js';

async function fixture(){
  const scene=sampleVrWorld(),hash=await fingerprintVrWorld(scene);
  return {scene,hash,profile:newPhysicsProfile(scene,hash)};
}
test('Rung 6 legacy gameplay and Rung 5 exploration worlds remain importable',()=>{
  const w=createSamplePlayableWorld();
  const old=JSON.parse(JSON.stringify(w));delete old.gameplay.graph;
  assert.equal(validatePlayableWorld(old).gameplay.graph,undefined);
  const bare=JSON.parse(JSON.stringify(old));delete bare.gameplay;
  assert.equal(parsePlayableWorld(JSON.stringify(bare)).gameplay,undefined);
});
test('source-bound DAG with switch, secret and door validates in portable world',async()=>{
  const {scene,hash,profile}=await fixture();
  const source=JSON.stringify(scene),sidecar=JSON.stringify(profile);
  let graph=newEventGraph();
  graph=addEventNode(graph,[],'switch',[1,1,-4],'Primary Switch');
  graph=addEventNode(graph,[],'secret',[-1,1,-4],'Hidden Route');
  graph=addEventDoor(graph,[],'obj-2','Stone Gate','switch-1');
  graph=updateEventNode(graph,[],'door-1',
    {requires:{mode:'any',ids:['switch-1','secret-1']}});
  graph=updateEventNode(graph,[],'goal',
    {goalRequires:{mode:'any',ids:['switch-1','secret-1']}});
  const rules=validateGameplayRules({...newGameplayRules(hash),graph},hash);
  const portable=buildPlayableWorld(scene,profile,hash,-9.81,rules);
  assert.equal(portable.gameplay.graph.doors[0].objectId,'obj-2');
  assert.deepEqual(parsePlayableWorld(JSON.stringify(portable)),portable);
  assert.equal(JSON.stringify(scene),source);
  assert.equal(JSON.stringify(profile),sidecar);
});
test('E-to-use switch: door opens once and branch goal wins without collecting optional pickups',async()=>{
  const {hash}=await fixture();
  let rules=addGameplayMarker(newGameplayRules(hash),hash,'collectible',[50,0,0],'Optional Spark');
  rules=addGameplayMarker(rules,hash,'goal',[5,1,0],'Finish','Route complete!');
  let graph=addEventNode(newEventGraph(),['pickup-1'],'switch',[1,1,0],'Switch');
  graph=addEventNode(graph,['pickup-1'],'secret',[3,1,0],'Hidden Path');
  graph=addEventDoor(graph,['pickup-1'],'obj-2','Locked Pillar','switch-1');
  graph=updateEventNode(graph,['pickup-1'],'door-1',
    {requires:{mode:'any',ids:['switch-1','secret-1']}});
  graph=updateEventNode(graph,['pickup-1'],'goal',
    {goalRequires:{mode:'any',ids:['switch-1','secret-1']}});
  rules=validateGameplayRules({...rules,graph},hash);
  const initial=newGameplaySession();
  const nearSwitch=advanceGameplaySession(rules,initial,[1,1,0]);
  assert.deepEqual(nearSwitch.events,[]);
  const pressed=advanceGameplaySession(rules,initial,[1,1,0],{interact:true});
  assert.deepEqual(pressed.events.map(e=>e.type),['switch','door']);
  assert.deepEqual(pressed.session.openedDoors,['door-1']);
  const again=advanceGameplaySession(rules,pressed.session,[1,1,0],{interact:true});
  assert.deepEqual(again.events,[]);
  const result=advanceGameplaySession(rules,again.session,[5,1,0]);
  assert.equal(result.session.won,true);
  assert.deepEqual(result.events.map(x=>x.type),['win']);
  assert.equal(result.session.collected.length,0);
});
test('secret path triggers automatically, prerequisites can be chained and evaluated out of order',async()=>{
  const {hash}=await fixture();
  let graph=addEventNode(newEventGraph(),[],'switch',[0,1,0],'Switch');
  graph=addEventNode(graph,[],'secret',[0,1,0],'Secret');
  graph=updateEventNode(graph,[],'switch-1',{requires:{mode:'all',ids:['secret-1']}});
  const rules=validateGameplayRules({...newGameplayRules(hash),graph},hash);
  const result=advanceGameplaySession(rules,newGameplaySession(),[0,1,0],{interact:true});
  assert.deepEqual(result.events.map(x=>x.type),['secret','switch']);
  assert.deepEqual(result.session.activated,['secret-1','switch-1']);
});
test('cycle, unknown dependencies, unsafe condition fields and duplicate door targets are refused',()=>{
  let graph=addEventNode(newEventGraph(),[],'switch',[0,0,0],'A');
  graph=addEventNode(graph,[],'secret',[0,0,1],'B');
  graph=updateEventNode(graph,[],'switch-1',{requires:{mode:'all',ids:['secret-1']}});
  assert.throws(()=>updateEventNode(graph,[],'secret-1',
    {requires:{mode:'all',ids:['switch-1']}}),/Cyclic/);
  assert.throws(()=>updateEventNode(graph,[],'secret-1',
    {requires:{mode:'any',ids:['missing']}}),/Unknown/);
  assert.throws(()=>updateEventNode(graph,[],'secret-1',
    {requires:{mode:'any',ids:[],script:'alert(1)'}}),/unsupported/);
  assert.throws(()=>updateEventNode(graph,[],'goal',
    {goalRequires:{mode:'any',ids:[]}}),/condition/);
  const d=addEventDoor(graph,[],'obj-2','Gate','switch-1');
  assert.throws(()=>addEventDoor(d,[],'obj-2','Copy','switch-1'),/duplicate/);
  assert.throws(()=>addEventDoor(d,[],'obj-999','No Key','missing'),/Unknown/);
  assert.throws(()=>validateEventGraph({...graph,network:'https://bad'},[]),/unsupported/);
});
test('doors reference only declared fixed block, pillar or platform, never floor or private proxy',()=>{
  const world=createSamplePlayableWorld();
  const graph=addEventDoor(addEventNode(newEventGraph(),[],'switch',[0,0,0],'Key'),
    [],'placed-2','Gate','switch-1');
  assert.deepEqual(validateEventGraphTargets(graph,world.objects),graph);
  const floor=updateEventNode(graph,[],'door-1',{message:'Opened'});
  floor.doors[0].objectId='obj-1';
  assert.throws(()=>validateEventGraphTargets(floor,world.objects),/fixed solid/);
  const dynamic=structuredClone(graph);
  dynamic.doors[0].objectId='placed-4';
  assert.throws(()=>validateEventGraphTargets(dynamic,world.objects),/fixed solid/);
  const absent=structuredClone(graph);
  absent.doors[0].objectId='placed-99';
  assert.throws(()=>validateEventGraphTargets(absent,world.objects),/fixed solid/);
});
test('deleting a switch removes its graph links without leaving an unlocked, unguarded door',()=>{
  let graph=addEventNode(newEventGraph(),[],'switch',[0,0,0],'Gate Switch');
  graph=addEventDoor(graph,[],'obj-2','Gate','switch-1');
  graph=updateEventNode(graph,[],'goal',{goalRequires:{mode:'all',ids:['switch-1']}});
  const removed=removeEventNode(graph,[],'switch-1');
  assert.deepEqual(removed.nodes,[]);
  assert.deepEqual(removed.doors,[]);
  assert.equal(removed.goalRequires,null);
});
test('Rung 6 pickup removal prunes graph references and preserves other branches',async()=>{
  const {hash}=await fixture();
  let rules=addGameplayMarker(newGameplayRules(hash),hash,'collectible',[0,0,0],'Pickup');
  let graph=addEventNode(newEventGraph(),['pickup-1'],'switch',[1,0,0],'Lever');
  graph=updateEventNode(graph,['pickup-1'],'switch-1',{requires:{mode:'all',ids:['pickup-1']}});
  rules=validateGameplayRules({...rules,graph},hash);
  const next=removeGameplayMarker(rules,hash,'pickup-1');
  assert.deepEqual(next.graph.nodes[0].requires.ids,[]);
});
test('old Rung 6 goal still requires all objectives if no graph branch is supplied',async()=>{
  const {hash}=await fixture();
  let rules=addGameplayMarker(newGameplayRules(hash),hash,'collectible',[1,0,0],'Spark');
  rules=addGameplayMarker(rules,hash,'goal',[5,0,0],'Finish','Won');
  rules=validateGameplayRules({...rules,graph:newEventGraph()},hash);
  assert.equal(advanceGameplaySession(rules,newGameplaySession(),[5,0,0]).session.won,false);
  const collected=advanceGameplaySession(rules,newGameplaySession(),[1,0,0]);
  assert.equal(advanceGameplaySession(rules,collected.session,[5,0,0]).session.won,true);
});
test('starter course provides switch-or-secret alternate victory path with a removable collider',()=>{
  const world=createSamplePlayableWorld();
  assert.equal(world.gameplay.graph.goalRequires.mode,'any');
  assert.equal(world.gameplay.graph.doors.length,1);
  const secret=world.gameplay.graph.nodes.find(n=>n.kind==='secret');
  const touched=advanceGameplaySession(world.gameplay,newGameplaySession(),secret.position);
  assert.deepEqual(touched.events.map(e=>e.type),['secret','door']);
  const won=advanceGameplaySession(world.gameplay,touched.session,world.gameplay.goal.position);
  assert.equal(won.session.won,true);
  assert.ok(dependenciesMet(world.gameplay.graph.goalRequires,
    new Set(touched.session.activated)));
});
