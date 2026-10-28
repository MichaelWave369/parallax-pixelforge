// PixelForge Godot 4 project pack: private, operator-selected GLB bytes only.
// No network, plugin execution, game scripts or rights authorization.
import {validateWorld} from './world.js';
import {exportSceneForEngine} from './engine-export.js';
import {decodeGlbMesh} from './glb-mesh.js';

export const MAX_GODOT_PACK_BYTES = 80_000_000;
const encoder=new TextEncoder();
const asBytes=value=>value instanceof ArrayBuffer?new Uint8Array(value):
  value instanceof Uint8Array?value:null;
const hex=buffer=>Array.from(new Uint8Array(buffer),x=>x.toString(16).padStart(2,'0')).join('');
const TABLE=Uint32Array.from({length:256},(_,n)=>{
  for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;
  return n>>>0;
});
function crc32(bytes) {
  let n=0xffffffff;for(const b of bytes)n=TABLE[(n^b)&255]^(n>>>8);
  return (n^0xffffffff)>>>0;
}
const u16=(v,n,p)=>v.setUint16(p,n,true);
const u32=(v,n,p)=>v.setUint32(p,n,true);
export function zipStore(entries){
  if(!Array.isArray(entries)||entries.length<1||entries.length>32)throw Error('Invalid archive count.');
  const names=new Set(),local=[],central=[];
  let offset=0,total=22;
  for(const entry of entries){
    const path=entry?.path,bytes=asBytes(entry?.bytes);
    if(typeof path!=='string'||!(/^[a-zA-Z0-9._/-]{1,160}$/.test(path))||
      path.startsWith('/')||path.split('/').some(part=>!part||part==='..')||
      !bytes||names.has(path))throw Error('Invalid archive entry.');
    names.add(path);
    const name=encoder.encode(path),checksum=crc32(bytes);
    if(bytes.length>MAX_GODOT_PACK_BYTES)throw Error('Archive entry exceeds size cap.');
    const header=new Uint8Array(30+name.length),h=new DataView(header.buffer);
    u32(h,0x04034b50,0);u16(h,20,4);u16(h,0x0800,6);
    u32(h,checksum,14);u32(h,bytes.length,18);u32(h,bytes.length,22);
    u16(h,name.length,26);header.set(name,30);
    const dir=new Uint8Array(46+name.length),d=new DataView(dir.buffer);
    u32(d,0x02014b50,0);u16(d,20,4);u16(d,20,6);u16(d,0x0800,8);
    u32(d,checksum,16);u32(d,bytes.length,20);u32(d,bytes.length,24);
    u16(d,name.length,28);u32(d,offset,42);dir.set(name,46);
    local.push(header,bytes);central.push(dir);
    offset+=header.length+bytes.length;total+=header.length+bytes.length+dir.length;
    if(total>MAX_GODOT_PACK_BYTES+100_000)throw Error('Export exceeds 80 MB cap.');
  }
  const centralSize=central.reduce((n,part)=>n+part.length,0);
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  u32(v,0x06054b50,0);u16(v,entries.length,8);u16(v,entries.length,10);
  u32(v,centralSize,12);u32(v,offset,16);
  const zip=new Uint8Array(total);let p=0;
  for(const part of [...local,...central,end]){zip.set(part,p);p+=part.length;}
  if(p!==total)throw Error('Unexpected ZIP size.');
  return zip;
}
export async function createGodotProjectPack(world,boundGlbs,subtle=globalThis.crypto?.subtle){
  validateWorld(world);
  if(!(boundGlbs instanceof Map)||!subtle||typeof subtle.digest!=='function')
    throw Error('Local verified assets and SHA-256 are required.');
  const objects=world.objects.filter(o=>o.kind==='asset-proxy');
  const unique=new Map();
  for(const obj of objects){
    const identity=obj.asset,bytes=asBytes(boundGlbs.get(identity.sha256));
    if(!bytes)throw Error('Asset '+identity.asset_id+' must be rebound using its exact local GLB first.');
    if(bytes.length!==identity.byte_length||bytes.length<28||bytes.length>50_000_000)
      throw Error('GLB file size does not match saved identity.');
    if(hex(await subtle.digest('SHA-256',bytes))!==identity.sha256)
      throw Error('GLB hash mismatch: '+identity.asset_id);
    decodeGlbMesh(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    if(!unique.has(identity.sha256))unique.set(identity.sha256,bytes);
  }
  if(unique.size>8)throw Error('Too many separate GLB files.');
  if([...unique.values()].reduce((s,b)=>s+b.length,0)>MAX_GODOT_PACK_BYTES)
    throw Error('Local assets exceed the 80 MB export budget.');
  const scene=exportSceneForEngine(world,'godot4',objects.length?{referenceAssets:true}:{});
  const assetRecords=[...unique].sort(([a],[b])=>a.localeCompare(b)).map(([hash,bytes])=>({
    path:'assets/'+hash+'.glb',sha256:hash,byte_length:bytes.length
  }));
  const manifest={
    schema:'pixelforge.godot-pack.v1',source_format:world.format,title:world.title,
    status:'STATIC_VISUAL_ONLY_GODOT_IMPORT_UNVERIFIED',
    rights:'USER_REVIEW_REQUIRED_NO_REDISTRIBUTION_GRANT',
    assets:assetRecords
  };
  const entries=[
    {path:'project.godot',bytes:encoder.encode('config_version=5\n\n[application]\nconfig/name="PixelForge Imported World"\n')},
    {path:'scene.tscn',bytes:encoder.encode(scene.content)},
    {path:'manifest.json',bytes:encoder.encode(JSON.stringify(manifest,null,2)+'\n')},
    ...assetRecords.map(asset=>({path:asset.path,bytes:unique.get(asset.sha256)}))
  ];
  const zip=zipStore(entries);
  return {filename:'pixelforge-godot4-project.zip',bytes:zip,
    report:{status:'LOCAL_ASSET_HASH_VERIFIED_GODOT_IMPORT_PENDING',
      objects:world.objects.length,uniqueGlbs:unique.size,zipBytes:zip.length}};
}
