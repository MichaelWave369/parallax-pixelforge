// Rung 14: bounded, presentation-only metadata for offline HTML games.
// Never extends or authorizes playable-world scripts, assets or networking.
export const RELEASE_FORMAT='pixelforge.published-release.v1';
export const RELEASE_MAX_BYTES=2400;
export const RELEASE_TOKEN='__PIXELFORGE_RELEASE_JSON__';
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const titleString=(v,max,label)=>{
  if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u001f\u007f]/.test(v))
    throw Error(label+' must be a nonempty bounded string without control characters.');
  return v.trim();
};
export function defaultReleaseMetadata(worldTitle){
  const title=typeof worldTitle==='string'&&worldTitle.trim()
    ?worldTitle.trim().slice(0,100):'PixelForge Adventure';
  return {format:RELEASE_FORMAT,title,
    tagline:'A world worth exploring.',
    creator:'Independent PixelForge Creator',version:'1.0.0',
    accent:'#70ecdb'};
}
export function validateReleaseMetadata(raw){
  const fields=['format','title','tagline','creator','version','accent'];
  if(!plain(raw)||Object.keys(raw).length!==fields.length||
    fields.some(field=>!Object.hasOwn(raw,field)))
    throw Error('Release metadata contains missing or unsupported fields.');
  if(raw.format!==RELEASE_FORMAT)throw Error('Unsupported release metadata format.');
  const title=titleString(raw.title,100,'Release title');
  const tagline=titleString(raw.tagline,160,'Tagline');
  const creator=titleString(raw.creator,80,'Creator name');
  if(typeof raw.version!=='string'||!/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:-[a-z0-9-]{1,12})?$/.test(raw.version))
    throw Error('Release version must be a short semantic version (e.g. 1.0.0).');
  if(typeof raw.accent!=='string'||!/^#[0-9a-fA-F]{6}$/.test(raw.accent))
    throw Error('Release accent must be a six-digit hex color.');
  return {format:RELEASE_FORMAT,title,tagline,creator,
    version:raw.version,accent:raw.accent.toLowerCase()};
}
export function resolveReleaseMetadata(raw,worldTitle){
  return validateReleaseMetadata(raw??defaultReleaseMetadata(worldTitle));
}
export function escapeInertJson(value){
  return JSON.stringify(value).replace(/&/g,'\\u0026')
    .replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
    .replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
}
export function safeEmbeddedReleaseJson(raw,worldTitle){
  const release=resolveReleaseMetadata(raw,worldTitle);
  const serialized=escapeInertJson(release);
  if(new TextEncoder().encode(serialized).byteLength>RELEASE_MAX_BYTES)
    throw Error('Release metadata exceeds the 2.4 KB limit.');
  return serialized;
}
