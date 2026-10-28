// Prepare three deterministic, original-asset-only GDevelop projects through
// PixelForge's production exporter for native editor HTML5 compilation.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {newWorld} from '../../vr-studio/world.js';
import {createGameplayBlueprint} from '../../vr-studio/gameplay-keys.js';
import {exportGDevelopProject} from '../../vr-studio/gdevelop-project.js';

const root=resolve(process.argv[2]||'gdevelop-native-acceptance');
mkdirSync(root,{recursive:true});
for(const item of [
  {name:'plain',behavior:null},
  {name:'hide-e',behavior:{key:'e',effect:'hide',target:'obj-2'}},
  {name:'show-space',behavior:{key:'space',effect:'show',target:'obj-3'}}
]){
  const scene=newWorld(),before=JSON.stringify(scene);
  const config=item.behavior?{
    behavior:createGameplayBlueprint(scene,item.behavior.target,item.behavior.key,item.behavior.effect)
  }:{};
  const one=exportGDevelopProject(scene,config),two=exportGDevelopProject(scene,config);
  if(Buffer.compare(Buffer.from(one.bytes),Buffer.from(two.bytes))!==0 ||
     JSON.stringify(scene)!==before || one.report.objects!==scene.objects.length ||
     one.report.placeholders!==0)
    throw Error('Native GDevelop fixture generation failed reproducibility/privacy checks.');
  writeFileSync(join(root,item.name+'.zip'),one.bytes);
  console.log('PIXELFORGE_GDEVELOP_FIXTURE_READY:'+item.name+':'+one.report.objects);
}
