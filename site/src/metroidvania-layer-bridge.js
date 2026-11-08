// PixelForge Metroidvania Maker -> existing Layer Studio playable room runtime.
// This converter creates original, deterministic placeholder geometry and ability gates.
// It does NOT export Unreal/Fab assets, purchased music, character meshes or combat synergies.
import {createScene,normalizeScene} from '../../layer-studio/engine.js';
import {validateMetroidvaniaProject,PROJECT_SCHEMA} from './metroidvania-content.js';

export const LAYER_BRIDGE_VERSION='pixelforge.metroidvania-layer-bridge.v1';
const MAX_LAYER_ROOMS=6;
const MAX_PORTALS=8;
function fail(message){throw Error('Metroidvania playable bridge: '+message);}
function safeRoom(scene){
  return {schema:scene.schema,title:scene.title,width:scene.width,height:scene.height,
    camera:scene.camera,layers:scene.layers,playable:scene.playable};
}
export function buildMetroidvaniaLayerScene(worldInput,contentInput,characterId){
  const project=validateMetroidvaniaProject({format:PROJECT_SCHEMA,world:worldInput,content:contentInput});
  const {world,content}=project;
  if(world.rooms.length>MAX_LAYER_ROOMS)fail('The Layer Studio prototype supports at most six rooms; your atlas stays unchanged.');
  const character=content.characters.find(entry=>entry.id===characterId);
  if(!character)fail('Select an existing playable character before previewing.');

  // Two-way links become two distinct physical doors. Do not truncate authored routes.
  const routes=[];
  for(const link of world.links){
    routes.push({id:link.id+'-forward',from:link.from,to:link.to,requires:link.requires});
    if(link.twoWay)routes.push({id:link.id+'-return',from:link.to,to:link.from,requires:link.requires});
  }
  const outgoing=new Map(world.rooms.map(room=>[room.id,[]]));
  for(const route of routes){
    const entries=outgoing.get(route.from);
    entries.push(route);
    if(entries.length>MAX_PORTALS)fail('Room '+route.from+' has more than eight directed passages; edit the atlas first.');
  }

  const template=createScene();
  // This rung deliberately supports only physical breakable-wall discoveries.
  // Other secret types stay design-only until their gameplay mechanics exist.
  const authoredWalls=new Map(world.rooms.map(room=>[room.id,[]]));
  for(const secret of content.secrets){
    if(secret.type!=='breakable-wall')continue;
    const walls=authoredWalls.get(secret.roomId);
    if(walls.length>=8)fail('Room '+secret.roomId+' has more than eight breakable secrets.');
    const n=walls.length;
    walls.push({id:secret.id,name:secret.name,x:365+n*180,y:442,w:36,h:58,
      requiresAbilities:[...secret.requires]});
  }
  const rooms=world.rooms.map((room,i)=>{
    const scene=safeRoom(createScene());
    scene.title=room.name;
    const exits=outgoing.get(room.id);
    const hasDashRoute=exits.some(route=>route.requires.includes('shadow-dash'));
    // An original 250-unit gap makes the authored Shadow Dash physically meaningful.
    // The normal jump alone is shorter than the gap; successful jumps require timing.
    scene.playable.platforms=hasDashRoute?[
      {id:'near-floor',x:0,y:500,w:700,h:40},
      {id:'far-floor',x:950,y:500,w:750,h:40}
    ]:[{id:'continuous-floor',x:0,y:500,w:1700,h:40}];
    scene.playable.spawn={x:72,y:458};
    scene.playable.enemies=[{id:'room-wraith',x:480+i*19,y:448,w:36,h:52}];
    scene.playable.key={x:1600,y:455};
    scene.playable.gate={x:1630,y:424};
    const portals=exits.map((route,n)=>{
      const dashRoute=route.requires.includes('shadow-dash');
      const plainIndex=exits.slice(0,n).filter(r=>!r.requires.includes('shadow-dash')).length;
      const dashIndex=exits.slice(0,n).filter(r=>r.requires.includes('shadow-dash')).length;
      const x=dashRoute?1090+dashIndex*120:160+plainIndex*145;
      return {id:route.id,x,y:424,w:56,h:76,targetRoom:route.to,
        arrivalX:110,arrivalY:458,requiresKey:false,requiresAbilities:[...route.requires],
        label:'ENTER '+world.rooms.find(r=>r.id===route.to).name.toUpperCase().slice(0,30)};
    });
    return {id:room.id,title:room.name,scene,portals,relics:[],
      breakables:authoredWalls.get(room.id),
      grantsAbilities:[...room.grants]};
  });
  const atlas={
    schema:'pixelforge.layer-atlas.v1',startRoom:world.startRoom,
    abilities:world.abilities.map(a=>a.id),
    startingAbilities:[...character.startingAbilities],
    combatMode:'chain',
    rooms,quests:[]
  };
  return normalizeScene({...template,title:world.title+' · '+character.name,
    atlas});
}
