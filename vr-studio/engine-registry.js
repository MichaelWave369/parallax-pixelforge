// Curated advisory engine shelf, grounded in vendor/project docs (October 2026).
// No software installation, cloud access, engine certification, or executable generation.
import {validateWorld} from './world.js';

const p=(id,name,license,category,url,route,note)=>Object.freeze({id,name,license,category,url,route,note});
export const ENGINE_PROFILES=Object.freeze([
p('godot4','Godot 4','MIT · royalty-free','Native scene target','https://godotengine.org/','GODOT_TSCN_AND_PRIVATE_GLB_PACK','Existing PixelForge Godot 4 .tscn and private project ZIP adapters. Universal GLB is an additional static handoff.'),
p('gdevelop','GDevelop','MIT engine/editor · optional service limits','No-code / visual events','https://gdevelop.io/','RESEARCH_2D_VISUAL','Research native event/layout schema. Universal GLB alone is not a GDevelop project or event sheet.'),
p('defold','Defold','Free source-available · custom Defold License','Lightweight 2D / mobile','https://defold.com/','RESEARCH_2D_MOBILE','Lua/runtime asset pipeline needs separate validation. Not MIT or Apache.'),
p('bevy','Bevy','MIT OR Apache-2.0','Rust ECS / code-first','https://bevy.org/','ADVISORY_GLTF_ONLY','GLB may be used via the engine’s asset loaders. No native Bevy scene or ECS components generated.'),
p('stride','Stride','MIT · royalty-free','C# 3D / VR','https://www.stride3d.net/','ADVISORY_GLTF_ONLY','Editor import and materials require real Stride acceptance testing.'),
p('o3de','Open 3D Engine (O3DE)','Apache-2.0 · review third-party components','Large 3D / simulation','https://o3de.org/','ADVISORY_GLTF_ONLY','Gem/asset-processor handoff needs native adapter qualification.'),
p('playcanvas','PlayCanvas','MIT engine and open-source editor · hosting plans separate','Web 3D / WebXR','https://playcanvas.com/','LOCAL_ENGINE_PROJECT_GENERATED','Standalone PlayCanvas Engine npm/Vite viewer ZIP generated. Real browser and Quest validation remain pending.'),
p('unreal5','Unreal Engine 5','Source-available proprietary · royalties may apply','High-end 3D / VR','https://www.unrealengine.com/','ADVISORY_GLTF_ONLY','Existing governed Unreal -> GLB export is separate; reverse PixelForge -> Unreal world import unqualified.'),
p('unity','Unity','Proprietary · Personal eligibility threshold','General-purpose 2D / 3D','https://unity.com/','ADVISORY_GLTF_ONLY','Unity usually needs an explicit glTF importer; no built-in scene equivalence is claimed.'),
p('gamemaker','GameMaker / GMRT','Proprietary · GMRT commercial change scheduled Jan 2027','2D production','https://gamemaker.io/','RESEARCH_2D_VISUAL','New GMRT policy does not automatically cover every editor/runtime/export option.'),
p('brutal','BRUTAL','MIT-based custom attribution · logo + NOTICE','C# low-level framework','https://github.com/ahwootech/BRUTAL','RESEARCH_FRAMEWORK','Not a full editor, renderer or native import pipeline; check exact attribution/license obligations.'),
p('summer','Summer Engine','Godot-based · verify current service/agent terms','AI-assisted Godot workflow','https://summer.games/build','ADVISORY_GODOT_COMPAT','Godot compatibility is advertised, but exported PixelForge worlds still require independent manual acceptance.')
]);
export function getEngineProfile(id){
  const found=ENGINE_PROFILES.find(p=>p.id===id);
  if(!found)throw Error('Unknown engine profile.');
  return found;
}
export function createEngineHandoff(world,id){
  validateWorld(world);
  const profile=getEngineProfile(id);
  return Object.freeze({
    schema:'pixelforge.engine-handoff.v1',
    source:{format:world.format,title:world.title,
      objectCount:world.objects.length,
      kinds:[...new Set(world.objects.map(x=>x.kind))].sort()},
    engine:{id:profile.id,name:profile.name,officialUrl:profile.url,licenseNote:profile.license},
    route:profile.route,
    instructions:profile.note,
    availableArtifacts:['pixelforge.vr-world.v1 JSON (separate export)','universal standalone static GLB (separate export)']
      .concat(id==='godot4'?['Godot 4 .tscn','Godot private GLB project ZIP']:[])
      .concat(id==='playcanvas'?['Standalone PlayCanvas Engine project ZIP']:[]),
    assetProxyCount:world.objects.filter(o=>o.kind==='asset-proxy').length,
    disclosures:[
      'This file is an advisory handoff plan, not a native engine project, importer, playable game or proof of compatibility.',
      'External GLB assets never accompany the universal GLB; use a separately governed original asset workflow.',
      'Respect engine and third-party asset licensing before distribution.',
      'No behavior, physics, navigation, shaders, NPCs, scripts, quests or VR qualification is transferred.'
    ]
  });
}
