// Cross-engine behavior contract v1: declarative, bounded visibility events.
// Never executable JavaScript or privileged instructions in the source artifact.
import {validateWorld} from './world.js';

export const GAMEPLAY_SCHEMA='pixelforge.gameplay.key-visibility.v1';
export const KEY_OPTIONS=Object.freeze(['e','f','space']);
export const VISIBILITY_OPTIONS=Object.freeze(['show','hide']);
const exact=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).every(key=>allowed.includes(key));
export function validateGameplayBlueprint(world,input){
  validateWorld(world);
  if(!exact(input,['schema','worldFormat','worldTitle','rules']) ||
     input.schema!==GAMEPLAY_SCHEMA||input.worldFormat!==world.format||
     input.worldTitle!==world.title||!Array.isArray(input.rules)||
     input.rules.length<1||input.rules.length>12)
    throw Error('Invalid gameplay blueprint or mismatched source world.');
  const ids=new Set(),pairs=new Set();
  for(const rule of input.rules){
    if(!exact(rule,['id','on','key','targetId','effect']) ||
       !/^rule-[0-9]{3}$/.test(rule.id)||rule.on!=='keyReleased'||
       !KEY_OPTIONS.includes(rule.key)||!VISIBILITY_OPTIONS.includes(rule.effect)||
       !world.objects.some(object=>object.id===rule.targetId)||
       ids.has(rule.id)||pairs.has(rule.key+':'+rule.targetId))
      throw Error('Invalid, duplicate or unsupported gameplay rule.');
    ids.add(rule.id);pairs.add(rule.key+':'+rule.targetId);
  }
  // Detached clone, no untrusted references are retained.
  return {
    schema:GAMEPLAY_SCHEMA,worldFormat:world.format,worldTitle:world.title,
    rules:input.rules.map(r=>({id:r.id,on:r.on,key:r.key,targetId:r.targetId,effect:r.effect}))
  };
}
export function createGameplayBlueprint(world,targetId,key='e',effect='hide'){
  validateWorld(world);
  return validateGameplayBlueprint(world,{
    schema:GAMEPLAY_SCHEMA,worldFormat:world.format,worldTitle:world.title,
    rules:[{id:'rule-001',on:'keyReleased',key,targetId,effect}]
  });
}
export function compileGDevelopVisibilityEvents(world,blueprint){
  const validated=validateGameplayBlueprint(world,blueprint);
  return validated.rules.map(rule=>{
    const index=world.objects.findIndex(o=>o.id===rule.targetId);
    const target='PF_Obj_'+String(index+1).padStart(3,'0');
    return {
      type:'BuiltinCommonInstructions::Standard',
      conditions:[{type:{value:'KeyReleased'},parameters:['',rule.key==='space'?'Space':rule.key]}],
      actions:[{type:{value:rule.effect==='hide'?'Hide':'Show'},
        parameters:rule.effect==='hide'?[target]:[target,'']}]
    };
  });
}
