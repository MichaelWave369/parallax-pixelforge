// Rung 13: embed validated playable-world DATA into a trusted,
 // build-produced single-HTML offline player. World strings never become code.
import {validatePlayableWorld,PLAYABLE_MAX_BYTES} from './playable-world.js';

export const OFFLINE_WORLD_TOKEN='__PIXELFORGE_WORLD_JSON__';
export const OFFLINE_TEMPLATE_MAX_BYTES=12_000_000;
export const OFFLINE_HTML_MAX_BYTES=12_200_000;
const bytes=text=>new TextEncoder().encode(text).byteLength;

export function safeEmbeddedWorldJson(world){
  const validated=validatePlayableWorld(world);
  const json=JSON.stringify(validated);
  if(bytes(json)>PLAYABLE_MAX_BYTES)
    throw Error('Playable world must be 160 KB or smaller before offline publishing.');
  // Break HTML's special tokens even when they appear in an item name or
  // message. JSON.parse restores their original values without ever executing.
  return json.replace(/&/g,'\\u0026').replace(/</g,'\\u003c')
    .replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028')
    .replace(/\u2029/g,'\\u2029');
}
export function buildOfflineHtml(world,template){
  if(typeof template!=='string'||!template.trim()||
    bytes(template)>OFFLINE_TEMPLATE_MAX_BYTES)
    throw Error('Offline player template is missing or over the 12 MB limit.');
  if(!template.includes('<script type="application/json" id="pixelforge-embedded-world">')||
      !template.includes('connect-src \'none\'')||
      !template.includes('script type="module"')||
      template.split(OFFLINE_WORLD_TOKEN).length!==2)
    throw Error('Offline player template lacks the expected entry, CSP or single world slot.');
  const packaged=template.replace(OFFLINE_WORLD_TOKEN,safeEmbeddedWorldJson(world));
  if(bytes(packaged)>OFFLINE_HTML_MAX_BYTES)
    throw Error('Published adventure exceeds the 12.2 MB HTML output limit.');
  return packaged;
}
export function offlineFilename(title){
  const slug=String(title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')
    .replace(/^-|-$/g,'').slice(0,55).replace(/-$/,'');
  return (slug||'pixelforge-world')+'-offline.html';
}
export async function downloadOfflineWorld(world){
  const validated=validatePlayableWorld(world);
  // Fetch only the build-owned template at the current PixelForge origin.
  // No CDN, user-supplied URL, plugin, remote compiler or privileged bridge.
  const root=new URL(import.meta.env?.BASE_URL||'./',window.location.origin);
  const resource=new URL('publisher-template.html',root);
  if(resource.origin!==window.location.origin)
    throw Error('Offline player template must come from this PixelForge origin.');
  const response=await fetch(resource.toString(),{credentials:'same-origin'});
  if(!response.ok)throw Error('Offline player template is not deployed (HTTP '+response.status+').');
  const length=Number(response.headers.get('content-length')||0);
  if(length>OFFLINE_TEMPLATE_MAX_BYTES)
    throw Error('Offline player template is larger than the publish limit.');
  const template=await response.text();
  const html=buildOfflineHtml(validated,template);
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  try{
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download=offlineFilename(validated.title);
    document.body.appendChild(anchor);anchor.click();anchor.remove();
  }finally{
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return {filename:offlineFilename(validated.title),bytes:blob.size};
}
