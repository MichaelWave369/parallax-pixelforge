import test from 'node:test';
import assert from 'node:assert/strict';
import {newWorld,addObject,editObject,renameWorld} from '../vr-studio/world.js';
import {ENGINE_TARGETS,exportSceneForEngine} from '../vr-studio/engine-export.js';

test('engine catalog distinguishes one static exporter from roadmap targets',()=>{
  assert.deepEqual(ENGINE_TARGETS.map(target=>target.id),['godot4','unreal5','unity','bevy']);
  assert.equal(ENGINE_TARGETS[0].status,'STATIC_SCENE_EXPORT');
  for(const target of ENGINE_TARGETS.slice(1)){
    assert.match(target.status,/PLANNED/);
    assert.throws(()=>exportSceneForEngine(newWorld(),target.id),/No qualified scene exporter/);
  }
});
test('Godot 4 text scene maps every source cube, position, yaw, scale and color',()=>{
  const world=editObject(addObject(newWorld(),'block'),'obj-4',
    {name:'Gate',position:[3,-2,-5],scale:[2,3,4],yaw:90,color:'#ff8000'});
  const source=JSON.stringify(world);
  const a=exportSceneForEngine(world);
  const b=exportSceneForEngine(world);
  assert.equal(a.content,b.content);
  assert.equal(JSON.stringify(world),source);
  assert.match(a.content,/^\[gd_scene load_steps=9 format=3\]/);
  assert.equal((a.content.match(/type="MeshInstance3D"/g)||[]).length,4);
  assert.equal((a.content.match(/type="BoxMesh"/g)||[]).length,4);
  assert.match(a.content,/position = Vector3\(3, -2, -5\)/);
  assert.match(a.content,/rotation = Vector3\(0, 1\.570796, 0\)/);
  assert.match(a.content,/scale = Vector3\(2, 3, 4\)/);
  assert.match(a.content,/albedo_color = Color\(1, 0\.501961, 0, 1\)/);
  assert.equal(a.report.proxyCount,0);
  assert.equal(a.report.status,'STATIC_PRIMITIVES_ONLY');
});
test('names are serialized as quoted metadata rather than scene syntax',()=>{
  const title='Shasta "Institute"\n[evil_node]';
  const w=renameWorld(newWorld(),title);
  const artifact=exportSceneForEngine(w);
  assert.ok(artifact.content.includes('metadata/pixelforge_title = '+JSON.stringify(title)));
  assert.equal((artifact.content.match(/^\[node /gm)||[]).length,w.objects.length+1);
});
test('asset proxies fail closed unless a user explicitly chooses layout placeholders',()=>{
  const asset={asset_id:'ASSET-000021',source_name:'private.glb',byte_length:700,
    sha256:'a'.repeat(64)};
  const w=addObject(newWorld(),'asset-proxy',asset);
  assert.throws(()=>exportSceneForEngine(w),/approve placeholder geometry/);
  const exportWithProxy=exportSceneForEngine(w,'godot4',{allowPlaceholders:true});
  assert.equal(exportWithProxy.report.proxyCount,1);
  assert.equal(exportWithProxy.report.status,'STATIC_LAYOUT_WITH_EXPLICIT_PROXIES');
  assert.match(exportWithProxy.content,/metadata\/pixelforge_placeholder_only = true/);
  assert.match(exportWithProxy.content,/ASSET-000021/);
  assert.doesNotMatch(exportWithProxy.content,/private\.glb/);
});
test('invalid source data and export options do not create partially trusted exports',()=>{
  const w=newWorld();
  assert.throws(()=>exportSceneForEngine({...w,runtime:{...w.runtime,physics:'QUALIFIED'}}),/runtime capability/);
  assert.throws(()=>exportSceneForEngine(w,'godot4',{runScripts:true}),/Invalid export options/);
  assert.throws(()=>exportSceneForEngine(w,'godot4',{allowPlaceholders:'yes'}),/Invalid export options/);
});
