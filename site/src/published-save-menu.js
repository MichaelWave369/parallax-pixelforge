// Rung 16: read-only browser save discovery for published offline games.
// Keeps existing Rung 9 save contract and world-content digest unchanged.
import {parsePlaytestSave,playtestStorageKey,PLAYTEST_SAVE_PREFIX} from './playtest-save.js';

export function inspectBrowserSave(world,digest,storage){
  const key=playtestStorageKey(digest);
  if(!storage||typeof storage.getItem!=='function')
    return {status:'unavailable',reason:'Browser storage is unavailable for this local file.',
      save:null,summary:null,otherSlots:0};
  let raw;
  try{raw=storage.getItem(key);}
  catch{return {status:'unavailable',reason:'Browser storage access was denied.',
    save:null,summary:null,otherSlots:0};}
  let otherSlots=0;
  // Only examine keys, never read or claim the content of another world's slot.
  try{
    const limit=Math.min(Math.max(0,storage.length||0),200);
    for(let index=0;index<limit;index++){
      const name=storage.key(index);
      if(typeof name==='string'&&name.startsWith(PLAYTEST_SAVE_PREFIX)&&name!==key)
        otherSlots++;
    }
  }catch{ /* A usable current slot remains usable even when enumeration is denied. */ }
  if(raw===null)
    return {status:'empty',reason:'No saved run found for this exact world version.',
      save:null,summary:null,otherSlots};
  try{
    const save=parsePlaytestSave(raw,world,digest);
    return {status:'ready',reason:'Verified browser save for this exact world.',
      save,summary:describePublishedSave(save),otherSlots};
  }catch(error){
    return {status:'invalid',reason:'The saved slot is incompatible or damaged: '+error.message,
      save:null,summary:null,otherSlots};
  }
}
export function describePublishedSave(save){
  if(!save||!Number.isSafeInteger(save.saved_at)||!save.progress)
    throw Error('Cannot describe an invalid game save.');
  return {savedAt:save.saved_at,events:save.frames.length,
    pickups:save.progress.collected.length,
    checkpoints:save.progress.triggered.length,
    switches:save.progress.activated.length,
    won:save.progress.won===true};
}
export function importTitleSaveJson(raw,world,digest){
  // Reuse the same 64 KB and replayed-event rules as Rung 9.
  return parsePlaytestSave(raw,world,digest);
}
export function requireFreshRunConfirmation(status){
  // Existing malformed slots must also be protected from accidental overwrites.
  return status==='ready'||status==='invalid';
}
