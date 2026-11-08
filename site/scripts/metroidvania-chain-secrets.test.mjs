import test from 'node:test';
import assert from 'node:assert/strict';
import {createMetroidvaniaStarter} from '../src/metroidvania-world.js';
import {createMetroidvaniaContent} from '../src/metroidvania-content.js';
import {buildMetroidvaniaLayerScene} from '../src/metroidvania-layer-bridge.js';
import {createScene,normalizeScene} from '../../layer-studio/engine.js';
import {createWorldSession,stepWorldSession,availableSecretKeys} from '../../layer-studio/room-atlas.js';
import {captureSave,restoreSave} from '../../layer-studio/adventure-journal.js';
import {secretKey,CHAIN_REACH,chainStrikeBox} from '../../layer-studio/metroidvania-combat.js';
function sample(){
  const world=createMetroidvaniaStarter(),content=createMetroidvaniaContent(world);
  return {world,content,scene:buildMetroidvaniaLayerScene(world,content,'wanderer')};
}
function enter(s,destination){
  const room=s.atlas.rooms.find(r=>r.id===s.roomId);
  const door=room.portals.find(p=>p.targetRoom===destination);
  assert.ok(door);
  s.game.player.x=door.x+5;s.game.player.y=door.y+25;
  const result=stepWorldSession(s,{interactPressed:true});
  assert.equal(result.travelled,true);
}
function reachCrypt(scene){
  const s=createWorldSession(scene);
  enter(s,'cathedral-nave');enter(s,'forgotten-crypt');
  return s;
}
function nearWall(s,wall){
  const p=s.game.player;
  p.x=wall.x-p.w-3;p.y=458;p.facing=1;p.grounded=true;
}
test('authored breakable-wall secrets become physical obstacles; unsupported types remain design-only',()=>{
  const {scene,content}=sample();
  const crypt=scene.atlas.rooms.find(r=>r.id==='forgotten-crypt');
  const library=scene.atlas.rooms.find(r=>r.id==='moon-library');
  assert.equal(scene.atlas.combatMode,'chain');
  assert.equal(crypt.breakables.length,1);
  assert.equal(crypt.breakables[0].id,'cracked-crypt-wall');
  assert.equal(library.breakables.length,0);
  assert.equal(availableSecretKeys(scene.atlas).length,1);
  assert.equal(content.secrets.length,2);
  assert.deepEqual(normalizeScene(scene),scene);
});
test('chain strike actually breaks an authored wall; hidden prize only collects on player contact',()=>{
  const {scene}=sample(),s=reachCrypt(scene);
  const wall=s.atlas.rooms.find(r=>r.id===s.roomId).breakables[0],key=secretKey(s.roomId,wall.id);
  assert.equal(s.abilities.has('shadow-dash'),true);
  nearWall(s,wall);
  assert.equal(s.brokenSecrets.has(key),false);
  stepWorldSession(s,{firePressed:true});
  assert.equal(s.chain.swings,1);
  assert.equal(s.game.shotsFired,0,'no petrification projectile in chain mode');
  assert.equal(s.brokenSecrets.has(key),true);
  assert.equal(s.foundSecrets.has(key),false);
  s.game.player.x=wall.x+6;
  stepWorldSession(s,{});
  assert.equal(s.foundSecrets.has(key),true,'prize requires reaching pickup position');
});
test('intact walls block walking and dash, broken walls stop blocking',()=>{
  const {scene}=sample(),s=reachCrypt(scene);
  const wall=s.atlas.rooms.find(r=>r.id===s.roomId).breakables[0];
  nearWall(s,wall);
  for(let i=0;i<6;i++)stepWorldSession(s,{right:true,dashPressed:i===0});
  assert.ok(s.game.player.x+s.game.player.w<=wall.x+1,'physical collision keeps wall solid');
  s.game.player.facing=1;
  stepWorldSession(s,{firePressed:true});
  assert.equal(s.brokenSecrets.has(secretKey(s.roomId,wall.id)),true);
  for(let i=0;i<14;i++)stepWorldSession(s,{right:true});
  assert.ok(s.game.player.x>wall.x);
});
test('a secret requiring an ability cannot be broken without that ability',()=>{
  const {world,content}=sample();
  const edited=structuredClone(content);
  edited.secrets[0].requires=['mist-form'];
  const scene=buildMetroidvaniaLayerScene(world,edited,'wanderer'),s=reachCrypt(scene);
  const wall=s.atlas.rooms.find(r=>r.id===s.roomId).breakables[0];
  nearWall(s,wall);
  stepWorldSession(s,{firePressed:true});
  assert.equal(s.brokenSecrets.has(secretKey(s.roomId,wall.id)),false);
  assert.match(s.notice,/TRAVERSAL ABILITY/);
});
test('chain banishes wraiths with finite reach, directional hitbox and cooldown',()=>{
  const {scene}=sample(),s=createWorldSession(scene);
  const wraith=s.game.enemies[0],p=s.game.player;
  p.x=wraith.x-p.w-38;p.y=458;p.facing=1;
  assert.equal(chainStrikeBox(p).w,CHAIN_REACH);
  stepWorldSession(s,{firePressed:true});
  assert.equal(wraith.dormant,true);
  assert.equal(s.chain.swings,1);
  stepWorldSession(s,{firePressed:true});
  assert.equal(s.chain.swings,1,'rate-limited even on a new input edge');
  for(let i=0;i<20;i++)stepWorldSession(s,{});
  stepWorldSession(s,{firePressed:true});
  assert.equal(s.chain.swings,2);
  const out=createWorldSession(scene),another=out.game.enemies[0];
  out.game.player.x=another.x+another.w+50;out.game.player.y=458;out.game.player.facing=1;
  stepWorldSession(out,{firePressed:true});
  assert.notEqual(another.dormant,true,'a forward strike never hits behind the player');
});
test('broken walls, collected secrets and defeated enemies survive the existing save journal',()=>{
  const {scene}=sample(),s=reachCrypt(scene);
  const wall=s.atlas.rooms.find(r=>r.id===s.roomId).breakables[0];
  nearWall(s,wall);
  stepWorldSession(s,{firePressed:true});
  s.game.player.x=wall.x+6;stepWorldSession(s,{});
  s.game.player.x=s.game.enemies[0].x-s.game.player.w-40;s.game.player.facing=1;
  for(let i=0;i<20;i++)stepWorldSession(s,{});
  stepWorldSession(s,{firePressed:true});
  const key=secretKey(s.roomId,wall.id),save=captureSave(scene,s,1);
  assert.ok(save.brokenSecrets.includes(key));
  assert.ok(save.foundSecrets.includes(key));
  const loaded=restoreSave(scene,save);
  assert.equal(loaded.brokenSecrets.has(key),true);
  assert.equal(loaded.foundSecrets.has(key),true);
  assert.equal(loaded.game.enemies[0].dormant,true);
  const forged={...save,brokenSecrets:['invented:secret',key],foundSecrets:['invented:secret',key]};
  const constrained=restoreSave(scene,forged);
  assert.deepEqual([...constrained.foundSecrets],[key]);
  assert.deepEqual([...constrained.brokenSecrets],[key]);
  const foundWithoutBroken=restoreSave(scene,{...save,brokenSecrets:[],foundSecrets:[key]});
  assert.deepEqual([...foundWithoutBroken.foundSecrets],[]);
});
test('legacy Stonebridge mode still fires stone ray and keeps old atlas normalization',()=>{
  const single=createScene(),s=createWorldSession(single);
  assert.equal(s.chain,undefined);
  stepWorldSession(s,{firePressed:true});
  assert.equal(s.game.shotsFired,1);
  assert.equal(s.game.shots.length,1);
  assert.ok(!('combatMode' in normalizeScene(single)));
});
test('unsafe or corrupt destructible data is rejected instead of being dropped',()=>{
  const {scene}=sample();
  const unknown=structuredClone(scene);
  unknown.atlas.rooms[2].breakables[0].requiresAbilities=['unknown-root'];
  assert.throws(()=>normalizeScene(unknown),/breakable secret ability reference/);
  const invalid=structuredClone(scene);
  invalid.atlas.rooms[2].breakables[0].code='eval()';
  assert.throws(()=>normalizeScene(invalid),/breakable wall/);
  const duplicated=structuredClone(scene);
  duplicated.atlas.rooms[2].breakables.push({...duplicated.atlas.rooms[2].breakables[0]});
  assert.throws(()=>normalizeScene(duplicated),/duplicate breakable wall ID/);
  const invalidMode=structuredClone(scene);
  invalidMode.atlas.combatMode='god-mode';
  assert.throws(()=>normalizeScene(invalidMode),/combat mode/);
});
