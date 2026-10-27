import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { convertRuntimeSceneToRaycaster, buildPhiWad, loadPhiWad } from '../phiwad/level.js';
import { MISSION_PROFILE, TARGET_WIDTH, TARGET_HEIGHT, validateMission,
  createMissionPack, loadMissionPack, toMichaelOriHandoff } from '../phiwad/mission.js';
const scene=JSON.parse(fs.readFileSync(
  'games/the-legend-of-more-bounce/runtime/bouncehome-grove.runtime-scene.v5.11.json','utf8'));
const level=convertRuntimeSceneToRaycaster(scene);
function reachable(level) {
  const queue=[{x:Math.floor(level.spawn.x),y:Math.floor(level.spawn.y)}];
  const visited=new Set([queue[0].x+','+queue[0].y]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=p.x+dx,y=p.y+dy,k=x+','+y;
      if(x<=0||y<=0||x>=level.width-1||y>=level.height-1||visited.has(k)||
        level.walls[y*level.width+x]) continue;
      visited.add(k);queue.push({x,y});
    }
  }
  return queue.slice(1).filter(p=>p.x!==Math.floor(level.spawn.x)||p.y!==Math.floor(level.spawn.y))
    .map(p=>({x:p.x+.5,y:p.y+.5}));
}
function mission() {
  const open=reachable(level);
  assert.ok(open.length>=7,'Fixture scene requires seven reachable placements');
  return {
    profile:MISSION_PROFILE,relays:[open[0],open[1]],key:open[2],exit:open[3],
    enemies:[{type:'repeater',...open[4]}],
    items:[{type:'health',...open[5]}],
    captives:[open[6]]
  };
}
test('mission can be authored and roundtrip inside a ΦPACK-backed ΦWAD',()=>{
  const m=mission();
  const validated=validateMission(level,m);
  assert.equal(validated.ok,true,validated.errors.join('; '));
  const bytes=createMissionPack(level,m);
  const loaded=loadMissionPack(bytes);
  assert.equal(loaded.manifest.rights.redistributionAllowed,false);
  assert.deepEqual(loaded.mission,m);
  assert.deepEqual(bytes,createMissionPack(level,m));
  assert.deepEqual(loadPhiWad(bytes).level.mission,m);
});
test('game-specific handoff pads a real scene to exactly 29 x 25 and keeps objectives',()=>{
  const m=mission(),output=toMichaelOriHandoff(level,m);
  assert.equal(output.level.cells.length,TARGET_HEIGHT);
  assert.ok(output.level.cells.every(row=>row.length===TARGET_WIDTH));
  assert.equal(output.level.spawn.x-level.spawn.x,Math.floor((TARGET_WIDTH-level.width)/2));
  assert.equal(output.level.spawn.y-level.spawn.y,Math.floor((TARGET_HEIGHT-level.height)/2));
  assert.equal(output.level.relays.length,2);
  assert.equal(output.compatibility.gameRuntimeLoaderInstalled,false);
});
test('validators reject absent objectives, overlapping targets, invalid enemies and blocked tiles',()=>{
  const m=mission();
  assert.equal(validateMission(level,{...m,relays:[m.relays[0]]}).ok,false);
  assert.equal(validateMission(level,{...m,key:m.relays[0]}).ok,false);
  assert.equal(validateMission(level,{...m,enemies:[{...m.enemies[0],type:'imaginary-demon'}]}).ok,false);
  assert.equal(validateMission(level,{...m,exit:{x:0.5,y:0.5}}).ok,false);
  assert.throws(()=>loadMissionPack(buildPhiWad(scene)),/Missing or unsupported mission profile/);
});
test('reachability prevents unwinnable isolated relay',()=>{
  const sealed=structuredClone(level);
  const target=mission();
  // Make relay one inaccessible by surrounding an otherwise open cell.
  const victim=target.relays[0],vx=Math.floor(victim.x),vy=Math.floor(victim.y);
  for(const [x,y] of [[vx-1,vy],[vx+1,vy],[vx,vy-1],[vx,vy+1]])
    if(x>0&&y>0&&x<sealed.width-1&&y<sealed.height-1)
      sealed.walls[y*sealed.width+x]=1;
  const result=validateMission(sealed,target);
  assert.equal(result.ok,false);
});
