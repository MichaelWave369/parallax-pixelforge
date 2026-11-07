// Rung 15: bounded, inert extras for standalone cover artwork and creator notices.
// Extra identity data is separate from gameplay authority and Rung 14 metadata.
import {escapeInertJson} from './release-metadata.js';

export const EXTRAS_FORMAT='pixelforge.published-extras.v1';
export const EXTRAS_TOKEN='__PIXELFORGE_EXTRAS_JSON__';
export const COVER_MAX_BYTES=320_000;
export const EXTRAS_MAX_BYTES=450_000;
const TYPES=['image/png','image/jpeg','image/webp'];
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(value,expected,label)=>{
  if(!plain(value)||Object.keys(value).length!==expected.length||
    expected.some(k=>!Object.hasOwn(value,k)))
    throw Error(label+' contains missing or unsupported fields.');
};
function label(value,max,field,allowEmpty=false){
  if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f]/.test(value)||
      (!allowEmpty&&!value.trim()))
    throw Error(field+' must be a bounded plain-text value.');
  return value.trim();
}
function checkCover(raw){
  if(raw===null)return null;
  keys(raw,['dataUrl','alt'],'Cover');
  const alt=label(raw.alt,140,'Cover description');
  if(typeof raw.dataUrl!=='string'||raw.dataUrl.length>4*Math.ceil(COVER_MAX_BYTES/3)+120)
    throw Error('Cover must be a bounded PNG, JPEG or WebP data URL.');
  const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(raw.dataUrl);
  if(!match||!TYPES.includes(match[1]))
    throw Error('Cover must be PNG, JPEG or WebP. SVG, GIF, URLs and scripts are not accepted.');
  let binary;
  try{binary=atob(match[2]);}catch{throw Error('Cover image base64 is invalid.');}
  if(!binary.length||binary.length>COVER_MAX_BYTES)
    throw Error('Cover image must be 320 KB or smaller.');
  const ascii=(at,length)=>binary.slice(at,at+length);
  const mime=match[1];
  const valid=mime==='image/png'
    ?binary.startsWith('\x89PNG\r\n\x1a\n')
    :mime==='image/jpeg'
      ?binary.charCodeAt(0)===255&&binary.charCodeAt(1)===216&&binary.charCodeAt(2)===255
      :ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP';
  if(!valid)throw Error('Cover bytes do not match declared PNG, JPEG or WebP format.');
  // Canonical base64 is important: no concatenated text/hidden trailing bytes.
  if(btoa(binary)!==match[2])throw Error('Cover base64 must be canonical.');
  return {dataUrl:raw.dataUrl,alt};
}
export function defaultReleaseExtras(){
  return {format:EXTRAS_FORMAT,cover:null,credits:[],
    contentNotice:'Creator has not specified redistribution terms for original game content or cover artwork.'};
}
export function validateReleaseExtras(raw){
  keys(raw,['format','cover','credits','contentNotice'],'Release extras');
  if(raw.format!==EXTRAS_FORMAT)throw Error('Unsupported release extras version.');
  const cover=checkCover(raw.cover);
  if(!Array.isArray(raw.credits)||raw.credits.length>8)
    throw Error('Release credits are limited to eight entries.');
  const credits=raw.credits.map(item=>{
    keys(item,['role','name'],'Credit');
    return {role:label(item.role,38,'Credit role'),name:label(item.name,90,'Credit name')};
  });
  const contentNotice=label(raw.contentNotice,640,'Content license notice');
  const normalized={format:EXTRAS_FORMAT,cover,credits,contentNotice};
  if(new TextEncoder().encode(JSON.stringify(normalized)).length>EXTRAS_MAX_BYTES)
    throw Error('Release extras exceed the 450 KB limit.');
  return normalized;
}
export function resolveReleaseExtras(raw){
  return validateReleaseExtras(raw??defaultReleaseExtras());
}
export function safeEmbeddedExtrasJson(raw){
  return escapeInertJson(resolveReleaseExtras(raw));
}
export function validateCoverFile(file){
  if(!file||!TYPES.includes(file.type))throw Error('Choose a PNG, JPEG or WebP image.');
  if(!Number.isSafeInteger(file.size)||file.size<=0||file.size>COVER_MAX_BYTES)
    throw Error('Cover image file must be at most 320 KB.');
  return file;
}
