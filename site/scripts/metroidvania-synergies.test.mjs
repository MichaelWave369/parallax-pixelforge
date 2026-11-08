import test from 'node:test';
import assert from 'node:assert/strict';
import {createMetroidvaniaStarter} from '../src/metroidvania-world.js';
import {createMetroidvaniaContent} from '../src/metroidvania-content.js';
import {buildMetroidvaniaLayerScene} from '../src/metroidvania-layer-bridge.js';
import {normalizeScene,createScene} from '../../layer-studio/engine.js';
import {startPuzzle,stepPuzzle} from '../../layer-studio/puzzle.js';
import {createWorldSession,stepWorldSession} from '../../layer-studio/room-atlas.js';
import {normalizeCombatProfile,combatMovementSpeed,combatEffects} from '../../layer-studio/metroidvania-profile.js';
import {effectiveChainReach} from '../../layer-studio/metroidvania-combat.js';
import {captureSave,restoreSave} from '../../layer-studio/adventure-journal.js';

const src=()=>{
  const world=createMetroidvaniaStarter(),content=createMetroidvaniaContent(world);
  return {world,content};
};
function play(characterId='wanderer',gear){
  const {world,content}=src();
  if(gear){
    const character=content.characters.find(c=>c.id===characterId);
    character.equipment=[...gear];
  }
  const scene=buildMetroidvaniaLayerScene(world,content,characterId);
  return {world,content,scene,session:createWorldSession(scene)};
}
function playerAt(s,x){const p=s.game.player;p.x=x;p.y=458;p.vx=0;p.vy=0;p.facing=1;p.grounded=true;}
function armored(s){return s.game.enemies.find(e=>e.id==='armored-wraith');}

