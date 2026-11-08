// Optional bounded gameplay loadout. This file has no dependencies on Maker or browser globals.
// Imported scene data is validated, never interpreted as executable abilities or scripts.
export const COMBAT_STYLES=Object.freeze(['balanced','agile','heavy','arcane']);
export const EQUIPMENT_TYPES=Object.freeze(['weapon','shield','relic','armor']);
export const COMBAT_EFFECTS=Object.freeze(['guard-pulse','bonus-damage','life-steal','extra-range','speed-burst']);
const ID=/^[a-z][a-z0-9-]{0,47}$/;
function reject(msg){throw Error('Metroidvania combat profile: '+msg);}
function exact(value,allowed,label){
  if(!value||typeof value!=='object'||Array.isArray(value))reject(label+' must be an object.');
  if(Object.keys(value).some(k=>!allowed.includes(k)))reject(label+' has unsupported fields.');
}
function ident(s,label){if(typeof s!=='string'||!ID.test(s))reject(label+' must be a safe lowercase ID.');return s;}
function name(s,label,max=80){
  if(typeof s!=='string'||!s.trim()||s.length>max||/[\x00-\x1f]/.test(s))reject(label+' must be short plain text.');
  return s.trim();
}
function choice(s,values,label){if(!values.includes(s))reject('unknown '+label+'.');return s;}
export function normalizeCombatProfile(source){
  if(source==null)return null;
  exact(source,['id','name','movement','equipment','synergies'],'profile');
  const id=ident(source.id,'character ID'),title=name(source.name,'character name',70);
  const movement=choice(source.movement,COMBAT_STYLES,'movement');
  if(!Array.isArray(source.equipment)||source.equipment.length>2)reject('at most two equipped items.');
  const equipment=source.equipment.map((item,i)=>{
    exact(item,['id','name','type'],'equipment '+i);
    return {id:ident(item.id,'equipment ID'),name:name(item.name,'equipment name',70),
      type:choice(item.type,EQUIPMENT_TYPES,'equipment type')};
  });
  if(new Set(equipment.map(i=>i.id)).size!==equipment.length)reject('duplicate equipment.');
  if(!Array.isArray(source.synergies)||source.synergies.length>1)reject('at most one two-item synergy.');
  const equipped=new Set(equipment.map(i=>i.id));
  const synergies=source.synergies.map((entry,i)=>{
    exact(entry,['id','name','itemA','itemB','effect'],'synergy '+i);
    const itemA=ident(entry.itemA,'synergy item A'),itemB=ident(entry.itemB,'synergy item B');
    if(itemA===itemB||!equipped.has(itemA)||!equipped.has(itemB))
      reject('synergy requires two different equipped items.');
    return {id:ident(entry.id,'synergy ID'),name:name(entry.name,'synergy name'),
      itemA,itemB,effect:choice(entry.effect,COMBAT_EFFECTS,'effect')};
  });
  return {id,name:title,movement,equipment,synergies};
}
export function combatEffects(profile){
  return new Set(profile?.synergies?.map(s=>s.effect)||[]);
}
export function combatMovementSpeed(style){
  return {balanced:265,agile:305,heavy:217,arcane:252}[style]||265;
}
