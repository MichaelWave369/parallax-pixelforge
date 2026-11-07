import test from 'node:test';
import assert from 'node:assert/strict';
import {createSamplePlayableWorld,parsePlayableWorld} from '../src/playable-world.js';
import {buildOfflineHtml} from '../src/offline-publisher.js';
import {makeOfflineTemplate} from './build-publisher.mjs';
import {
  EXTRAS_FORMAT,EXTRAS_TOKEN,COVER_MAX_BYTES,EXTRAS_MAX_BYTES,
  defaultReleaseExtras,validateReleaseExtras,resolveReleaseExtras,
  safeEmbeddedExtrasJson,validateCoverFile
} from '../src/release-extras.js';
import {
  RUNTIME_PACKAGES,NOTICES_FORMAT,NOTICES_MAX_BYTES,
  validateBundledNotices,emptyBundledNotices
} from '../src/license-notices.js';

const template=()=>makeOfflineTemplate('console.log("offline player loaded")','body{color:white}');
const get=(html,id)=>html.match(new RegExp('<script type="application/json" id="'+id+'">([\\s\\S]*?)<\\/script>'))?.[1];
const cover=(type,bytes)=>({dataUrl:'data:'+type+';base64,'+btoa(bytes),alt:'My original artwork'});
test('Rung 15 defaults preserve original world and Rung 14 release metadata byte content',()=>{
  const world=createSamplePlayableWorld(),before=JSON.stringify(world);
  const html=buildOfflineHtml(world,template());
  assert.equal(html.includes(EXTRAS_TOKEN),false);
  assert.deepEqual(JSON.parse(get(html,'pixelforge-embedded-extras')),defaultReleaseExtras());
  assert.deepEqual(parsePlayableWorld(get(html,'pixelforge-embedded-world')),world);
  assert.equal(JSON.stringify(world),before);
  assert.equal(resolveReleaseExtras(null).format,EXTRAS_FORMAT);
});
test('cover PNG, JPEG and WebP signatures pass without uploading any external assets',()=>{
  const png=cover('image/png','\x89PNG\r\n\x1a\n'+'x'.repeat(20));
  const jpg=cover('image/jpeg','\xff\xd8\xff'+ 'x'.repeat(20));
  const webp=cover('image/webp','RIFF'+ '0000'+'WEBP'+ 'x'.repeat(20));
  for(const entry of [png,jpg,webp]){
    const source={...defaultReleaseExtras(),cover:entry};
    const parsed=validateReleaseExtras(source);
    assert.deepEqual(parsed.cover,entry);
    const html=buildOfflineHtml(createSamplePlayableWorld(),template(),null,source);
    assert.equal(html.includes('connect-src \'none\''),true);
    assert.deepEqual(JSON.parse(get(html,'pixelforge-embedded-extras')).cover,entry);
  }
});
test('reject SVG, GIF, script, wrong MIME bytes, noncanonical data and excessive cover sizes',()=>{
  const base=defaultReleaseExtras(),fake=cover('image/png','GIF89a'+'x'.repeat(30));
  assert.throws(()=>validateReleaseExtras({...base,cover:fake}),/bytes do not match/);
  assert.throws(()=>validateReleaseExtras({...base,cover:{...fake,
    dataUrl:'data:image/svg+xml;base64,PHN2Zz4='}}),/PNG, JPEG or WebP/);
  assert.throws(()=>validateReleaseExtras({...base,cover:{...fake,
    dataUrl:'data:image/gif;base64,R0lGODlh'}}),/PNG, JPEG or WebP/);
  assert.throws(()=>validateReleaseExtras({...base,cover:{...fake,
    dataUrl:'https://example.invalid/cover.png'}}),/PNG, JPEG or WebP/);
  const invalid=cover('image/png','\x89PNG\r\n\x1a\n'+'x'.repeat(3));
  assert.throws(()=>validateReleaseExtras({...base,cover:{...invalid,dataUrl:invalid.dataUrl+'AAA'}}),/base64/);
  assert.throws(()=>validateReleaseExtras({...base,cover:{...invalid,alt:' '}}),/Cover description/);
  assert.throws(()=>validateReleaseExtras({...base,cover:{...invalid,executable:'yes'}}),/unsupported/);
  assert.throws(()=>validateReleaseExtras({...base,cover:cover('image/png','\x89PNG\r\n\x1a\n'+'a'.repeat(COVER_MAX_BYTES))}),/bounded|320 KB/);
  assert.throws(()=>validateCoverFile({type:'image/svg+xml',size:80}),/PNG, JPEG or WebP/);
  assert.throws(()=>validateCoverFile({type:'image/png',size:COVER_MAX_BYTES+1}),/320 KB/);
  assert.ok(EXTRAS_MAX_BYTES>COVER_MAX_BYTES);
});
test('creator credits and content rights stay bounded and cannot inject HTML execution',()=>{
  const extras={...defaultReleaseExtras(),credits:[
    {role:'Design',name:'A creator <script>alert(1)</script>'},
    {role:'Sound',name:'An independent musician'}
  ],contentNotice:'Original game content by the author </script><img src=x onerror=alert(1)>'};
  const json=safeEmbeddedExtrasJson(extras);
  assert.equal(json.includes('</script>'),false);
  assert.ok(json.includes('\\u003c/script\\u003e'));
  assert.deepEqual(JSON.parse(json),extras);
  assert.throws(()=>validateReleaseExtras({...extras,credits:Array.from({length:9},(_,i)=>({
    role:'Artist',name:String(i)}))}),/eight/);
  assert.throws(()=>validateReleaseExtras({...extras,credits:[{role:'',name:'X'}]}),/role/);
  assert.throws(()=>validateReleaseExtras({...extras,credits:[{role:'Art',name:'X',url:'bad'}]}),/unsupported/);
  assert.throws(()=>validateReleaseExtras({...extras,contentNotice:'x'.repeat(641)}),/bounded/);
  assert.throws(()=>validateReleaseExtras({...extras,html:'<script>bad</script>'}),/unsupported/);
});
test('bundled license descriptions are strict, bounded and cannot duplicate package identities',()=>{
  const example=()=>({format:NOTICES_FORMAT,packages:[
    {...RUNTIME_PACKAGES[0],text:'MIT License\n'+'z'.repeat(330)}
  ]});
  assert.deepEqual(validateBundledNotices(example()),example());
  assert.deepEqual(emptyBundledNotices(),{format:NOTICES_FORMAT,packages:[]});
  assert.throws(()=>validateBundledNotices({format:'other',packages:[]}),/Unsupported/);
  assert.throws(()=>validateBundledNotices({...example(),scripts:['x']}),/Unsupported/);
  const duplicated=example();duplicated.packages.push({...duplicated.packages[0]});
  assert.throws(()=>validateBundledNotices(duplicated),/Duplicate/);
  const wrong=example();wrong.packages[0].license='Proprietary';
  assert.throws(()=>validateBundledNotices(wrong),/Unknown or malformed/);
  const unknown=example();unknown.packages[0].name='unknown';
  assert.throws(()=>validateBundledNotices(unknown),/Unknown or malformed/);
  assert.ok(NOTICES_MAX_BYTES>50_000);
});
test('published extras do not accept anything that changes playable-world capabilities',()=>{
  const world=createSamplePlayableWorld();
  const original=JSON.stringify(world);
  const extras={...defaultReleaseExtras(),credits:[{role:'Story',name:'Test Creator'}]};
  const html=buildOfflineHtml(world,template(),null,extras);
  assert.deepEqual(JSON.parse(get(html,'pixelforge-embedded-extras')),extras);
  assert.equal(JSON.stringify(world),original);
  assert.throws(()=>buildOfflineHtml(world,template(),null,{...extras,world:'replacement'}),/unsupported/);
  assert.throws(()=>buildOfflineHtml(world,template(),null,{...extras,network:true}),/unsupported/);
});
