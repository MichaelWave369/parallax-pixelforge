// Generate reproducible, original-asset-free PixelForge Godot acceptance fixtures.
// The ZIPs exercise the same public engine exporter used by VR Studio.
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {newWorld} from '../../vr-studio/world.js';
import {createGameplayBlueprint} from '../../vr-studio/gameplay-keys.js';
import {exportGodotVisibilityProject} from '../../vr-studio/godot-gameplay-project.js';

const output=resolve(process.argv[2]||'godot-acceptance-out');
mkdirSync(output,{recursive:true});
for(const scenario of [
  {name:'hide',key:'e',effect:'hide',targetId:'obj-2'},
  {name:'show',key:'space',effect:'show',targetId:'obj-3'},
  {name:'multi',key:'f',effect:'hide',targetId:'obj-1'}
]){
  const world=newWorld();
  const snapshot=JSON.stringify(world);
  const behavior=createGameplayBlueprint(world,scenario.targetId,scenario.key,scenario.effect);
  const result=exportGodotVisibilityProject(world,{behavior});
  if(result.report.ruleCount!==1||result.report.placeholders!==0||
     snapshot!==JSON.stringify(world))
    throw new Error('Godot fixture generation failed contract checks.');
  const duplicate=exportGodotVisibilityProject(world,{behavior});
  if(Buffer.compare(Buffer.from(result.bytes),Buffer.from(duplicate.bytes))!==0)
    throw new Error('Godot fixture ZIP changed between deterministic exports.');
  const zip=join(output,scenario.name+'.zip');
  writeFileSync(zip,result.bytes);
  console.log('PIXELFORGE_GODOT_FIXTURE_READY:'+scenario.name+' '+result.bytes.length);
}
