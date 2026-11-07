import test from 'node:test';
import assert from 'node:assert/strict';
import {createSamplePlayableWorld} from '../src/playable-world.js';
import {
  createPlaytestSave,digestPlayableWorld,playtestStorageKey,
  PLAYTEST_SAVE_PREFIX
} from '../src/playtest-save.js';
import {
  inspectBrowserSave,describePublishedSave,importTitleSaveJson,
  requireFreshRunConfirmation
} from '../src/published-save-menu.js';
import {defaultReleaseMetadata} from '../src/release-metadata.js';

const storage=(initial={})=>{
  const items=new Map(Object.entries(initial));
  return {
    get length(){return items.size;},
    getItem(k){return items.has(k)?items.get(k):null;},
    key(i){return [...items.keys()][i]||null;},
    setItem(k,v){items.set(k,v);},
    removeItem(k){items.delete(k);}
  };
};
async function fixture(){
  const world=createSamplePlayableWorld();
  const digest=await digestPlayableWorld(world);
  const save=createPlaytestSave(world,digest,world.spawn,[],1770000000000);
  return {world,digest,save,key:playtestStorageKey(digest)};
}
test('verified same-world browser slot is discovered read-only and exposes human summary',async()=>{
  const {world,digest,save,key}=await fixture();
  const db=storage({[key]:JSON.stringify(save)});
  const result=inspectBrowserSave(world,digest,db);
  assert.equal(result.status,'ready');
  assert.equal(result.reason,'Verified browser save for this exact world.');
  assert.deepEqual(result.save,save);
  assert.deepEqual(result.summary,{
    savedAt:1770000000000,events:0,pickups:0,checkpoints:0,switches:0,won:false
  });
  assert.equal(result.otherSlots,0);
  assert.deepEqual(describePublishedSave(save),result.summary);
});
test('empty and unavailable storage never pretend there is a recoverable game',async()=>{
  const {world,digest}=await fixture();
  const empty=inspectBrowserSave(world,digest,storage());
  assert.equal(empty.status,'empty');
  assert.equal(empty.save,null);
  assert.equal(inspectBrowserSave(world,digest,null).status,'unavailable');
  assert.equal(inspectBrowserSave(world,digest,{getItem(){throw Error('Blocked by file origin');}}).status,'unavailable');
});
test('damaged exact-world slot is preserved, flagged and not automatically cleared',async()=>{
  const {world,digest,key}=await fixture();
  const db=storage({[key]:'{"malformed":true}'});
  const original=db.getItem(key);
  const result=inspectBrowserSave(world,digest,db);
  assert.equal(result.status,'invalid');
  assert.match(result.reason,/incompatible or damaged/);
  assert.equal(db.getItem(key),original);
  assert.equal(result.save,null);
  assert.equal(requireFreshRunConfirmation(result.status),true);
});
test('foreign world/version slots are not read or incorrectly identified as current revisions',async()=>{
  const {world,digest}=await fixture();
  const foreign=PLAYTEST_SAVE_PREFIX+'1'.repeat(64);
  const db=storage({[foreign]:'foreign data that is never parsed'});
  const result=inspectBrowserSave(world,digest,db);
  assert.equal(result.status,'empty');
  assert.equal(result.otherSlots,1);
  const modified=structuredClone(world);modified.gravity=-8;
  const modifiedDigest=await digestPlayableWorld(modified);
  assert.notEqual(modifiedDigest,digest);
  assert.equal(inspectBrowserSave(modified,modifiedDigest,db).status,'empty');
});
test('imported JSON is validated using existing save format without persistence',async()=>{
  const {world,digest,save}=await fixture();
  assert.deepEqual(importTitleSaveJson(JSON.stringify(save),world,digest),save);
  assert.throws(()=>importTitleSaveJson('invalid json',world,digest),SyntaxError);
  const other=structuredClone(world);other.gravity=-7.5;
  const otherDigest=await digestPlayableWorld(other);
  assert.throws(()=>importTitleSaveJson(JSON.stringify(save),other,otherDigest),/different playable world/);
});
test('release branding changes do not invalidate same-world game progress',async()=>{
  const {world,digest,save,key}=await fixture();
  const identity=defaultReleaseMetadata(world.title);
  const changed={...identity,title:'Entirely Different Cover Title',version:'4.3.0',creator:'Another Studio'};
  assert.notDeepEqual(changed,identity);
  const nextDigest=await digestPlayableWorld(world);
  assert.equal(nextDigest,digest);
  assert.deepEqual(inspectBrowserSave(world,nextDigest,storage({[key]:JSON.stringify(save)})).save,save);
});
test('new-game confirmation is required for existing healthy or damaged slots, never empty or denied storage',()=>{
  assert.equal(requireFreshRunConfirmation('ready'),true);
  assert.equal(requireFreshRunConfirmation('invalid'),true);
  for(const kind of ['checking','unavailable','empty'])
    assert.equal(requireFreshRunConfirmation(kind),false);
});
test('title picker tolerates blocked key enumeration when the current slot is still readable',async()=>{
  const {world,digest,save,key}=await fixture();
  const db={getItem:k=>k===key?JSON.stringify(save):null,
    get length(){throw Error('enumeration restricted');},key(){throw Error('restricted');}};
  const result=inspectBrowserSave(world,digest,db);
  assert.equal(result.status,'ready');
  assert.equal(result.otherSlots,0);
});