test('selected Maker characters yield distinct gameplay profiles and named equipped effects',()=>{
  const sentinel=play('sentinel'),hunter=play('hunter'),wanderer=play('wanderer');
  assert.equal(sentinel.scene.atlas.combatProfile.movement,'heavy');
  assert.equal(hunter.scene.atlas.combatProfile.movement,'agile');
  assert.equal(wanderer.scene.atlas.combatProfile.movement,'balanced');
  assert.deepEqual([...combatEffects(sentinel.scene.atlas.combatProfile)],['guard-pulse']);
  assert.deepEqual([...combatEffects(hunter.scene.atlas.combatProfile)],['extra-range']);
  assert.equal(wanderer.scene.atlas.combatProfile.synergies.length,0);
  assert.deepEqual(normalizeScene(sentinel.scene),sentinel.scene);
});
test('characters move at actual different velocities in the fixed-step Layer runtime',()=>{
  const a=play('hunter').session,b=play('sentinel').session,c=play('wanderer').session;
  for(const s of [a,b,c])playerAt(s,200);
  for(const s of [a,b,c])stepWorldSession(s,{right:true});
  assert.ok(a.game.player.x>c.game.player.x);
  assert.ok(c.game.player.x>b.game.player.x);
  assert.equal(combatMovementSpeed('agile'),305);
  assert.equal(combatMovementSpeed('heavy'),217);
  const classic=startPuzzle(createScene());
  stepPuzzle(classic,{right:true});
  assert.equal(classic.player.vx,265);
});
test('Far-Reaching Covenant extends chain reach and hits an enemy that normal chain cannot',()=>{
  const hunter=play('hunter').session,normal=play('wanderer').session;
  assert.ok(effectiveChainReach(hunter)>effectiveChainReach(normal));
  playerAt(hunter,325);playerAt(normal,325);
  stepWorldSession(hunter,{firePressed:true});
  stepWorldSession(normal,{firePressed:true});
  assert.equal(hunter.game.enemies[0].dormant,true);
  assert.equal(normal.game.enemies[0].dormant,false);
});
test('Moonfire bonus damage defeats armored wraith in one strike instead of two',()=>{
  const buff=play('wanderer',['moonblade','oath-shield']).session;
  const base=play('wanderer').session;
  assert.equal(armored(buff).hp,2);
  for(const s of [buff,base])playerAt(s,535);
  stepWorldSession(buff,{firePressed:true});
  stepWorldSession(base,{firePressed:true});
  assert.equal(armored(buff).dormant,true);
  assert.equal(armored(buff).hp,0);
  assert.equal(armored(base).dormant,false);
  assert.equal(armored(base).hp,1);
  for(let i=0;i<20;i++)stepWorldSession(base,{});
  stepWorldSession(base,{firePressed:true});
  assert.equal(armored(base).dormant,true);
});
test('Renewal Link heals at most one heart when chain strike lands on enemy',()=>{
  const s=play('hunter',['pilgrim-whip','oath-shield']).session;
  s.game.health=2;
  playerAt(s,375);
  stepWorldSession(s,{firePressed:true});
  assert.equal(s.game.health,3);
  s.game.health=3;
  for(let i=0;i<20;i++)stepWorldSession(s,{});
  stepWorldSession(s,{firePressed:true});
  assert.equal(s.game.health,3);
  const empty=play('hunter',['pilgrim-whip','oath-shield']).session;
  empty.game.health=1;playerAt(empty,200);
  stepWorldSession(empty,{firePressed:true});
  assert.equal(empty.game.health,1,'missing a hit cannot heal');
});
test('Resonant Ward temporarily guards against contact damage but expires',()=>{
  const guard=play('sentinel').session,normal=play('wanderer').session;
  for(const s of [guard,normal]){playerAt(s,200);stepWorldSession(s,{firePressed:true});}
  assert.ok(guard.game.player.invulnerable>0);
  assert.equal(normal.game.player.invulnerable,0);
  for(const s of [guard,normal])playerAt(s,s.game.enemies[0].x+4);
  stepWorldSession(guard,{});
  stepWorldSession(normal,{});
  assert.equal(guard.game.health,3);
  assert.equal(normal.game.health,2);
  // Leave contact range before checking expiration; enemy hits have their own invulnerability timer.
  playerAt(guard,200);
  for(let i=0;i<40;i++)stepWorldSession(guard,{});
  assert.equal(guard.game.player.invulnerable,0);
});
test('Swift Silver movement burst gives same agile character extra dash distance',()=>{
  const boosted=play('hunter',['moonblade','silver-focus']).session;
  const plain=play('hunter',['pilgrim-whip']).session;
  assert.deepEqual([...combatEffects(boosted.atlas.combatProfile)],['speed-burst']);
  for(const s of [boosted,plain])playerAt(s,120);
  for(let i=0;i<7;i++){
    stepWorldSession(boosted,{right:true,dashPressed:i===0});
    stepWorldSession(plain,{right:true,dashPressed:i===0});
  }
  assert.ok(boosted.game.player.x>plain.game.player.x+10);
});
test('partially damaged wraith HP survives room travel and browser saves',()=>{
  const {scene,session:s}=play('wanderer');
  playerAt(s,535);
  stepWorldSession(s,{firePressed:true});
  assert.equal(armored(s).hp,1);
  assert.equal(armored(s).dormant,false);
  const save=captureSave(scene,s,1);
  assert.deepEqual(save.snapshots[s.roomId].wounds,[{id:'armored-wraith',hp:1}]);
  const loaded=restoreSave(scene,save);
  assert.equal(armored(loaded).hp,1);
  const forged=structuredClone(save);
  forged.snapshots[forged.roomId].wounds=[{id:'armored-wraith',hp:999},{id:'not-real',hp:1}];
  const safe=restoreSave(scene,forged);
  assert.equal(armored(safe).hp,2,'invalid wounds cannot be used as extra privileges');
  const firstRoom=s.roomId;
  const door=s.atlas.rooms.find(r=>r.id===firstRoom).portals[0];
  playerAt(s,door.x+4);s.game.player.y=door.y+24;
  const travel=stepWorldSession(s,{interactPressed:true});
  assert.equal(travel.travelled,true);
  const back=s.atlas.rooms.find(r=>r.id===s.roomId).portals.find(p=>p.targetRoom===firstRoom);
  assert.ok(back);
  playerAt(s,back.x+4);s.game.player.y=back.y+24;
  const returnTrip=stepWorldSession(s,{interactPressed:true});
  assert.equal(returnTrip.travelled,true);
  assert.equal(armored(s).hp,1);
});
test('profile normalizer denies invented items, unknown effects, duplicate gear and arbitrary authority',()=>{
  const {scene}=play('sentinel');
  const base=scene.atlas.combatProfile;
  const alter=(fn)=>{const copy=structuredClone(scene);fn(copy.atlas.combatProfile);return copy;};
  assert.throws(()=>normalizeScene(alter(p=>{p.synergies[0].effect='exec-code';})),/unknown effect/);
  assert.throws(()=>normalizeScene(alter(p=>{p.synergies[0].itemB='unowned-gem';})),/requires two different/);
  assert.throws(()=>normalizeScene(alter(p=>{p.equipment.push({...p.equipment[0]});})),/at most two/);
  assert.throws(()=>normalizeScene(alter(p=>{p.movement='teleport-cheat';})),/unknown movement/);
  assert.throws(()=>normalizeScene(alter(p=>{p.remoteUrl='https:\/\/example.invalid\/code';})),/unsupported fields/);
  assert.equal(normalizeCombatProfile(base).name,'The Sentinel');
});
test('legacy Stonebridge mode is unaffected by profiles, movement and chain effects',()=>{
  const classic=normalizeScene(createScene());
  assert.equal(classic.atlas,null);
  const s=createWorldSession(classic);
  stepWorldSession(s,{firePressed:true});
  assert.equal(s.game.shotsFired,1);
  assert.equal(s.chain,undefined);
});
