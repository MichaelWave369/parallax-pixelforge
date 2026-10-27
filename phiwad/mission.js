/* ΦWAD Mission Authoring v0.1.
 * The live Michael Wave & Ori v0.2.1 campaign expects 29x25 tiles,
 * two control relays, a golden key, and extraction. This module authors
 * a compatible CONTENT CONTRACT only, not executable Game instances.
 */
import { encodePack, hexCRC } from '../phipack/core.js';
import { loadPhiWad, validateRaycasterLevel, PHIWAD_PROFILE } from './level.js';

export const MISSION_PROFILE = 'michael-ori.relay-mission.v0.1';
export const TARGET_WIDTH = 29;
export const TARGET_HEIGHT = 25;
const enemyTypes = new Set(['plugged','repeater','enforcer','crawler','warden']);
const itemTypes = new Set(['health','armor','energy','artifact']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const coords = value => object(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
const posKey = pos => Math.floor(pos.x) + ',' + Math.floor(pos.y);

function reachableTiles(level) {
  const visited = new Set();
  const start = { x: Math.floor(level.spawn.x), y: Math.floor(level.spawn.y) };
  const queue = [start];
  visited.add(posKey(start));
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x=p.x+dx,y=p.y+dy,key=x+','+y;
      if (x<0||x>=level.width||y<0||y>=level.height||visited.has(key) ||
          level.walls[y*level.width+x]!==0) continue;
      visited.add(key);queue.push({x,y});
    }
  }
  return visited;
}
export function validateMission(level, mission) {
  const errors = [];
  const levelCheck = validateRaycasterLevel(level);
  if (!levelCheck.ok) return { ok:false, errors: levelCheck.errors };
  if (level.width > TARGET_WIDTH || level.height > TARGET_HEIGHT)
    errors.push('Map exceeds Michael & Ori 29x25 layout');
  if (!object(mission) || mission.profile !== MISSION_PROFILE)
    return { ok:false, errors:[...errors,'Missing or unsupported mission profile'] };

  const reachable = reachableTiles(level);
  const occupied = new Set();
  const checkPlacement = (place, label, unique=true) => {
    if (!coords(place) || place.x<1 || place.y<1 ||
        place.x>=level.width-1 || place.y>=level.height-1 ||
        level.walls[Math.floor(place.y)*level.width+Math.floor(place.x)]!==0) {
      errors.push(label+' must be placed on a walkable interior tile');
      return;
    }
    const key = posKey(place);
    if (!reachable.has(key)) errors.push(label+' is unreachable from the player spawn');
    if (unique && occupied.has(key)) errors.push(label+' overlaps another mission object');
    if (unique) occupied.add(key);
  };
  if (!Array.isArray(mission.relays) || mission.relays.length!==2)
    errors.push('Exactly two control relays are required');
  else mission.relays.forEach((r,i)=>checkPlacement(r,'Relay '+(i+1)));
  checkPlacement(mission.key,'Gold key');
  checkPlacement(mission.exit,'Extraction portal');

  for (const [property,max,types] of [
    ['enemies',64,enemyTypes],['items',64,itemTypes],['captives',24,null]
  ]) {
    const list = mission[property];
    if (!Array.isArray(list) || list.length>max) {
      errors.push(property+' must be an array with at most '+max+' entries');
      continue;
    }
    list.forEach((entity,i)=>{
      const label=property+' '+(i+1);
      if (types && (!object(entity)||!types.has(entity.type)))
        errors.push(label+' has an unsupported type');
      checkPlacement(entity,label,false);
    });
  }
  return { ok:errors.length===0, errors, reachableCount:reachable.size };
}
function checked(level, mission) {
  const result=validateMission(level,mission);
  if (!result.ok) throw new Error('ΦWAD mission invalid: '+result.errors.join('; '));
  return result;
}
export function createMissionPack(level, mission, options={}) {
  checked(level,mission);
  const withMission={...level,mission:structuredClone(mission)};
  const content=new TextEncoder().encode(JSON.stringify(withMission));
  const entry='levels/main.raycaster.json';
  const manifest={
    format:'phipack',formatVersion:'0.1.0',
    id:options.id||'phi369.'+level.id.toLowerCase().replace(/[^a-z0-9_-]/g,'-'),
    title:options.title||level.title,kind:'level',profile:PHIWAD_PROFILE,entry,
    assets:[{path:entry,mediaType:'application/json',size:content.length,crc32:hexCRC(content)}],
    rights:{license:options.license||'UNSPECIFIED',
      redistributionAllowed:options.redistributionAllowed===true}
  };
  return encodePack(manifest,{[entry]:content});
}
export function loadMissionPack(bytes) {
  const {manifest,level}=loadPhiWad(bytes);
  checked(level,level.mission);
  return {manifest,level,mission:level.mission};
}
/** A 29x25 static geometry and objective *handoff* for the v0.2.1 game.
 * It deliberately contains no enemy runtime state, save data or executable code.
 * A game-owned importer is still required.
 */
export function toMichaelOriHandoff(level, mission) {
  checked(level,mission);
  const dx=Math.floor((TARGET_WIDTH-level.width)/2);
  const dy=Math.floor((TARGET_HEIGHT-level.height)/2);
  const cells=Array.from({length:TARGET_HEIGHT},()=>Array(TARGET_WIDTH).fill(1));
  for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++)
    cells[y+dy][x+dx]=level.walls[y*level.width+x];
  const shift=p=>({x:p.x+dx,y:p.y+dy});
  const placed=items=>items.map(item=>({...item,...shift(item)}));
  return {
    schema:'michael-ori.custom-handoff.v0.1',
    source:{profile:PHIWAD_PROFILE,id:level.id},
    target:{game:'michael-wave-ori-break-the-matrix',gameVersion:'0.2.1'},
    compatibility:{geometry:'binary-walls-only',gameRuntimeLoaderInstalled:false,
      unsupported:['doors','secrets','boss phases','art/texture binding','save/checkpoint','campaign progression']},
    level:{
      w:TARGET_WIDTH,h:TARGET_HEIGHT,cells,
      spawn:{...shift(level.spawn),a:level.spawn.angle},
      relays:placed(mission.relays),
      key:shift(mission.key),
      exit:shift(mission.exit),
      enemies:placed(mission.enemies),
      items:placed(mission.items),
      captives:placed(mission.captives)
    }
  };
}
