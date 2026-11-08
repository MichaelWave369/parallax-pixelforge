// Metroidvania Maker Rung 2: optional data-only creative-design sidecar.
// No combat, physics, sound playback, private assets, or runtime authority is implied.
import {validateMetroidvaniaWorld,analyzeMetroidvaniaWorld} from './metroidvania-world.js';

export const CONTENT_SCHEMA='pixelforge.metroidvania-content.v1';
export const PROJECT_SCHEMA='pixelforge.metroidvania-project.v1';
export const CONTENT_LIMITS=Object.freeze({characters:8,items:32,synergies:24,secrets:48,quietSpaces:16,bytes:65536,projectBytes:131072});
export const MOVEMENT_STYLES=['balanced','agile','heavy','arcane'];
export const ITEM_TYPES=['weapon','shield','relic','armor'];
export const SECRET_TYPES=['breakable-wall','false-floor','concealed-door','hidden-ceiling'];
export const SYNERGY_EFFECTS=['guard-pulse','bonus-damage','life-steal','extra-range','speed-burst'];
export const MOODS=['haunting','serene','ominous','wind-and-rain','silence'];

const ID=/^[a-z][a-z0-9-]{0,47}$/;
function invalid(message){throw Error('Metroidvania content: '+message);}
function object(value,keys,label){
  if(value===null||typeof value!=='object'||Array.isArray(value))invalid(label+' must be an object.');
  if(Object.keys(value).some(k=>!keys.includes(k)))invalid(label+' contains unsupported fields.');
}
function ident(value,label){if(typeof value!=='string'||!ID.test(value))invalid(label+' needs a safe lowercase ID.');return value;}
function label(value,max,name){
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x1f]/.test(value))invalid(name+' must be short, nonempty plain text.');
  return value.trim();
}
function bounded(values,count,name){
  if(!Array.isArray(values)||values.length>count)invalid(name+' exceeds its size limit.');
  return values;
}
function unique(values,name){if(new Set(values).size!==values.length)invalid('duplicate '+name+'.');}
function refs(values,allowed,max,name){
  const list=bounded(values,max,name).map(v=>ident(v,name));
  unique(list,name);
  for(const id of list)if(!allowed.has(id))invalid(name+' refers to missing '+id+'.');
  return list;
}
function option(value,options,name){if(!options.includes(value))invalid('unsupported '+name+'.');return value;}
function byteLength(value){return new TextEncoder().encode(JSON.stringify(value)).length;}

export function validateMetroidvaniaContent(input,worldInput){
  const world=validateMetroidvaniaWorld(worldInput);
  const abilityIds=new Set(world.abilities.map(a=>a.id));
  const roomIds=new Set(world.rooms.map(r=>r.id));
  object(input,['format','characters','items','synergies','secrets','quietSpaces'],'root');
  if(input.format!==CONTENT_SCHEMA)invalid('unsupported format.');
  const items=bounded(input.items,CONTENT_LIMITS.items,'items').map((item,i)=>{
    object(item,['id','name','type'],'item #'+i);
    return {id:ident(item.id,'item ID'),name:label(item.name,70,'item name'),type:option(item.type,ITEM_TYPES,'item type')};
  });
  unique(items.map(x=>x.id),'item ID');
  const itemIds=new Set(items.map(x=>x.id));
  const characters=bounded(input.characters,CONTENT_LIMITS.characters,'characters').map((character,i)=>{
    object(character,['id','name','movement','startingAbilities','equipment'],'character #'+i);
    return {id:ident(character.id,'character ID'),name:label(character.name,70,'character name'),
      movement:option(character.movement,MOVEMENT_STYLES,'movement style'),
      startingAbilities:refs(character.startingAbilities,abilityIds,16,'starting abilities'),
      equipment:refs(character.equipment,itemIds,2,'equipped items')};
  });
  unique(characters.map(x=>x.id),'character ID');
  const synergies=bounded(input.synergies,CONTENT_LIMITS.synergies,'synergies').map((entry,i)=>{
    object(entry,['id','name','itemA','itemB','effect'],'synergy #'+i);
    const itemA=ident(entry.itemA,'itemA'),itemB=ident(entry.itemB,'itemB');
    if(itemA===itemB||!itemIds.has(itemA)||!itemIds.has(itemB))invalid('synergy needs two distinct existing items.');
    return {id:ident(entry.id,'synergy ID'),name:label(entry.name,80,'synergy name'),itemA,itemB,
      effect:option(entry.effect,SYNERGY_EFFECTS,'synergy effect')};
  });
  unique(synergies.map(x=>x.id),'synergy ID');
  unique(synergies.map(x=>[x.itemA,x.itemB].sort().join('+')),'synergy pair');
  const secrets=bounded(input.secrets,CONTENT_LIMITS.secrets,'secrets').map((secret,i)=>{
    object(secret,['id','name','roomId','type','requires'],'secret #'+i);
    const roomId=ident(secret.roomId,'secret room');
    if(!roomIds.has(roomId))invalid('secret room does not exist.');
    return {id:ident(secret.id,'secret ID'),name:label(secret.name,70,'secret name'),roomId,
      type:option(secret.type,SECRET_TYPES,'secret type'),
      requires:refs(secret.requires,abilityIds,16,'secret requirements')};
  });
  unique(secrets.map(x=>x.id),'secret ID');
  const quietSpaces=bounded(input.quietSpaces,CONTENT_LIMITS.quietSpaces,'quiet spaces').map((space,i)=>{
    object(space,['roomId','name','mood','note'],'quiet space #'+i);
    const roomId=ident(space.roomId,'quiet room');
    if(!roomIds.has(roomId))invalid('quiet-space room does not exist.');
    return {roomId,name:label(space.name,80,'quiet-space name'),
      mood:option(space.mood,MOODS,'ambient mood'),
      note:typeof space.note==='string'&&space.note.length<=160&&!/[\x00-\x1f]/.test(space.note)?space.note:(()=>invalid('quiet-space note exceeds limit.'))()};
  });
  unique(quietSpaces.map(x=>x.roomId),'quiet-space room');
  const result={format:CONTENT_SCHEMA,characters,items,synergies,secrets,quietSpaces};
  if(byteLength(result)>CONTENT_LIMITS.bytes)invalid('content exceeds the 64 KB limit.');
  return result;
}

