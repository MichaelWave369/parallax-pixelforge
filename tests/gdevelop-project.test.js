import test from 'node:test';
import assert from 'node:assert/strict';
import {newWorld,editObject,addObject,renameWorld} from '../vr-studio/world.js';
import {exportGDevelopProject,GDEVELOP_UNITS_PER_PF_UNIT} from '../vr-studio/gdevelop-project.js';
const decode=new TextDecoder();
function inspectZip(bytes){
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const files=new Map();let p=0;
  while(p+4<=bytes.length&&dv.getUint32(p,true)===0x04034b50){
    const length=dv.getUint32(p+18,true),n=dv.getUint16(p+26,true);
    const extra=dv.getUint16(p+28,true);
    const name=decode.decode(bytes.slice(p+30,p+30+n));
    const offset=p+30+n+extra;
    files.set(name,bytes.slice(offset,offset+length));
    p=offset+length;
  }
  assert.equal(dv.getUint32(p,true),0x02014b50);
  return files;
}
test('real GDevelop native project uses built-in Cube3DObject and valid image resource',()=>{
  const world=renameWorld(
    editObject(addObject(newWorld(),'block'),'obj-4',
      {name:'Workshop',position:[3,2,-5],scale:[2,3,4],yaw:45,color:'#ff8000'}),
    'Original Workshop');
  const source=JSON.stringify(world);
  const artifact=exportGDevelopProject(world);
  assert.equal(artifact.mime,'application/zip');
  assert.deepEqual(artifact.bytes,exportGDevelopProject(world).bytes);
  assert.equal(JSON.stringify(world),source,'canonical world not mutated');
  const files=inspectZip(artifact.bytes);
  assert.deepEqual([...files.keys()],[
    'game.json','assets/neutral-white.png','pixelforge-manifest.json','README.md']);
  const json=JSON.parse(decode.decode(files.get('game.json')));
  assert.equal(json.firstLayout,'PixelForgeWorld');
  assert.equal(json.properties.currentPlatform,'GDevelop JS platform');
  assert.equal(json.layouts.length,1);
  const scene=json.layouts[0];
  assert.equal(scene.objects.length,4);
  assert.equal(scene.instances.length,4);
  assert.equal(scene.events.length,0);
  for(let i=0;i<4;i++){
    assert.equal(scene.objects[i].type,'Scene3D::Cube3DObject');
    assert.equal(scene.objects[i].name,scene.instances[i].name);
    assert.equal(scene.objects[i].content.frontFaceResourceName,'assets/neutral-white.png');
    assert.equal(scene.objects[i].content.bottomFaceResourceName,'assets/neutral-white.png');
    assert.ok(scene.objects[i].persistentUuid);
    assert.ok(scene.instances[i].persistentUuid);
  }
  const box=scene.objects[3],instance=scene.instances[3];
  assert.equal(box.content.tint,'255;128;0');
  assert.equal(box.content.width,200);
  assert.equal(box.content.height,400);
  assert.equal(box.content.depth,300);
  assert.equal(instance.x,640+300-100);
  assert.equal(instance.y,360+500-200);
  assert.equal(instance.z,200-150);
  assert.equal(instance.angle,45);
  assert.equal(GDEVELOP_UNITS_PER_PF_UNIT,100);
  const png=files.get('assets/neutral-white.png');
  assert.deepEqual([...png.slice(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(new DataView(png.buffer,png.byteOffset,png.byteLength).getUint32(16,false),1);
  assert.equal(json.resources.resources[0].name,'assets/neutral-white.png');
  const manifest=JSON.parse(decode.decode(files.get('pixelforge-manifest.json')));
  assert.equal(manifest.sourceToObject[3].id,'obj-4');
  assert.equal(manifest.sourceToObject[3].name,'Workshop');
  assert.equal(manifest.status,'NATIVE_PROJECT_JSON_GENERATED_GDEVELOP_EDITOR_UNTESTED');
});
test('native scene IDs and source snapshots remain deterministic and distinct',()=>{
  const world=newWorld();
  const a=exportGDevelopProject(world).project;
  const b=exportGDevelopProject(world).project;
  assert.deepEqual(a,b);
  assert.equal(new Set(a.layouts[0].instances.map(x=>x.persistentUuid)).size,3);
  assert.equal(new Set(a.layouts[0].objects.map(x=>x.persistentUuid)).size,3);
  assert.equal(a.layouts[0].objectsFolderStructure.children.length,3);
  assert.deepEqual(a.layouts[0].layers[0].cameras.length,1);
});
test('private model bytes are never silently substituted or exported',()=>{
  const asset={asset_id:'ASSET-000021',source_name:'private.glb',byte_length:700,sha256:'a'.repeat(64)};
  const world=addObject(newWorld(),'asset-proxy',asset);
  assert.throws(()=>exportGDevelopProject(world),/Explicitly approve/);
  const exported=exportGDevelopProject(world,{allowPlaceholders:true});
  assert.equal(exported.report.placeholders,1);
  const files=inspectZip(exported.bytes);
  assert.equal(files.size,4);
  assert.ok(!files.has('private.glb'));
  const manifest=JSON.parse(decode.decode(files.get('pixelforge-manifest.json')));
  assert.equal(manifest.sourceToObject[3].placeholderOnly,true);
});
test('rejects unapproved options, runtime claims and corrupt source state',()=>{
  const world=newWorld();
  assert.throws(()=>exportGDevelopProject(world,{executeEditor:true}),/Invalid GDevelop/);
  assert.throws(()=>exportGDevelopProject(world,{allowPlaceholders:'yes'}),/Invalid GDevelop/);
  assert.throws(()=>exportGDevelopProject({...world,runtime:{...world.runtime,physics:'SUPPORTED'}}),/runtime capability/);
});
