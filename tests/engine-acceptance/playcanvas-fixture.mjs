// Generate a deterministic PlayCanvas fixture using PixelForge's real exporter.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {newWorld} from '../../vr-studio/world.js';
import {createGameplayBlueprint,validateGameplayBlueprint} from '../../vr-studio/gameplay-keys.js';
import {exportPlayCanvasProject} from '../../vr-studio/playcanvas-project.js';
const dir=resolve(process.argv[2]||'playcanvas-acceptance-out');
mkdirSync(dir,{recursive:true});
const world=newWorld(),snapshot=JSON.stringify(world);
const first=createGameplayBlueprint(world,'obj-2','e','hide');
const behavior=validateGameplayBlueprint(world,{...first,rules:[
  first.rules[0],
  {id:'rule-002',on:'keyReleased',key:'space',targetId:'obj-2',effect:'show'}
]});
const pack=exportPlayCanvasProject(world,{behavior});
if(pack.report.behaviorCount!==2||pack.report.placeholderCount!==0 ||
   JSON.stringify(world)!==snapshot ||
   Buffer.compare(Buffer.from(pack.bytes),
      Buffer.from(exportPlayCanvasProject(world,{behavior}).bytes))!==0)
  throw Error('Generated PlayCanvas acceptance fixture failed contract checks.');
writeFileSync(join(dir,'project.zip'),pack.bytes);
console.log('PIXELFORGE_PLAYCANVAS_FIXTURE_READY:'+pack.report.objectCount+':'+pack.report.behaviorCount);