export function createMetroidvaniaContent(worldInput){
  const world=validateMetroidvaniaWorld(worldInput);
  const hasAbility=id=>world.abilities.some(a=>a.id===id);
  const hasRoom=id=>world.rooms.some(r=>r.id===id);
  const special=hasRoom('cathedral-nave')&&hasRoom('forgotten-crypt')&&hasRoom('moon-library');
  const sample={
    format:CONTENT_SCHEMA,
    items:[
      {id:'moonblade',name:'Moonblade',type:'weapon'},
      {id:'pilgrim-whip',name:'Pilgrim Chain',type:'weapon'},
      {id:'oath-shield',name:'Oath Shield',type:'shield'},
      {id:'silver-focus',name:'Silver Focus',type:'relic'}
    ],
    characters:[
      {id:'wanderer',name:'The Wanderer',movement:'balanced',startingAbilities:[],equipment:['moonblade']},
      {id:'hunter',name:'The Hunter',movement:'agile',startingAbilities:hasAbility('shadow-dash')?['shadow-dash']:[],equipment:['pilgrim-whip','silver-focus']},
      {id:'sentinel',name:'The Sentinel',movement:'heavy',startingAbilities:[],equipment:['oath-shield','silver-focus']}
    ],
    synergies:[
      {id:'resonant-ward',name:'Resonant Ward',itemA:'oath-shield',itemB:'silver-focus',effect:'guard-pulse'},
      {id:'far-reaching-covenant',name:'Far-Reaching Covenant',itemA:'pilgrim-whip',itemB:'silver-focus',effect:'extra-range'},
      {id:'moonfire-pact',name:'Moonfire Pact',itemA:'moonblade',itemB:'oath-shield',effect:'bonus-damage'},
      {id:'renewal-link',name:'Renewal Link',itemA:'pilgrim-whip',itemB:'oath-shield',effect:'life-steal'},
      {id:'swift-silver',name:'Swift Silver',itemA:'moonblade',itemB:'silver-focus',effect:'speed-burst'}
    ],
    secrets:special?[
      {id:'cracked-crypt-wall',name:'Cracked Crypt Wall',roomId:'forgotten-crypt',type:'breakable-wall',requires:hasAbility('shadow-dash')?['shadow-dash']:[]},
      {id:'forgotten-archive',name:'Forgotten Archive',roomId:'moon-library',type:'concealed-door',requires:hasAbility('mist-form')?['mist-form']:[]}
    ]:[],
    quietSpaces:[
      {roomId:hasRoom('cathedral-nave')?'cathedral-nave':world.startRoom,
        name:'Moonlit Pause',mood:'haunting',note:'A place to stop, listen, and enjoy the atmosphere without an objective.'}
    ]
  };
  return validateMetroidvaniaContent(sample,world);
}

export function analyzeMetroidvaniaCharacter(worldInput,contentInput,characterId,equippedOverride=null){
  const world=validateMetroidvaniaWorld(worldInput);
  const content=validateMetroidvaniaContent(contentInput,world);
  const character=content.characters.find(c=>c.id===characterId);
  if(!character)invalid('character does not exist.');
  const equipment=equippedOverride===null?character.equipment:
    refs(equippedOverride,new Set(content.items.map(i=>i.id)),2,'equipped items');
  const progression=analyzeMetroidvaniaWorld(world,{startingAbilities:character.startingAbilities});
  const rooms=new Set(progression.reachable),abilities=new Set(progression.unlocked),gear=new Set(equipment);
  const discoverableSecrets=content.secrets.filter(s=>rooms.has(s.roomId)&&s.requires.every(a=>abilities.has(a))).map(s=>s.id);
  const activeSynergies=content.synergies.filter(s=>gear.has(s.itemA)&&gear.has(s.itemB)).map(s=>s.id);
  return {characterId:character.id,movement:character.movement,equipment,
    progression,discoverableSecrets,activeSynergies,
    quietSpaces:content.quietSpaces.filter(q=>rooms.has(q.roomId)).map(q=>q.roomId)};
}

export function validateMetroidvaniaProject(input){
  object(input,['format','world','content'],'project');
  if(input.format!==PROJECT_SCHEMA)invalid('unsupported project format.');
  const world=validateMetroidvaniaWorld(input.world);
  const content=validateMetroidvaniaContent(input.content,world);
  const result={format:PROJECT_SCHEMA,world,content};
  if(byteLength(result)>CONTENT_LIMITS.projectBytes)invalid('project exceeds 128 KB.');
  return result;
}
