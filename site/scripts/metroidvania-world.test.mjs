import test from 'node:test';
import assert from 'node:assert/strict';
import {METROIDVANIA_SCHEMA,LIMITS,createMetroidvaniaStarter,validateMetroidvaniaWorld,analyzeMetroidvaniaWorld} from '../src/metroidvania-world.js';

test('sample is a valid original world with gated non-linear progression',()=>{
  const world=createMetroidvaniaStarter(),report=analyzeMetroidvaniaWorld(world);
  assert.equal(world.format,METROIDVANIA_SCHEMA);
  assert.equal(world.rooms.length,6);
  assert.equal(report.reachable.length,6);
  assert.deepEqual(report.unreachable,[]);
  assert.deepEqual(new Set(report.unlocked),new Set(['shadow-dash','wall-climb','mist-form']));
  assert.deepEqual(report.stages[0].visited,['outer-gate']);
  assert.ok(report.stages.length>=3);
});
test('a room-gated ability cannot unlock itself across unreachable regions',()=>{
  const world=createMetroidvaniaStarter();
  const crypt=world.rooms.find(r=>r.id==='forgotten-crypt');
  crypt.grants=[];
  const bell=world.rooms.find(r=>r.id==='bell-tower');
  bell.grants=['shadow-dash'];
  const report=analyzeMetroidvaniaWorld(world);
  assert.ok(report.unreachable.includes('bell-tower'));
  assert.ok(!report.unlocked.includes('shadow-dash'));
});
test('one-way passages never allow unauthorized reverse travel',()=>{
  const world=createMetroidvaniaStarter();
  world.startRoom='cathedral-nave';
  const entry=world.links.find(l=>l.id==='entry-hall');
  entry.twoWay=false;
  const report=analyzeMetroidvaniaWorld(world);
  assert.ok(report.unreachable.includes('outer-gate'));
});
test('schema fails closed for unknown abilities and invented runtime authority',()=>{
  const world=createMetroidvaniaStarter();
  world.links[0].requires.push('admin-shell');
  assert.throws(()=>validateMetroidvaniaWorld(world),/unknown ability/);
  const injected=createMetroidvaniaStarter();
  injected.links[0].code='fetch("https://example.com")';
  assert.throws(()=>validateMetroidvaniaWorld(injected),/unsupported fields/);
  const rooted=createMetroidvaniaStarter();
  rooted.network='enabled';
  assert.throws(()=>validateMetroidvaniaWorld(rooted),/unsupported fields/);
});
test('refuses dangling room IDs, duplicate link IDs, oversized worlds, and bad coordinates',()=>{
  const a=createMetroidvaniaStarter();a.links[0].to='missing';
  assert.throws(()=>validateMetroidvaniaWorld(a),/existing rooms/);
  const b=createMetroidvaniaStarter();b.links[1].id=b.links[0].id;
  assert.throws(()=>validateMetroidvaniaWorld(b),/duplicate link/);
  const c=createMetroidvaniaStarter();c.rooms[0].x=Infinity;
  assert.throws(()=>validateMetroidvaniaWorld(c),/coordinates/);
  const d=createMetroidvaniaStarter();d.rooms=Array.from({length:LIMITS.rooms+1},(_,i)=>({...d.rooms[0],id:'room-'+i}));
  assert.throws(()=>validateMetroidvaniaWorld(d),/requires 1/);
});
test('analyzer and validated normalization never mutate authored source',()=>{
  const source=createMetroidvaniaStarter(),before=JSON.stringify(source);
  analyzeMetroidvaniaWorld(source);
  const normalized=validateMetroidvaniaWorld(source);
  assert.equal(JSON.stringify(source),before);
  normalized.rooms[0].name='Changed copy';
  assert.notEqual(source.rooms[0].name,'Changed copy');
});
