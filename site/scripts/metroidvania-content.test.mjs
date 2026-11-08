import test from 'node:test';
import assert from 'node:assert/strict';
import {createMetroidvaniaStarter,analyzeMetroidvaniaWorld} from '../src/metroidvania-world.js';
import {CONTENT_SCHEMA,PROJECT_SCHEMA,createMetroidvaniaContent,validateMetroidvaniaContent,
  analyzeMetroidvaniaCharacter,validateMetroidvaniaProject,CONTENT_LIMITS} from '../src/metroidvania-content.js';

test('starter creative designs stay validated and independent from original world',()=>{
  const world=createMetroidvaniaStarter(),before=JSON.stringify(world);
  const content=createMetroidvaniaContent(world);
  assert.equal(content.format,CONTENT_SCHEMA);
  assert.equal(content.characters.length,3);
  assert.equal(content.secrets.length,2);
  assert.equal(content.quietSpaces.length,1);
  assert.equal(JSON.stringify(world),before);
  assert.deepEqual(validateMetroidvaniaContent(content,world),content);
});
test('characters change starting abilities and reachable-room progression',()=>{
  const world=createMetroidvaniaStarter(),content=createMetroidvaniaContent(world);
  const normal=analyzeMetroidvaniaCharacter(world,content,'wanderer');
  const hunter=analyzeMetroidvaniaCharacter(world,content,'hunter');
  assert.deepEqual(normal.progression.stages[0].unlocked,[]);
  assert.deepEqual(hunter.progression.stages[0].unlocked,['shadow-dash']);
  assert.ok(hunter.progression.stages[1].visited.length>=normal.progression.stages[1].visited.length);
  assert.equal(analyzeMetroidvaniaWorld(world).stages[0].unlocked.length,0);
  assert.throws(()=>analyzeMetroidvaniaWorld(world,{startingAbilities:['nonexistent']}),/unknown starting ability/);
  assert.throws(()=>analyzeMetroidvaniaWorld(world,{startingAbilities:['shadow-dash','shadow-dash']}),/invalid starting abilities/);
});
test('equipment pair synergies are order-independent and limited to equipped pairs',()=>{
  const world=createMetroidvaniaStarter(),content=createMetroidvaniaContent(world);
  const sentinel=analyzeMetroidvaniaCharacter(world,content,'sentinel');
  assert.deepEqual(sentinel.activeSynergies,['resonant-ward']);
  const reversed=analyzeMetroidvaniaCharacter(world,content,'sentinel',['silver-focus','oath-shield']);
  assert.deepEqual(reversed.activeSynergies,['resonant-ward']);
  const alone=analyzeMetroidvaniaCharacter(world,content,'sentinel',['oath-shield']);
  assert.deepEqual(alone.activeSynergies,[]);
  const invalid=structuredClone(content);invalid.synergies.push({...invalid.synergies[0],id:'another-ward',itemA:'silver-focus',itemB:'oath-shield'});
  assert.throws(()=>validateMetroidvaniaContent(invalid,world),/duplicate synergy pair/);
});
test('secret visibility depends on reachable room and acquired abilities',()=>{
  const world=createMetroidvaniaStarter(),content=createMetroidvaniaContent(world);
  const result=analyzeMetroidvaniaCharacter(world,content,'wanderer');
  assert.ok(result.discoverableSecrets.includes('cracked-crypt-wall'));
  assert.ok(result.discoverableSecrets.includes('forgotten-archive'));
  const locked=structuredClone(world);locked.links=locked.links.filter(l=>l.id==='entry-hall');
  const report=analyzeMetroidvaniaCharacter(locked,content,'wanderer');
  assert.ok(!report.discoverableSecrets.includes('forgotten-archive'));
});
test('rejects malicious executable fields and invalid references without mutation',()=>{
  const world=createMetroidvaniaStarter(),content=createMetroidvaniaContent(world);
  const before=JSON.stringify(content);
  const bad=structuredClone(content);bad.characters[0].eval='process.exit()';
  assert.throws(()=>validateMetroidvaniaContent(bad,world),/unsupported fields/);
  const orphan=structuredClone(content);orphan.secrets[0].roomId='removed-room';
  assert.throws(()=>validateMetroidvaniaContent(orphan,world),/room does not exist/);
  const unknownItem=structuredClone(content);unknownItem.characters[0].equipment=['shadow-shell'];
  assert.throws(()=>validateMetroidvaniaContent(unknownItem,world),/missing shadow-shell/);
  const broken=structuredClone(content);broken.synergies[0].effect='shell-exec';
  assert.throws(()=>validateMetroidvaniaContent(broken,world),/unsupported synergy effect/);
  const unstable=structuredClone(content);unstable.quietSpaces[0].note='oops\nmore';
  assert.throws(()=>validateMetroidvaniaContent(unstable,world),/note exceeds limit/);
  assert.equal(JSON.stringify(content),before);
});
test('standalone custom world receives safe default character without assumed rooms',()=>{
  const world=createMetroidvaniaStarter();world.rooms=[world.rooms[0]];world.links=[];world.abilities=[];
  world.rooms[0].grants=[];
  const content=createMetroidvaniaContent(world);
  assert.deepEqual(content.characters[1].startingAbilities,[]);
  assert.equal(content.secrets.length,0);
  assert.equal(content.quietSpaces[0].roomId,world.startRoom);
});
test('full project roundtrip preserves designs, rejects unknown executable fields',()=>{
  const world=createMetroidvaniaStarter(),content=createMetroidvaniaContent(world);
  const project=validateMetroidvaniaProject({format:PROJECT_SCHEMA,world,content});
  assert.equal(JSON.stringify(validateMetroidvaniaProject(JSON.parse(JSON.stringify(project)))),JSON.stringify(project));
  const invalid={...project,remoteScript:'fetch("evil")'};
  assert.throws(()=>validateMetroidvaniaProject(invalid),/unsupported fields/);
  const badRoom=structuredClone(project);badRoom.world.rooms=badRoom.world.rooms.filter(r=>r.id!=='moon-library');
  assert.throws(()=>validateMetroidvaniaProject(badRoom),/existing rooms|room does not exist/);
  const tooMany=structuredClone(content);
  tooMany.characters=Array.from({length:CONTENT_LIMITS.characters+1},(_,i)=>({...content.characters[0],id:'player-'+i}));
  assert.throws(()=>validateMetroidvaniaContent(tooMany,world),/size limit/);
});
