// PixelForge Engine Export v1: bounded, read-only adapters over the canonical VR world.
// No executable scripts, purchased assets, game runtime, or execution authority is exported.
import {validateWorld} from './world.js';

export const ENGINE_TARGETS = Object.freeze([
  Object.freeze({id:'godot4', label:'Godot 4.x', status:'STATIC_SCENE_EXPORT', extension:'.tscn'}),
  Object.freeze({id:'unreal5', label:'Unreal Engine 5', status:'PLANNED_SCENE_ADAPTER', extension:null}),
  Object.freeze({id:'unity', label:'Unity', status:'PLANNED_SCENE_ADAPTER', extension:null}),
  Object.freeze({id:'bevy', label:'Bevy', status:'PLANNED_SCENE_ADAPTER', extension:null})
]);
const number = n => Object.is(n,-0) ? '0' : String(Number(n.toFixed(6)));
const quoted = value => JSON.stringify(value);
const vector = values => 'Vector3(' + values.map(number).join(', ') + ')';
const color = hex => {
  const rgb=[1,3,5].map(index => parseInt(hex.slice(index,index+2),16)/255);
  return 'Color(' + [...rgb,1].map(number).join(', ') + ')';
};
const idOf = i => String(i+1);

export function exportSceneForEngine(world,target='godot4',options={}) {
  validateWorld(world);
  if(target!=='godot4')throw new Error('No qualified scene exporter for '+String(target)+'.');
  if(!options || typeof options!=='object' || Array.isArray(options) ||
     Object.keys(options).some(key=>!['allowPlaceholders','referenceAssets'].includes(key)) ||
     (options.allowPlaceholders!==undefined && typeof options.allowPlaceholders!=='boolean') ||
     (options.referenceAssets!==undefined && typeof options.referenceAssets!=='boolean') ||
     (options.referenceAssets===true && options.allowPlaceholders===true))
    throw new Error('Invalid export options.');
  const proxies=world.objects.filter(object=>object.kind==='asset-proxy');
  if(proxies.length && options.allowPlaceholders!==true && options.referenceAssets!==true)
    throw new Error('Scene has '+proxies.length+' asset proxy/proxies. Rebind and export assets separately; approve placeholder geometry for a layout-only Godot export.');
  const referencing=options.referenceAssets===true;
  const hashes=[...new Set(proxies.map(o=>o.asset.sha256))].sort();
  const primitiveCount=world.objects.length-(referencing?proxies.length:0);
  const lines=['[gd_scene load_steps='+String(primitiveCount*2+(referencing?hashes.length:0)+1)+' format=3]',''];
  if(referencing){
    for(let i=0;i<hashes.length;i++)
      lines.push('[ext_resource type="PackedScene" path="res://assets/'+hashes[i]+'.glb" id="GLB_'+idOf(i)+'"]');
    if(hashes.length)lines.push('');
  }
  for(let i=0;i<world.objects.length;i++){
    const object=world.objects[i],id=idOf(i);
    if(referencing && object.kind==='asset-proxy')continue;
    lines.push('[sub_resource type="StandardMaterial3D" id="Mat_'+id+'"]',
      'albedo_color = '+color(object.color),'',
      '[sub_resource type="BoxMesh" id="Mesh_'+id+'"]',
      'material = SubResource("Mat_'+id+'")','');
  }
  lines.push('[node name="PixelForgeWorld" type="Node3D"]',
    'metadata/pixelforge_source_format = '+quoted(world.format),
    'metadata/pixelforge_title = '+quoted(world.title),'');
  for(let i=0;i<world.objects.length;i++){
    const object=world.objects[i],id=idOf(i);
    lines.push(referencing && object.kind==='asset-proxy'
      ? '[node name="Obj_'+id+'" parent="." instance=ExtResource("GLB_'+idOf(hashes.indexOf(object.asset.sha256))+'")]'
      : '[node name="Obj_'+id+'" type="MeshInstance3D" parent="."]',
      'position = '+vector(object.position),
      'rotation = '+vector([0,object.yaw*Math.PI/180,0]),
      'scale = '+vector(object.scale));
    if(!(referencing && object.kind==='asset-proxy'))lines.push('mesh = SubResource("Mesh_'+id+'")');
    lines.push('metadata/pixelforge_id = '+quoted(object.id),
      'metadata/pixelforge_name = '+quoted(object.name),
      'metadata/pixelforge_kind = '+quoted(object.kind));
    if(object.kind==='asset-proxy'){
      if(!referencing)lines.push('metadata/pixelforge_placeholder_only = true');
      lines.push('metadata/pixelforge_asset_id = '+quoted(object.asset.asset_id),
        'metadata/pixelforge_asset_sha256 = '+quoted(object.asset.sha256));
    }
    lines.push('');
  }
  return Object.freeze({
    target:'godot4',
    filename:'pixelforge-world.godot4.tscn',
    mime:'text/plain;charset=utf-8',
    content:lines.join('\n')+'\n',
    report:Object.freeze({
      status:referencing?'REFERENCED_GLB_FILES_REQUIRED':proxies.length?'STATIC_LAYOUT_WITH_EXPLICIT_PROXIES':'STATIC_PRIMITIVES_ONLY',
      objectCount:world.objects.length,
      proxyCount:proxies.length,
      limitations:Object.freeze([referencing?'External GLB assets MUST accompany this scene; references alone are not files':'No external GLB bytes or licensed assets included',
        'No collision, physics, navigation, quests, agents, save data, playable controller or verified VR compatibility',
        'Lighting and fog are not translated; material appearance may differ by renderer'])
    })
  });
}
